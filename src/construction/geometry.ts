import { ExtrudeGeometry, Matrix4, Path, Shape, Vector3 } from 'three'
import { geometryOf } from '../components'
import { facadeKindForWall } from '../scene/facade/facadeKind'
import type { PavilionConfig, WallSide } from '../types'
import type { FinishBySide } from './system1/build'
import type { FinishVariant, RunGeometry } from './types'

/** Bryła elementu: przekrój (u, v) wyciągnięty wzdłuż osi; baza zawsze prawoskrętna. */
export function buildRunGeometry(g: RunGeometry) {
  const u = new Vector3(...g.u)
  let v = new Vector3(...g.v)
  const w = new Vector3(...g.axis)
  const flip = new Vector3().crossVectors(u, v).dot(w) < 0
  if (flip) v = v.clone().negate()
  const sv = (p: [number, number]) => (flip ? -p[1] : p[1])
  const shape = new Shape(g.section.map((p) => ({ x: p[0], y: sv(p) }) as never))
  for (const hole of g.holes ?? []) shape.holes.push(new Path(hole.map((p) => ({ x: p[0], y: sv(p) }) as never)))
  const geo = new ExtrudeGeometry(shape, { depth: g.length, bevelEnabled: false, steps: 1 })
  geo.applyMatrix4(new Matrix4().makeBasis(u, v, w).setPosition(...g.start))
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

