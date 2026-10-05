import { BufferAttribute, ExtrudeGeometry, Matrix4, Path, Shape, Vector3 } from 'three'
import { geometryOf } from '../components'
import { facadeKindForWall } from '../scene/facade/facadeKind'
import type { PavilionConfig, WallSide } from '../types'
import type { FinishBySide } from './system1/build'
import type { FinishVariant, RunGeometry } from './types'

/** Baza elementu (u, v, oś) — zawsze prawoskrętna; `flip` = przekrój odbity w v. */
export function runBasis(g: RunGeometry) {
  const u = new Vector3(...g.u)
  let v = new Vector3(...g.v)
  const w = new Vector3(...g.axis)
  const flip = new Vector3().crossVectors(u, v).dot(w) < 0
  if (flip) v = v.clone().negate()
  return { matrix: new Matrix4().makeBasis(u, v, w).setPosition(...g.start), flip }
}

/** Bryła w układzie lokalnym przekroju (u, ±v, oś), z uciosem końców; przesunięcie przekroju (du, dv) — dla instancji. */
export function runLocalGeometry(g: RunGeometry, flip: boolean, du = 0, dv = 0) {
  const sv = (p: [number, number]) => (flip ? -p[1] : p[1]) - dv
  const shape = new Shape(g.section.map((p) => ({ x: p[0] - du, y: sv(p) }) as never))
  for (const hole of g.holes ?? []) shape.holes.push(new Path(hole.map((p) => ({ x: p[0] - du, y: sv(p) }) as never)))
  const geo = new ExtrudeGeometry(shape, { depth: g.length, bevelEnabled: false, steps: 1 })
  const [k0, k1] = g.mitre ?? [0, 0]
  if (k0 || k1) {
    // ucios: wierzchołki końca przesunięte wzdłuż osi o k · u (płaszczyzna — ściany boczne i denka pozostają płaskie)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) + du
      const z = pos.getZ(i)
      pos.setZ(i, z < g.length / 2 ? k0 * u : g.length - k1 * u)
    }
    geo.computeVertexNormals()
  }
  if (g.shade) {
    // v przekroju z lokalnego y (przed odbiciem bazy i przesunięciem instancji)
    const { v0, v1, min } = g.shade
    const pos = geo.attributes.position
    // RGBA (alfa = 1): three-gpu-pathtracer przy scalaniu geometrii gubi kolor o 3 składowych (kopiuje „wyrównanie do 4”
    // w złą stronę) — w HQ tace wychodziły czarne. Podgląd: alfa nieużywana przy materiale nieprzezroczystym.
    const col = new Float32Array(pos.count * 4)
    for (let i = 0; i < pos.count; i++) {
      const v = flip ? -(pos.getY(i) + dv) : pos.getY(i) + dv
      const t = Math.min(1, Math.max(0, (v - v0) / (v1 - v0)))
      const k = min + (1 - min) * t * t * (3 - 2 * t)
      col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = k
      col[i * 4 + 3] = 1
    }
    geo.setAttribute('color', new BufferAttribute(col, 4))
  }
  if (g.uvTransform) {
    const [a, b, c, d, e, f] = g.uvTransform
    const uv = geo.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      const x = uv.getX(i)
      const y = uv.getY(i)
      uv.setXY(i, a * x + b * y + c, d * x + e * y + f)
    }
  }
  return geo
}

/**
 * Długość cięcia elementu z uciosem (najdłuższa krawędź wzdłuż osi) — do BOM. Bez uciosu = `length`.
 * Koniec z uciosem k przesuwa krawędź o k · u: ujemne k wydłuża część o dodatnim u (obróbki — u na zewnątrz).
 */
export function runCutLength(g: RunGeometry) {
  const [k0, k1] = g.mitre ?? [0, 0]
  if (!k0 && !k1) return g.length
  return Math.max(...g.section.map(([u]) => g.length - (k0 + k1) * u))
}

/** Bryła elementu: przekrój (u, v) wyciągnięty wzdłuż osi; baza zawsze prawoskrętna. */
export function buildRunGeometry(g: RunGeometry) {
  const { matrix, flip } = runBasis(g)
  const geo = runLocalGeometry(g, flip)
  geo.applyMatrix4(matrix)
  return geo
}

/**
 * Wykończenie ściany wynika z elewacji (produkcja Dampol):
 * kasetony → obróbka płaska techniczna, deska / lamele / dekor pełnej ściany → „na kwadraty” 25 mm, goły PIR → „półtorówka” 15 mm.
 */
export function finishForConfig(config: PavilionConfig): FinishBySide {
  const geometry = geometryOf(config)
  const of = (side: WallSide): FinishVariant => {
    if (facadeKindForWall(side, config, geometry) !== 'none') return 'cassette'
    const span = side === 'front' || side === 'back' ? config.length : config.width
    const decorWidth = geometry.decor
      .filter((d) => d.wall === side && /lamella|board|snake|ornament|cassette-winchester/.test(d.kind))
      .reduce((sum, d) => sum + d.width, 0)
    return decorWidth > span * 0.5 ? 'squares' : 'bare'
  }
  return { front: of('front'), back: of('back'), left: of('left'), right: of('right') }
}

