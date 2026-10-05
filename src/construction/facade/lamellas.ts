import { m, PHYS, RENDER } from '../../physical/spec'
import { openingSill, wallTransform } from '../../scene/geometry'
import { woodUvTransform } from '../../scene/materials/textures'
import type { DecorPlacement, OpeningPlacement, PavilionConfig, ProjectGeometry, WallSide } from '../../types'
import type { Part, Vec3 } from '../types'

/**
 * LAMELE PIONOWE (P3): podział pola na lamele — jedna funkcja dla dotychczasowego rysunku (DecorLocal) i części modelu
 * w rendererze warstw. Lamela docinana wokół otworów (pionowe odcinki poza otworem); pola klinowe (wedge) skracają lamele.
 * Lamele ukośne, „wąż” i panele ornamentowe zostają w DecorLocal.
 */
export type Slat = { x: number; y0: number; y1: number; index: number }

const GALLERY03_LAMELLA = 'gallery03-lamella'
const GALLERY03_COLOR = '#826f66'

export const isVerticalLamella = (kind: string) => kind.startsWith('lamella-') && kind !== 'lamella-diagonal-winchester'

export function lamellaSlats(segment: DecorPlacement, openings: OpeningPlacement[], floorOffset: number): Slat[] {
  const step = m(PHYS.lamella.pitch)
  const slatWidth = m(PHYS.lamella.face)
  const x0 = segment.center - segment.width / 2
  const y0 = segment.yCenter - segment.height / 2
  const out: Slat[] = []
  const count = Math.floor((segment.width - slatWidth / 2) / step) + 1
  let index = 0
  for (let i = 0; i < count; i++) {
    const x = x0 + slatWidth / 2 + i * step
    const t = Math.max(0, Math.min(1, (x - x0) / Math.max(segment.width, 0.001)))
    const fraction = segment.shape === 'wedge-left' ? Math.max(0.04, 1 - t) : segment.shape === 'wedge-right' ? Math.max(0.04, t) : 1
    const top = y0 + segment.height * fraction
    const cuts = openings
      .filter((o) => Math.abs(x - o.center) < (slatWidth + o.width) / 2)
      .map((o) => [floorOffset + openingSill(o), floorOffset + openingSill(o) + o.height] as [number, number])
      .sort((p, q) => p[0] - q[0])
    let cursor = y0
    const spans: Array<[number, number]> = []
    for (const [c0, c1] of cuts) {
      if (c0 - cursor > 0.02) spans.push([cursor, Math.min(c0, top)])
      cursor = Math.max(cursor, c1)
    }
    if (top - cursor > 0.02) spans.push([cursor, top])
    for (const [a, b] of spans) out.push({ x, y0: a, y1: b, index })
    if (spans.length) index++
  }
  return out
}

/** Kolor / dekor lameli: winchester — tekstura (kolor biały), pozostałe — kolor (paleta drewna na przemian dla palisandru). */
export function lamellaColor(kind: string, index: number) {
  if (kind === 'lamella-black') return '#1d2022'
  if (kind === 'lamella-graphite') return '#3d4448'
  if (kind === 'lamella-palisander') return ['#5a3a28', '#694630', '#4f3324', '#74503a'][index % 4]
  return 'wood-lamella-winchester'
}

/** Dno rowka między lamelami (podkład) — kolor lameli przyciemniony (RENDER.lamellaGrooveShade), winchester — tekstura. */
export function lamellaGrooveColor(kind: string) {
  const base = kind === 'lamella-black' ? '#1d2022' : kind === 'lamella-graphite' ? '#3d4448' : kind === 'lamella-palisander' ? '#5f3f2b' : null
  return base ? shade(base, RENDER.lamellaGrooveShade.value) : 'wood-lamella-groove'
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const c = (v: number) => Math.round(v * k).toString(16).padStart(2, '0')
  return '#' + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255)
}

/** UV lica elementu o lewym dolnym narożniku (s0, y0) — przesunięcie transformacji liczonej od narożnika. */
function uvAt(t: [number, number, number, number, number, number], s0: number, y0: number): [number, number, number, number, number, number] {
  const [a, b, c, d, e, f] = t
  return [a, b, c - a * s0 - b * y0, d, e, f - d * s0 - e * y0]
}

