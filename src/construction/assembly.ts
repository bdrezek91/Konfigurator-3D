import type { Poly } from '../profiles/sections'
import type { MaterialKind, Part, RunGeometry, Stage, Vec3 } from './types'

/**
 * Składanie części z przekrojów w płaszczyźnie (ściana, kaseton): pręt wzdłuż boku prostokąta, pierścień z uciosem,
 * pręt prosty w osi, prostopadłościan. Wspólne dla stolarki (joinery/build.ts) i kasetonów (facade/tray.ts).
 */

/** Płaszczyzna: punkt (s, y, d) = origin + u·s + up·y + out·d; d > 0 — na zewnątrz. */
export type WallPlane = { origin: Vec3; u: Vec3; up: Vec3; out: Vec3; stage: Stage; explode: Vec3 }
export type Rect = { s0: number; s1: number; y0: number; y1: number }
export type Side = 'l' | 'r' | 't' | 'b'
/** Przekrój gotowy do złożenia: wielokąt [m] w układzie (u w stronę środka prostokąta, v = out), materiał, kolor. */
export type Profile = { name: string; poly: Poly; material: MaterialKind; color: string }
/** Dodatkowe atrybuty geometrii części (cień w zagłębieniu, UV) — przekazywane do RunGeometry. */
export type GeometryExtras = Pick<RunGeometry, 'shade' | 'uvTransform'>

const add = (v: Vec3, w: Vec3): Vec3 => [v[0] + w[0], v[1] + w[1], v[2] + w[2]]
const mul = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]

export class ProfileAssembler {
  readonly parts: Part[] = []
  protected readonly plane: WallPlane
  private readonly emit: (id: string, name: string, material: MaterialKind, color: string, geometry: RunGeometry) => Part
  constructor(plane: WallPlane, emit: (id: string, name: string, material: MaterialKind, color: string, geometry: RunGeometry) => Part) {
    this.plane = plane
    this.emit = emit
  }

  at(s: number, y: number, d: number): Vec3 {
    const { origin, u, up, out } = this.plane
    return add(add(add(origin, mul(u, s)), mul(up, y)), mul(out, d))
  }

  protected push(id: string, name: string, material: MaterialKind, color: string, geometry: RunGeometry) {
    this.parts.push(this.emit(id, name, material, color, geometry))
  }

  /** Pręt profilu wzdłuż boku prostokąta (u przekroju do środka prostokąta), uciosy końców `k`. */
  member(id: string, p: Profile, r: Rect, side: Side, dBack: number, k: [number, number], extras: GeometryExtras = {}) {
    const { u, up, out } = this.plane
    const neg = (v: Vec3) => mul(v, -1)
    // bieg: dół/góra wzdłuż +s, boki wzdłuż +y
    const run = side === 'b' ? { start: this.at(r.s0, r.y0, dBack), axis: u, across: up, len: r.s1 - r.s0 }
      : side === 't' ? { start: this.at(r.s0, r.y1, dBack), axis: u, across: neg(up), len: r.s1 - r.s0 }
        : side === 'l' ? { start: this.at(r.s0, r.y0, dBack), axis: up, across: u, len: r.y1 - r.y0 }
          : { start: this.at(r.s1, r.y0, dBack), axis: up, across: neg(u), len: r.y1 - r.y0 }
    this.push(id, p.name, p.material, p.color, {
      start: run.start, axis: run.axis, u: run.across, v: out, length: run.len, section: p.poly, mitre: k, ...extras,
    })
  }

  /**
   * Pierścień profili wokół prostokąta z uciosami: cięcie przez narożnik zewnętrzny i wewnętrzny (k = szer. sąsiada / własna),
   * czyli 45° przy równych szerokościach. Bok pominięty (`skip`) → sąsiednie pręty cięte prosto na tym końcu.
   */
  ring(id: string, r: Rect, profileOf: (side: Side) => Profile, faces: Record<Side, number>, dBack: number,
    opts: { skip?: Side; extras?: (side: Side) => GeometryExtras } = {}) {
    const k = (self: Side, other: Side) => (opts.skip === other ? 0 : faces[other] / faces[self])
    for (const side of ['b', 't', 'l', 'r'] as Side[]) {
      if (side === opts.skip) continue
      const ends: [number, number] = side === 'b' || side === 't' ? [k(side, 'l'), k(side, 'r')] : [k(side, 'b'), k(side, 't')]
      this.member(id + '-' + side, profileOf(side), r, side, dBack, ends, opts.extras?.(side))
    }
  }

  /** Pręt prosty w osi (słupek pionowy / ślemię poziome), końce cięte prosto. */
  bar(id: string, p: Profile, along: 's' | 'y', at: number, from: number, to: number, dBack: number) {
    const { u, up, out } = this.plane
    const start = along === 'y' ? this.at(at, from, dBack) : this.at(from, at, dBack)
    this.push(id, p.name, p.material, p.color, { start, axis: along === 'y' ? up : u, u: along === 'y' ? u : up, v: out, length: to - from, section: p.poly })
  }

  /** Prostopadłościan w płaszczyźnie: prostokąt (s, y) × głębokość d0..d1 (szyba, okucia, lico kasetonu). */
  box(id: string, name: string, material: MaterialKind, color: string, r: Rect, d0: number, d1: number, extras: GeometryExtras = {}) {
    const poly: Poly = [[r.s0, r.y0], [r.s1, r.y0], [r.s1, r.y1], [r.s0, r.y1]]
    this.push(id, name, material, color, { start: this.at(0, 0, d0), axis: this.plane.out, u: this.plane.u, v: this.plane.up, length: d1 - d0, section: poly, ...extras })
  }
}

export const insetRect = (r: Rect, f: Record<Side, number>): Rect => ({ s0: r.s0 + f.l, s1: r.s1 - f.r, y0: r.y0 + f.b, y1: r.y1 - f.t })
