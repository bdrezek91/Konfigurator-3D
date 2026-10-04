import { GENERIC_ALU_52 as G } from '../../profiles/generic-aluminium-52'
import {
  aluminiumDoorFrame, aluminiumFrame, aluminiumSash, doorStop, doorStopSeal, GLASS_DEPTH, glazingBead, mullion, sealInner, sealOuter,
  threshold, toMeters, transom, type Poly, type Section,
} from '../../profiles/sections'
import type { OpeningHandle } from '../../types'
import type { MaterialKind, Part, Stage, Vec3 } from '../types'

/**
 * Stolarka z przekrojów (proof of concept — preset galeria-163). Hierarchia części:
 *   OPENING → OUTER FRAME (ościeżnica, uciosy) → SASH / FIXED GLAZING → MULLION / TRANSOM → GASKETS + BEADS → GLASS → THRESHOLD
 *   (+ okucia). Obróbki ościeży (TRIMS) buduje model ściany (`reveal-*`).
 * Wszystkie wymiary: `profiles/generic-aluminium-52.ts` (ASSUMPTION). Tu tylko geometria złożenia.
 */

/** Płaszczyzna ściany: punkt (s, y, d) = origin + u·s + up·y + out·d; d = 0 na licu zewnętrznym płyty, d > 0 na zewnątrz. */
export type WallPlane = { origin: Vec3; u: Vec3; up: Vec3; out: Vec3; stage: Stage; explode: Vec3 }

export type OpeningJoinerySpec = {
  id: string
  kind: 'fixed' | 'door'
  /** obrys otworu w płycie: s ∈ [a, b], y ∈ [y0, y1] (m, układ ściany) */
  a: number; b: number; y0: number; y1: number
  /** odsunięcie ramy od krawędzi otworu (np. blacha ościeża 0,8 mm) */
  inset: { l: number; r: number; t: number; b: number }
  color: string
  hinge?: 'left' | 'right'
  handle?: OpeningHandle
  /** podziały FIX: osie słupków (s) i ślemion (y), m */
  mullions?: number[]
  transoms?: number[]
}

type Rect = { s0: number; s1: number; y0: number; y1: number }
type Side = 'l' | 'r' | 't' | 'b'
const mm = (x: number) => x / 1000

const add = (v: Vec3, w: Vec3): Vec3 => [v[0] + w[0], v[1] + w[1], v[2] + w[2]]
const mul = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]

class Builder {
  parts: Part[] = []
  private readonly w: WallPlane
  private readonly spec: OpeningJoinerySpec
  constructor(w: WallPlane, spec: OpeningJoinerySpec) {
    this.w = w
    this.spec = spec
  }

  private at(s: number, y: number, d: number): Vec3 {
    return add(add(add(this.w.origin, mul(this.w.u, s)), mul(this.w.up, y)), mul(this.w.out, d))
  }

  private push(id: string, name: string, material: MaterialKind, color: string, geometry: Part['geometry']) {
    this.parts.push({
      id: 'joinery-' + this.spec.id + '-' + id, name: name + ' ' + this.spec.id, layer: 'joinery', stage: this.w.stage,
      material, color, explode: this.w.explode, confidence: 'LOW', geometry,
    })
  }

  private colorOf(sec: Section) {
    return sec.material === 'gasket' ? '#0c0d0e' : this.spec.color
  }

