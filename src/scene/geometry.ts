import { PANEL_THICKNESS_M, type DecorPlacement, type OpeningPlacement, type PavilionConfig, type ProjectGeometry, type WallSide } from '../types'
import { Path, Shape } from 'three'

export function envelope(config: PavilionConfig) {
  const floorT = PANEL_THICKNESS_M[config.floorPanel]
  const roofT = PANEL_THICKNESS_M[config.roofPanel]
  const outerFront = floorT + config.frontHeight + roofT
  const outerBack = floorT + config.backHeight + roofT
  const slope = Math.atan2(outerFront - outerBack, config.width)
  const roofDepth = Math.hypot(config.width, outerFront - outerBack)
  return { floorT, roofT, outerFront, outerBack, slope, roofDepth }
}

export function wallTransform(side: WallSide, config: PavilionConfig): {
  span: number
  position: [number, number, number]
  rotation: [number, number, number]
} {
  if (side === 'front') return { span: config.length, position: [0, 0, config.width / 2], rotation: [0, 0, 0] }
  if (side === 'back') return { span: config.length, position: [0, 0, -config.width / 2], rotation: [0, Math.PI, 0] }
  if (side === 'left') return { span: config.width, position: [-config.length / 2, 0, 0], rotation: [0, -Math.PI / 2, 0] }
  return { span: config.width, position: [config.length / 2, 0, 0], rotation: [0, Math.PI / 2, 0] }
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


export function fallbackGeometry(config: PavilionConfig): ProjectGeometry {
  const openings: OpeningPlacement[] = []
  const itemWidths: number[] = []
  for (let i = 0; i < config.fixedGlazingCount; i++) itemWidths.push(config.fixedGlazingWidth)
  for (let i = 0; i < config.aluDoorCount; i++) itemWidths.push(config.aluDoorWidth)
  for (let i = 0; i < config.aluWindowCount; i++) itemWidths.push(config.aluWindowWidth)

  const total = itemWidths.reduce((a, b) => a + b, 0) + Math.max(0, itemWidths.length - 1) * 0.10
  let cursor = -Math.min(total, config.length - 0.45) / 2

  for (let i = 0; i < config.fixedGlazingCount; i++) {
    const center = cursor + config.fixedGlazingWidth / 2
    openings.push({
      id: 'fg' + i,
      wall: 'front',
      center,
      width: config.fixedGlazingWidth,
      height: config.fixedGlazingHeight,
      sill: 0.08,
      kind: 'fixed-glass',
      glazing: config.glazing,
      roller: config.rollers && i < config.rollerCount,
    })
    cursor += config.fixedGlazingWidth + 0.10
  }

  for (let i = 0; i < config.aluDoorCount; i++) {
    const center = cursor + config.aluDoorWidth / 2
    openings.push({
      id: 'ad' + i,
      wall: 'front',
      center,
      width: config.aluDoorWidth,
      height: config.aluDoorHeight,
      sill: 0,
      kind: 'door-glazed',
      glazing: config.glazing,
      roller: config.rollers && config.fixedGlazingCount + i < config.rollerCount,
    })
    cursor += config.aluDoorWidth + 0.10
  }

  for (let i = 0; i < config.aluWindowCount; i++) {
    const center = cursor + config.aluWindowWidth / 2
    openings.push({
      id: 'aw' + i,
      wall: 'front',
      center,
      width: config.aluWindowWidth,
      height: config.aluWindowHeight,
      sill: 0.08,
      kind: 'alu-window',
      glazing: config.glazing,
    })
    cursor += config.aluWindowWidth + 0.10
  }

  for (let i = 0; i < config.pvcWindowCount; i++) {
    openings.push({
      id: 'pvc' + i,
      wall: 'left',
      center: (i - (config.pvcWindowCount - 1) / 2) * 0.75,
      width: config.pvcWindowWidth,
      height: config.pvcWindowHeight,
      sill: 1.35,
      kind: 'pvc-window',
      glazing: config.glazing,
    })
  }

  const decor: DecorPlacement[] = []
  const enabledSides = (['front', 'back', 'left', 'right'] as WallSide[]).filter((side) => {
    return side === 'front' ? config.facadeFront :
      side === 'back' ? config.facadeBack :
      side === 'left' ? config.facadeLeft : config.facadeRight
  })
  const fullDecorKind: DecorPlacement['kind'] | null =
    config.facade === 'lamella-winchester' ? 'lamella-winchester' :
    config.facade === 'lamella-black' ? 'lamella-black' :
    config.facade === 'lamella-diagonal-winchester' ? 'lamella-diagonal-winchester' :
    config.facade === 'wood-horizontal' ? 'board-horizontal-winchester' :
    config.facade === 'ornament-panel' ? 'ornament-panel' : null

  if (fullDecorKind) {
    const { outerFront, outerBack } = envelope(config)
    for (const side of enabledSides) {
      const span = side === 'front' || side === 'back' ? config.length : config.width
      const h = side === 'front' ? outerFront : side === 'back' ? outerBack : (outerFront + outerBack) / 2
      decor.push({
        id: 'custom-full-' + side,
        wall: side,
        center: 0,
        width: span,
        yCenter: h / 2,
        height: h,
        kind: fullDecorKind,
        sourceAccuracy: 'drawing-estimate',
      })
    }
  } else if (config.facade === 'cassette-lamella' && config.facadeFront) {
    const fieldHeight = Math.min(2.40, envelope(config).outerFront - 0.18)
    const groupWidth = Math.min(total, config.length - 0.50)
    const sideSpace = Math.max(0.38, Math.min(1.10, (config.length - groupWidth) / 2 - 0.10))
    if (sideSpace > 0.20) {
      decor.push(
        { id:'custom-l', wall:'front', center:-config.length / 2 + sideSpace / 2 + 0.05, width:sideSpace, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'lamella-winchester', sourceAccuracy:'drawing-estimate' },
        { id:'custom-r', wall:'front', center:config.length / 2 - sideSpace / 2 - 0.05, width:sideSpace, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'lamella-winchester', sourceAccuracy:'drawing-estimate' },
      )
    }
  } else if (config.facade === 'silver-rectangle' && config.facadeFront) {
    const fieldHeight = Math.min(2.40, envelope(config).outerFront - 0.18)
    decor.push(
      { id:'custom-silver-l', wall:'front', center:-config.length / 2 + 0.50, width:0.82, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'silver-rect', sourceAccuracy:'drawing-estimate' },
      { id:'custom-silver-r', wall:'front', center:config.length / 2 - 0.50, width:0.82, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'silver-rect', sourceAccuracy:'drawing-estimate' },
    )
  }

  return { externalHeight: envelope(config).outerFront, foundationGap: 0.12, openings, decor }
}