/**
 * Lamele pionowe wszystkich ścian → części modelu (warstwa decor): listwy (czoło 30 mm od płyty) i podkład z wycięciami
 * na otwory — ta sama poza co Wall + DecorLocal (oś ściany, grupa z prześwitem).
 */
export function lamellaParts(config: PavilionConfig, geometry: ProjectGeometry, floorOffset: number, wallDepth: number, skip: (d: DecorPlacement) => boolean): Part[] {
  const out: Part[] = []
  const slatWidth = m(PHYS.lamella.face)
  const slatDepth = m(PHYS.lamella.depth)
  for (const side of ['front', 'back', 'left', 'right'] as WallSide[]) {
    const t = wallTransform(side, config)
    const th = t.rotation[1]
    const u: Vec3 = [Math.cos(th), 0, -Math.sin(th)]
    const n: Vec3 = [Math.sin(th), 0, Math.cos(th)]
    const at = (s: number, y: number, d: number): Vec3 => [t.position[0] + u[0] * s + n[0] * d, y, t.position[2] + u[2] * s + n[2] * d]
    const explode: Vec3 = [n[0] * 1.4, 0.1, n[2] * 1.4]
    const openings = geometry.openings.filter((o) => o.wall === side)
    const z = wallDepth / 2
    for (const d of geometry.decor.filter((x) => x.wall === side && isVerticalLamella(x.kind) && !skip(x))) {
      const x0 = d.center - d.width / 2
      const y0 = d.yCenter - d.height / 2
      const x1 = x0 + d.width
      const y1 = y0 + d.height
      const base = (id: string, name: string, color: string, rect: [number, number, number, number], d0: number, d1: number, extra: Partial<Part['geometry']> = {}): Part => ({
        id, name, layer: 'decor', stage: 10, material: 'cassette', color, explode, confidence: 'LOW',
        geometry: { start: at(0, 0, d0), axis: n, u, v: [0, 1, 0], length: d1 - d0, section: [[rect[0], rect[1]], [rect[2], rect[1]], [rect[2], rect[3]], [rect[0], rect[3]]], ...extra },
      })
      // podkład (dno rowków) z wycięciami na otwory
      if (!d.shape || d.shape === 'rect') {
        const mrg = 0.003
        const holes = openings.map((o) => {
          const oy0 = floorOffset + openingSill(o)
          const hx0 = Math.max(x0 + mrg, o.center - o.width / 2)
          const hx1 = Math.min(x1 - mrg, o.center + o.width / 2)
          const hy0 = Math.max(y0 + mrg, oy0)
          const hy1 = Math.min(y1 - mrg, oy0 + o.height)
          return hx1 - hx0 < 0.02 || hy1 - hy0 < 0.02 ? null : [[hx0, hy0], [hx0, hy1], [hx1, hy1], [hx1, hy0]] as Array<[number, number]>
        }).filter((h): h is Array<[number, number]> => h !== null)
        // galeria-03: lamele w kolorze zmierzonym ze zdjęcia (bez nadruku drewna) — jak dotychczas
        const groove = d.id === GALLERY03_LAMELLA ? shade(GALLERY03_COLOR, RENDER.lamellaGrooveShade.value) : lamellaGrooveColor(d.kind)
        out.push(base('lamella-base-' + d.id, 'Podkład lameli', groove, [x0, y0, x1, y1], z, z + 0.002, {
          holes, ...(groove.startsWith('wood-') ? { uvTransform: uvAt(woodUvTransform('winchester', d.width, d.height), x0, y0) } : {}),
        }))
      }
      for (const s of lamellaSlats(d, openings, floorOffset)) {
        const color = d.id === GALLERY03_LAMELLA ? GALLERY03_COLOR : lamellaColor(d.kind, s.index)
        const len = s.y1 - s.y0
        const a = s.x - slatWidth / 2
        out.push(base('lamella-' + d.id + '-' + s.x.toFixed(3) + '-' + s.y0.toFixed(2), 'Lamela', color, [a, s.y0, a + slatWidth, s.y1], z, z + slatDepth,
          color.startsWith('wood-') ? { uvTransform: uvAt(woodUvTransform('winchester', slatWidth, len), a, s.y0) } : {}))
      }
    }
  }
  return out
}