  /**
   * Pręt profilu wzdłuż boku prostokąta. `side` — który bok (u przekroju skierowane do środka prostokąta);
   * `uShift` [mm] przesuwa przekrój w u (przekroje „sightline” na linii widoczności pierścienia); `k` — uciosy końców.
   */
  member(id: string, sec: Section, r: Rect, side: Side, dBack: number, k: [number, number], uShift = 0) {
    const { u, up } = this.w
    const neg = (v: Vec3) => mul(v, -1)
    // bieg: dół/góra wzdłuż +s, boki wzdłuż +y; u przekroju do środka
    const run = side === 'b' ? { start: this.at(r.s0, r.y0, dBack), axis: u, across: up, len: r.s1 - r.s0 }
      : side === 't' ? { start: this.at(r.s0, r.y1, dBack), axis: u, across: neg(up), len: r.s1 - r.s0 }
        : side === 'l' ? { start: this.at(r.s0, r.y0, dBack), axis: up, across: u, len: r.y1 - r.y0 }
          : { start: this.at(r.s1, r.y0, dBack), axis: up, across: neg(u), len: r.y1 - r.y0 }
    this.push(id, sec.id, sec.material === 'gasket' ? 'gasket' : 'frame', this.colorOf(sec), {
      start: run.start, axis: run.axis, u: run.across, v: this.w.out, length: run.len, section: toMeters(sec.poly, uShift), mitre: k,
    })
  }

  /**
   * Pierścień profili wokół prostokąta z uciosami: ucios przez narożnik zewnętrzny i wewnętrzny (k = szer. sąsiada / własna),
   * czyli 45° przy równych szerokościach. Bok pominięty (`skip`) → sąsiednie pręty cięte prosto na tym końcu.
   */
  ring(id: string, r: Rect, secOf: (side: Side) => Section, faces: Record<Side, number>, dBack: number, opts: { skip?: Side; uShift?: number } = {}) {
    const k = (self: Side, other: Side) => (opts.skip === other ? 0 : faces[other] / faces[self])
    const sides: Side[] = ['b', 't', 'l', 'r']
    for (const side of sides) {
      if (side === opts.skip) continue
      const ends: [number, number] = side === 'b' || side === 't' ? [k(side, 'l'), k(side, 'r')] : [k(side, 'b'), k(side, 't')]
      this.member(id + '-' + side, secOf(side), r, side, dBack, ends, opts.uShift ?? 0)
    }
  }

  /** Pręt prosty w osi (słupek pionowy / ślemię poziome), końce cięte prosto, przekrój „axis”. */
  bar(id: string, sec: Section, along: 's' | 'y', at: number, from: number, to: number, dBack: number) {
    const { u, up } = this.w
    const start = along === 'y' ? this.at(at, from, dBack) : this.at(from, at, dBack)
    this.push(id, sec.id, 'frame', this.colorOf(sec), {
      start, axis: along === 'y' ? up : u, u: along === 'y' ? u : up, v: this.w.out, length: to - from, section: toMeters(sec.poly),
    })
  }

  /** Prostopadłościan w płaszczyźnie ściany (szyba, okucia): prostokąt (s, y) × głębokość d0..d1. */
  box(id: string, name: string, material: MaterialKind, color: string, r: Rect, d0: number, d1: number) {
    const poly: Poly = [[r.s0, r.y0], [r.s1, r.y0], [r.s1, r.y1], [r.s0, r.y1]]
    this.push(id, name, material, color, { start: this.at(0, 0, d0), axis: this.w.out, u: this.w.u, v: this.w.up, length: d1 - d0, section: poly })
  }

  /** Pole szklenia: listwy + uszczelki (pierścienie na linii widoczności) i pakiet szybowy w wrębie. */
  glazingField(id: string, sight: Rect, dProfileBack: number) {
    const eq = { l: 1, r: 1, t: 1, b: 1 }
    this.ring(id + '-bead', sight, glazingBead, eq, dProfileBack)
    this.ring(id + '-seal-in', sight, sealInner, eq, dProfileBack)
    this.ring(id + '-seal-out', sight, sealOuter, eq, dProfileBack)
    const bite = mm(G.glazing.bite)
    const glass = { s0: sight.s0 - bite, s1: sight.s1 + bite, y0: sight.y0 - bite, y1: sight.y1 + bite }
    const [g0, g1] = GLASS_DEPTH
    this.parts.push({
      id: 'glass-' + this.spec.id + '-' + id, name: 'Pakiet szybowy 4/16/4 ' + this.spec.id, layer: 'joinery', stage: this.w.stage,
      material: 'glass', color: '#5d6b74', explode: this.w.explode, confidence: 'MEDIUM',
      geometry: { start: this.at(0, 0, dProfileBack + mm(g0)), axis: this.w.out, u: this.w.u, v: this.w.up, length: mm(g1 - g0),
        section: [[glass.s0, glass.y0], [glass.s1, glass.y0], [glass.s1, glass.y1], [glass.s0, glass.y1]] },
    })
  }
}

