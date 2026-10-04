import { fallbackGeometry as componentFallbackGeometry } from '../components'
import { PANEL_THICKNESS_M, type OpeningPlacement, type PavilionConfig, type ProjectGeometry, type WallSide } from '../types'
import { Path, Shape } from 'three'
import { frameDims } from '../construction/frame'

export function envelope(config: PavilionConfig) {
  const fr = frameDims(config)
  // floorT = poziom wierzchu podłogi nad spodem ramy (System 1: kątownik + płyta), roofT = grubość płyty dachowej
  const floorT = fr.t + PANEL_THICKNESS_M[config.floorPanel]
  const roofT = PANEL_THICKNESS_M[config.roofPanel]
  const outerFront = floorT + config.frontHeight + roofT + fr.roofRib + fr.topFrame
  const outerBack = floorT + config.backHeight + roofT + fr.roofRib + fr.topFrame
  const slope = Math.atan2(outerFront - outerBack, config.width)
  const roofDepth = Math.hypot(config.width, outerFront - outerBack)
  return { floorT, roofT, outerFront, outerBack, slope, roofDepth }
}

export function wallTransform(side: WallSide, config: PavilionConfig): {
  span: number
  position: [number, number, number]
  rotation: [number, number, number]
} {
  // oś ściany: System 1 — za obrysem ramy o grubość kątownika + pół grubości płyty (frameDims)
  const i = frameDims(config).wallCenterInset
  if (side === 'front') return { span: config.length, position: [0, 0, config.width / 2 - i], rotation: [0, 0, 0] }
  if (side === 'back') return { span: config.length, position: [0, 0, -config.width / 2 + i], rotation: [0, Math.PI, 0] }
  if (side === 'left') return { span: config.width, position: [-config.length / 2 + i, 0, 0], rotation: [0, -Math.PI / 2, 0] }
  return { span: config.width, position: [config.length / 2 - i, 0, 0], rotation: [0, Math.PI / 2, 0] }
}

export function wallTopHeights(side: WallSide, config: PavilionConfig): [number, number] {
  const { outerFront, outerBack } = envelope(config)
  if (side === 'front') return [outerFront, outerFront]
  if (side === 'back') return [outerBack, outerBack]
  if (side === 'left') return [outerBack, outerFront]
  return [outerFront, outerBack]
}

export function wallTopAt(side: WallSide, localX: number, span: number, config: PavilionConfig) {
  const [left, right] = wallTopHeights(side, config)
  const t = Math.max(0, Math.min(1, (localX + span / 2) / Math.max(span, 0.001)))
  return left + (right - left) * t
}

export function openingSill(opening: OpeningPlacement) {
  if (opening.sill != null) return opening.sill
  return opening.kind.startsWith('door-') ? 0 : 0.08
}


export function makeWallShape(
  side: WallSide,
  config: PavilionConfig,
  span: number,
  openings: OpeningPlacement[],
) {
  const { floorT } = envelope(config)
  const [topLeft, topRight] = wallTopHeights(side, config)
  const shape = new Shape()
  shape.moveTo(-span / 2, 0)
  shape.lineTo(span / 2, 0)
  shape.lineTo(span / 2, topRight)
  shape.lineTo(-span / 2, topLeft)
  shape.closePath()

  // Sąsiadujące drzwi/FIX-y łączymy w jeden otwór. Dwie stykające się dziury
  // potrafią zostawić artefakt triangulacji — fragment ściany widoczny na szybie.
  const rects = openings
    .map((opening) => {
      const y1 = Math.max(0.002, floorT + openingSill(opening))
      return {
        x1: Math.max(-span / 2 + 0.002, opening.center - opening.width / 2),
        x2: Math.min(span / 2 - 0.002, opening.center + opening.width / 2),
        y1,
        y2: y1 + opening.height,
      }
    })
    .filter((r) => r.x2 > r.x1 && r.y2 > r.y1)
    .sort((a, b) => a.x1 - b.x1)

  const merged: typeof rects = []
  for (const r of rects) {
    const last = merged[merged.length - 1]
    if (last && r.x1 <= last.x2 + 0.03 && r.y1 < last.y2 && r.y2 > last.y1) {
      last.x2 = Math.max(last.x2, r.x2)
      last.y1 = Math.min(last.y1, r.y1)
      last.y2 = Math.max(last.y2, r.y2)
    } else {
      merged.push({ ...r })
    }
  }

  for (const r of merged) {
    const hole = new Path()
    hole.moveTo(r.x1, r.y1)
    hole.lineTo(r.x1, r.y2)
    hole.lineTo(r.x2, r.y2)
    hole.lineTo(r.x2, r.y1)
    hole.closePath()
    shape.holes.push(hole)
  }
  return shape
}

export function overlapsOpening(
  x: number,
  y: number,
  w: number,
  h: number,
  openings: OpeningPlacement[],
  floorOffset: number,
) {
  return openings.some((o) => {
    const sill = floorOffset + openingSill(o)
    return Math.abs(x - o.center) < (w + o.width) / 2 && Math.abs(y - (sill + o.height / 2)) < (h + o.height) / 2
  })
}


/** Wspólna z BOM geometria dla konfiguracji własnej (components.ts). */
export function fallbackGeometry(config: PavilionConfig): ProjectGeometry {
  return componentFallbackGeometry(config)
}
