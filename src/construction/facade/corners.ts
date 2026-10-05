import { frameDims } from '../frame'
import { m, PHYS } from '../../physical/spec'
import { envelope } from '../../scene/geometry'
import { PANEL_THICKNESS_M, type PavilionConfig, type WallSide } from '../../types'
import type { Part, Vec3 } from '../types'

/**
 * Wnęka narożnika elewacji kasetonowej (kasetony poziome na obu ścianach rogu): dwie blachy w kolorze fugi zakrywają czoło
 * płyty przód/tył i słup za fugami kasetonów. Te same wymiary co dotychczasowe `Box` w FacadeCladdingFromModel (jedna funkcja
 * dla obu ścieżek). Obie blachy kończą się 3 mm za licem kasetonów (wystająca krawędź dawała podwójną linię na narożniku).
 */
export type CornerSheet = { id: string; center: Vec3; size: Vec3 }

export const CORNER_PAIRS = [['front', 'left', -1, 1], ['front', 'right', 1, 1], ['back', 'left', -1, -1], ['back', 'right', 1, -1]] as const

export function cornerCavitySheets(config: PavilionConfig, isCassetteH: (side: WallSide) => boolean): CornerSheet[] {
  const fi = frameDims(config).wallFaceInset
  const th = m(PHYS.cassette.thickness)
  const h = envelope(config).outerFront
  const tw = PANEL_THICKNESS_M[config.wallPanel]
  const out: CornerSheet[] = []
  for (const [a, b, sx, sz] of CORNER_PAIRS) {
    if (!isCassetteH(a) || !isCassetteH(b)) continue
    // przed licem słupa narożnego (obrys ramy) — słup nie prześwituje w fugach na rogu
    const xPlane = sx * (config.length / 2 + 0.0008)
    const zPlane = sz * (config.width / 2 + 0.0008)
    const reach = th - fi - 0.003
    const sideLen = fi + tw + 0.02 + reach
    const frontLen = 0.06 + reach
    out.push(
      { id: 'cavity-s-' + a + b, center: [xPlane, h / 2, sz * (config.width / 2 + reach - sideLen / 2)], size: [0.0015, h, sideLen] },
      { id: 'cavity-f-' + a + b, center: [sx * (config.length / 2 + reach - frontLen / 2), h / 2, zPlane], size: [frontLen, h, 0.0015] },
    )
  }
  return out
}

/** Kolor blachy wnęki: kolor elewacji × 0,3 (jak fuga). */
export const CAVITY_SHADE = 0.3

/** Prostopadłościan osiowy (środek, wymiary) → część modelu. */
export function boxPart(base: Omit<Part, 'geometry'>, center: Vec3, size: Vec3): Part {
  const [cx, cy, cz] = center
  const [sx, sy, sz] = size
  return { ...base, geometry: { start: [cx - sx / 2, cy - sy / 2, cz - sz / 2], axis: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], length: sy, section: [[0, 0], [sx, 0], [sx, sz], [0, sz]] } }
}