const inset = (r: Rect, f: Record<Side, number>): Rect => ({ s0: r.s0 + f.l, s1: r.s1 - f.r, y0: r.y0 + f.b, y1: r.y1 - f.t })

/** Pola między słupkami / ślemionami (linie widoczności). */
function fields(sight: Rect, mullions: number[], transoms: number[]): Rect[] {
  const h = mm(G.mullion.face) / 2
  const xs = [sight.s0, ...mullions.flatMap((x) => [x - h, x + h]), sight.s1]
  const ys = [sight.y0, ...transoms.flatMap((y) => [y - h, y + h]), sight.y1]
  const out: Rect[] = []
  for (let i = 0; i < xs.length; i += 2) for (let j = 0; j < ys.length; j += 2) out.push({ s0: xs[i], s1: xs[i + 1], y0: ys[j], y1: ys[j + 1] })
  return out
}

export function buildOpeningJoinery(spec: OpeningJoinerySpec, wall: WallPlane): Part[] {
  const bld = new Builder(wall, spec)
  const outer: Rect = { s0: spec.a + spec.inset.l, s1: spec.b - spec.inset.r, y0: spec.y0 + spec.inset.b, y1: spec.y1 - spec.inset.t }
  const proud = mm(G.install.proud)

  if (spec.kind === 'fixed') {
    // OUTER FRAME: pierścień z uciosem 45°
    const sec = aluminiumFrame()
    const F = mm(G.frame.face)
    const dBack = proud - mm(G.frame.depth)
    bld.ring('frame', outer, () => sec, { l: 1, r: 1, t: 1, b: 1 }, dBack)
    const sight = inset(outer, { l: F, r: F, t: F, b: F })
    // MULLION / TRANSOM: pręty między liniami widoczności ościeżnicy, cięte prosto (łącznik słupka)
    const ms = spec.mullions ?? []
    const ts = spec.transoms ?? []
    for (const x of ms) bld.bar('mullion-' + x.toFixed(3), mullion(), 'y', x, sight.y0, sight.y1, dBack)
    const h = mm(G.mullion.face) / 2
    for (const y of ts) {
      // ślemię między słupkami (słupek przechodzi w całości)
      const xs = [sight.s0, ...ms.flatMap((x) => [x - h, x + h]), sight.s1]
      for (let i = 0; i < xs.length; i += 2) bld.bar('transom-' + y.toFixed(3) + '-' + i, transom(), 's', y, xs[i], xs[i + 1], dBack)
    }
    // FIXED GLAZING: każde pole = listwy + uszczelki + pakiet
    fields(sight, ms, ts).forEach((f, i) => bld.glazingField('fix-' + i, f, dBack))
    return bld.parts
  }

  // ---- DRZWI: ościeżnica (boki do posadzki, góra z uciosem), próg między bokami, przylga, skrzydło, okucia
  const Fd = mm(G.doorFrame.face)
  const dBack = proud - mm(G.doorFrame.depth)
  const frameSec = aluminiumDoorFrame()
  bld.ring('frame', outer, () => frameSec, { l: 1, r: 1, t: 1, b: 1 }, dBack, { skip: 'b' })
  const sight = inset(outer, { l: Fd, r: Fd, t: Fd, b: 0 })
  // THRESHOLD: między bokami ościeżnicy
  const th = threshold()
  const thH = mm(G.threshold.height)
  bld.member('threshold', th, { s0: sight.s0, s1: sight.s1, y0: outer.y0, y1: outer.y1 }, 'b', dBack, [0, 0])
  // przylga skrzydła + uszczelka przylgowa: pierścień na linii widoczności, boki od progu
  const stopRect: Rect = { ...sight, y0: outer.y0 + thH }
  bld.ring('stop', stopRect, doorStop, { l: 1, r: 1, t: 1, b: 1 }, dBack, { skip: 'b' })
  bld.ring('stop-seal', stopRect, doorStopSeal, { l: 1, r: 1, t: 1, b: 1 }, dBack, { skip: 'b' })
  // SASH: w świetle ościeżnicy ze szczeliną; tył skrzydła na uszczelce przylgi
  const gap = mm(G.sash.gap)
  const sashRect: Rect = { s0: sight.s0 + gap, s1: sight.s1 - gap, y0: outer.y0 + thH + mm(G.sash.bottomGap), y1: sight.y1 - gap }
  const sashFaces = { l: G.sash.face, r: G.sash.face, t: G.sash.headFace, b: G.sash.bottomFace }
  const sashBack = dBack + mm(G.doorFrame.stopDepth + 2)
  bld.ring('sash', sashRect, (side) => aluminiumSash(sashFaces[side]), sashFaces, sashBack)
  const sashSight = inset(sashRect, { l: mm(sashFaces.l), r: mm(sashFaces.r), t: mm(sashFaces.t), b: mm(sashFaces.b) })
  bld.glazingField('sash', sashSight, sashBack)

  // OKUCIA: zawiasy na szczelinie po stronie zawiasów, klamka z szyldem na ramie skrzydła po stronie zamka
  const hw = G.hardware
  const hingeLeft = (spec.hinge ?? 'left') === 'left'
  const sashFront = sashBack + mm(G.sash.depth)
  const frameFront = proud
  const sGap = hingeLeft ? sight.s0 + gap / 2 : sight.s1 - gap / 2
  for (const hy of hw.hinge.positions) {
    const yc = outer.y0 + hy
    bld.box('hinge-' + hy, 'Zawias', 'hardware', '#a3a9ac',
      { s0: sGap - mm(hw.hinge.width) / 2, s1: sGap + mm(hw.hinge.width) / 2, y0: yc - mm(hw.hinge.height) / 2, y1: yc + mm(hw.hinge.height) / 2 },
      frameFront, frameFront + mm(hw.hinge.depth))
  }
  if ((spec.handle ?? 'lever') === 'lever') {
    const H = hw.handle
    const sc = hingeLeft ? sashRect.s1 - mm(G.sash.face) / 2 : sashRect.s0 + mm(G.sash.face) / 2
    const yc = outer.y0 + mm(H.height)
    const dir = hingeLeft ? -1 : 1 // klamka w stronę zawiasów
    const steel = '#aeb3b5'
    const rw = mm(H.roseWidth) / 2
    bld.box('handle-rose', 'Szyld klamki', 'hardware', steel, { s0: sc - rw, s1: sc + rw, y0: yc - mm(H.roseHeight) * 0.7, y1: yc + mm(H.roseHeight) * 0.3 }, sashFront, sashFront + mm(H.roseDepth))
    const n = mm(H.leverSection) / 2
    bld.box('handle-neck', 'Klamka', 'hardware', steel, { s0: sc - n, s1: sc + n, y0: yc - n, y1: yc + n }, sashFront + mm(H.roseDepth), sashFront + mm(H.neck))
    const l0 = sc + dir * n
    const l1 = sc + dir * mm(H.lever)
    bld.box('handle-lever', 'Klamka', 'hardware', steel, { s0: Math.min(l0, l1), s1: Math.max(l0, l1), y0: yc - n, y1: yc + n }, sashFront + mm(H.neck) - 2 * n, sashFront + mm(H.neck))
    const cy = yc - mm(H.roseHeight) * 0.45
    bld.box('handle-cylinder', 'Wkładka', 'hardware', '#2a2d2f', { s0: sc - 0.007, s1: sc + 0.007, y0: cy - 0.015, y1: cy + 0.015 }, sashFront + mm(H.roseDepth), sashFront + mm(H.roseDepth) + 0.003)
  }
  return bld.parts
}
