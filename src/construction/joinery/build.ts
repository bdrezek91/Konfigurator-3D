import { GENERIC_ALU_52 as G } from '../../profiles/generic-aluminium-52'
import {
  aluminiumDoorFrame, aluminiumFrame, aluminiumFrameCoupled, aluminiumSash, doorStop, doorStopSeal, GLASS_DEPTH, glazingBead, mullion, sealInner, sealOuter,
  threshold, toMeters, transom, type Section,
} from '../../profiles/sections'
import { insetRect, ProfileAssembler, type Profile, type Rect, type Side, type WallPlane } from '../assembly'
import type { OpeningHandle, OpeningKind, OpeningPlacement, OpeningProfile } from '../../types'
import type { Part } from '../types'

/**
 * Stolarka z przekrojów (wszystkie rodzaje otworów konfiguratora, System 1). Hierarchia części:
 *   OPENING → OUTER FRAME (ościeżnica, uciosy) → SASH / FIXED GLAZING → MULLION / TRANSOM → GASKETS + BEADS → GLASS → THRESHOLD
 *   (+ okucia). Obróbki ościeży (TRIMS) buduje model ściany (`reveal-*`).
 * Wszystkie wymiary: `profiles/generic-aluminium-52.ts` (ASSUMPTION). Tu tylko geometria złożenia.
 */

export type { WallPlane } from '../assembly'

export type OpeningJoinerySpec = {
  id: string
  kind: 'fixed' | 'door' | 'door-full' | 'door-double' | 'window'
  /** system profili (ALU standard / slim / PVC) */
  profile?: OpeningProfile
  /** roleta zewnętrzna (skrzynka + prowadnice) */
  roller?: boolean
  /** obrys otworu w płycie: s ∈ [a, b], y ∈ [y0, y1] (m, układ ściany) */
  a: number; b: number; y0: number; y1: number
  /** odsunięcie ramy od krawędzi otworu (np. blacha ościeża 0,8 mm) */
  inset: { l: number; r: number; t: number; b: number }
  color: string
  hinge?: 'left' | 'right'
  handle?: OpeningHandle
  /** styk z sąsiednią ramą (lewa / prawa krawędź otworu): rama bez ościeża, lico ½ słupka — razem wspólny słupek */
  join?: { l?: boolean; r?: boolean }
  /** podziały FIX: osie słupków (s) i ślemion (y), m */
  mullions?: number[]
  transoms?: number[]
}

const mm = (x: number) => x / 1000

/**
 * Otwory składane z biblioteki przekrojów (generic-aluminium-52): wszystkie rodzaje stolarki konfiguratora — FIX, drzwi
 * przeszklone / pełne / dwuskrzydłowe, okna ALU i PVC, profile ALU standard / slim / PVC, z roletą lub bez.
 */
export function sectionJoinerySupports(o: OpeningPlacement): boolean {
  return o.kind in JOINERY_KIND
}

/** Rodzaj otworu → złożenie stolarki. */
export const JOINERY_KIND: Record<OpeningKind, OpeningJoinerySpec['kind']> = {
  'fixed-glass': 'fixed',
  'door-glazed': 'door',
  'door-full': 'door-full',
  'door-double': 'door-double',
  'alu-window': 'window',
  'pvc-window': 'window',
}

class Builder extends ProfileAssembler {
  private readonly spec: OpeningJoinerySpec
  constructor(w: WallPlane, spec: OpeningJoinerySpec) {
    super(w, (id, name, material, color, geometry) => ({
      id: 'joinery-' + spec.id + '-' + id, name: name + ' ' + spec.id, layer: 'joinery', stage: w.stage,
      material, color, explode: w.explode, confidence: 'LOW', geometry,
      // LOD: uszczelki, listwy i przylga — tylko z bliska
      // klamka zawsze (drzwi bez klamki wyglądają na błąd), zawiasy od normalnego kadru
      lod: material === 'gasket' || /^(glazingBead|doorStop)/.test(name) ? 2 : name === 'Zawias' ? 1 : 0,
    }))
    this.spec = spec
  }

  /** Przekrój z biblioteki [mm] → profil do złożenia [m]; `uShift` [mm] — przekroje „sightline” na linii widoczności. */
  private profile(sec: Section, uShift = 0): Profile {
    return { name: sec.id, poly: toMeters(sec.poly, uShift), material: sec.material === 'gasket' ? 'gasket' : 'frame', color: sec.material === 'gasket' ? '#0c0d0e' : this.spec.color }
  }

  sec(id: string, sec: Section, r: Rect, side: Side, dBack: number, k: [number, number]) {
    this.member(id, this.profile(sec), r, side, dBack, k)
  }

  secRing(id: string, r: Rect, secOf: (side: Side) => Section, faces: Record<Side, number>, dBack: number, opts: { skip?: Side } = {}) {
    this.ring(id, r, (side) => this.profile(secOf(side)), faces, dBack, opts)
  }

  secBar(id: string, sec: Section, along: 's' | 'y', at: number, from: number, to: number, dBack: number) {
    this.bar(id, this.profile(sec), along, at, from, to, dBack)
  }

/** Pole szklenia: listwy + uszczelki (pierścienie na linii widoczności) i pakiet szybowy w wrębie. */
  glazingField(id: string, sight: Rect, dProfileBack: number) {
    const eq = { l: 1, r: 1, t: 1, b: 1 }
    this.secRing(id + '-bead', sight, glazingBead, eq, dProfileBack)
    this.secRing(id + '-seal-in', sight, sealInner, eq, dProfileBack)
    this.secRing(id + '-seal-out', sight, sealOuter, eq, dProfileBack)
    const bite = mm(G.glazing.bite)
    const glass = { s0: sight.s0 - bite, s1: sight.s1 + bite, y0: sight.y0 - bite, y1: sight.y1 + bite }
    const [g0, g1] = GLASS_DEPTH
    this.parts.push({
      id: 'glass-' + this.spec.id + '-' + id, name: 'Pakiet szybowy 4/16/4 ' + this.spec.id, layer: 'joinery', stage: this.plane.stage,
      material: 'glass', color: '#5d6b74', explode: this.plane.explode, confidence: 'MEDIUM',
      geometry: { start: this.at(0, 0, dProfileBack + mm(g0)), axis: this.plane.out, u: this.plane.u, v: this.plane.up, length: mm(g1 - g0),
        section: [[glass.s0, glass.y0], [glass.s1, glass.y0], [glass.s1, glass.y1], [glass.s0, glass.y1]] },
    })
  }
}

const inset = insetRect

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
  const joined = (side: Side) => (side === 'l' || side === 'r') && !!spec.join?.[side]
  // system profili: skala lic i głębokość (ALU standard — wymiary biblioteki bez zmian)
  const sys = G.systems[spec.profile ?? 'alu-standard']
  const sc = (x: number) => Math.round(x * sys.scale)
  const std = sys.scale === 1 && sys.depth === G.frame.depth

  if (spec.roller) addRoller(bld, outer, proud)

  if (spec.kind === 'fixed') {
    // OUTER FRAME: pierścień z uciosem (kąt z proporcji lic — 45° przy równych, inny przy styku ½ słupka)
    const sec = std ? aluminiumFrame() : aluminiumFrame(sc(G.frame.face), sys.depth)
    const coupled = aluminiumFrameCoupled()
    const faceMm = (side: Side) => (joined(side) ? G.coupling.face : sc(G.frame.face))
    const faces = { l: faceMm('l'), r: faceMm('r'), t: faceMm('t'), b: faceMm('b') }
    const dBack = proud - mm(sys.depth)
    bld.secRing('frame', outer, (side) => (joined(side) ? coupled : sec), faces, dBack)
    const sight = inset(outer, { l: mm(faces.l), r: mm(faces.r), t: mm(faces.t), b: mm(faces.b) })
    // MULLION / TRANSOM: pręty między liniami widoczności ościeżnicy, cięte prosto (łącznik słupka)
    const ms = spec.mullions ?? []
    const ts = spec.transoms ?? []
    for (const x of ms) bld.secBar('mullion-' + x.toFixed(3), mullion(), 'y', x, sight.y0, sight.y1, dBack)
    const h = mm(G.mullion.face) / 2
    for (const y of ts) {
      // ślemię między słupkami (słupek przechodzi w całości)
      const xs = [sight.s0, ...ms.flatMap((x) => [x - h, x + h]), sight.s1]
      for (let i = 0; i < xs.length; i += 2) bld.secBar('transom-' + y.toFixed(3) + '-' + i, transom(), 's', y, xs[i], xs[i + 1], dBack)
    }
    // FIXED GLAZING: każde pole = listwy + uszczelki + pakiet
    fields(sight, ms, ts).forEach((f, i) => bld.glazingField('fix-' + i, f, dBack))
    return bld.parts
  }

  const isWindow = spec.kind === 'window'
  const hw = G.hardware
  const hingeLeft = (spec.hinge ?? 'left') === 'left'
  // ---- OŚCIEŻNICA bez wrębu na szybę (szybę trzyma skrzydło). Drzwi: boki do posadzki + próg; okno: pierścień na 4 boki
  const frameFace = sc(G.doorFrame.face)
  const dBack = proud - mm(sys.depth)
  const frameSec = std ? aluminiumDoorFrame() : aluminiumDoorFrame(false, frameFace, sys.depth)
  const coupledSec = aluminiumDoorFrame(true)
  const faceMm = (side: Side) => (joined(side) ? G.coupling.face : frameFace)
  const faces = { l: faceMm('l'), r: faceMm('r'), t: faceMm('t'), b: faceMm('b') }
  bld.secRing('frame', outer, (side) => (joined(side) ? coupledSec : frameSec), faces, dBack, isWindow ? {} : { skip: 'b' })
  const sight = inset(outer, { l: mm(faces.l), r: mm(faces.r), t: mm(faces.t), b: isWindow ? mm(faces.b) : 0 })
  const thH = isWindow ? 0 : mm(G.threshold.height)
  if (!isWindow) {
    // THRESHOLD: między bokami ościeżnicy
    bld.sec('threshold', threshold(sys.depth), { s0: sight.s0, s1: sight.s1, y0: outer.y0, y1: outer.y1 }, 'b', dBack, [0, 0])
  }
  // przylga skrzydła + uszczelka przylgowa: pierścień na linii widoczności (drzwi: boki od progu)
  const stopRect: Rect = { ...sight, y0: sight.y0 + thH }
  const stopOpts = isWindow ? {} : { skip: 'b' as Side }
  bld.secRing('stop', stopRect, doorStop, { l: 1, r: 1, t: 1, b: 1 }, dBack, stopOpts)
  bld.secRing('stop-seal', stopRect, doorStopSeal, { l: 1, r: 1, t: 1, b: 1 }, dBack, stopOpts)

  // ---- SKRZYDŁA: jedno (drzwi, okno) albo dwa (drzwi dwuskrzydłowe — słupek przymykowy z dwóch ram skrzydeł)
  const gap = mm(G.sash.gap)
  const sashDepth = std ? G.sash.depth : Math.round(G.sash.depth * sys.depth / G.frame.depth)
  const sashBack = dBack + mm(G.doorFrame.stopDepth + 2)
  const sashFront = sashBack + mm(sashDepth)
  const y0 = isWindow ? sight.y0 + gap : outer.y0 + thH + mm(G.sash.bottomGap)
  const y1 = sight.y1 - gap
  const side = sc(G.sash.face)
  const sashFaces = isWindow
    ? { l: side, r: side, t: side, b: side }
    : { l: side, r: side, t: sc(G.sash.headFace), b: sc(G.sash.bottomFace) }
  const double = spec.kind === 'door-double'
  const mid = (sight.s0 + sight.s1) / 2
  const leaves: Array<{ id: string; r: Rect; hinge: 'l' | 'r' }> = double
    ? [
      { id: 'sash-l', r: { s0: sight.s0 + gap, s1: mid - gap / 2, y0, y1 }, hinge: 'l' },
      { id: 'sash-r', r: { s0: mid + gap / 2, s1: sight.s1 - gap, y0, y1 }, hinge: 'r' },
    ]
    : [{ id: 'sash', r: { s0: sight.s0 + gap, s1: sight.s1 - gap, y0, y1 }, hinge: hingeLeft ? 'l' : 'r' }]
  for (const leaf of leaves) {
    bld.secRing(leaf.id, leaf.r, (sd) => aluminiumSash(sashFaces[sd], sashDepth), sashFaces, sashBack)
    const ls = inset(leaf.r, { l: mm(sashFaces.l), r: mm(sashFaces.r), t: mm(sashFaces.t), b: mm(sashFaces.b) })
    if (spec.kind === 'door-full') {
      // drzwi pełne: panel w świetle skrzydła (wypełnienie płycinowe), w kolorze ramy; ASSUMPTION — grubość jak pakiet szyby
      const bite = mm(G.glazing.bite)
      const [g0, g1] = GLASS_DEPTH
      bld.box(leaf.id + '-panel', 'Panel drzwi pełnych', 'frame', spec.color,
        { s0: ls.s0 - bite, s1: ls.s1 + bite, y0: ls.y0 - bite, y1: ls.y1 + bite }, sashBack + mm(g0), sashBack + mm(g1) + mm(4))
    } else {
      bld.glazingField(leaf.id === 'sash' ? 'sash' : leaf.id, ls, sashBack)
    }
    // zawiasy drzwi na szczelinie po stronie zawiasów (okno: zawiasy ukryte w okuciu — bez brył)
    if (!isWindow) {
      const sGap = leaf.hinge === 'l' ? sight.s0 + gap / 2 : sight.s1 - gap / 2
      for (const hy of hw.hinge.positions) {
        const yc = outer.y0 + hy
        bld.box((double ? leaf.id + '-' : '') + 'hinge-' + hy, 'Zawias', 'hardware', '#a3a9ac',
          { s0: sGap - mm(hw.hinge.width) / 2, s1: sGap + mm(hw.hinge.width) / 2, y0: yc - mm(hw.hinge.height) / 2, y1: yc + mm(hw.hinge.height) / 2 },
          proud, proud + mm(hw.hinge.depth))
      }
    }
  }

  // ---- KLAMKA na skrzydle czynnym (dwuskrzydłowe: prawe, gdy zawiasy „lewe” — czynne otwiera się od strony zamka)
  const active = double ? leaves[hingeLeft ? 1 : 0] : leaves[0]
  const lockRight = active.hinge === 'l'
  const lockS = lockRight ? active.r.s1 - mm(sashFaces.r) / 2 : active.r.s0 + mm(sashFaces.l) / 2
  // dwuskrzydłowe: klamka na słupku przymykowym skrzydła czynnego
  const handleS = double ? (lockRight ? active.r.s0 + mm(sashFaces.l) / 2 : active.r.s1 - mm(sashFaces.r) / 2) : lockS
  const towardHinge = double ? (lockRight ? 1 : -1) : lockRight ? -1 : 1
  if (isWindow) {
    addWindowHandle(bld, handleS, (y0 + y1) / 2, sashFront)
    return bld.parts
  }
  if (spec.handle === 'bar') {
    // pochwyt: pręt pionowy na dwóch wspornikach, na ramie skrzydła po stronie zamka
    const B = hw.bar
    const len = Math.min(mm(B.maxLength), (spec.y1 - spec.y0) * B.heightRatio)
    const yc = (spec.y0 + spec.y1) / 2 + mm(B.centerAbove)
    const steel = '#aeb3b5'
    const r = mm(B.section) / 2
    const d0 = sashFront + mm(B.standoffDepth) - r
    bld.box('handle-bar', 'Pochwyt', 'hardware', steel, { s0: handleS - r, s1: handleS + r, y0: yc - len / 2, y1: yc + len / 2 }, d0, d0 + 2 * r)
    const so = mm(B.standoff) / 2
    for (const k of [-1, 1]) {
      const ys = yc + k * (len / 2 - mm(B.standoffInset))
      bld.box('handle-standoff-' + (k < 0 ? 'b' : 't'), 'Pochwyt', 'hardware', steel, { s0: handleS - so, s1: handleS + so, y0: ys - so, y1: ys + so }, sashFront, d0)
    }
  }
  if ((spec.handle ?? 'lever') === 'lever') {
    const H = hw.handle
    const yc = outer.y0 + mm(H.height)
    const dir = towardHinge // klamka w stronę zawiasów
    const steel = '#aeb3b5'
    const rw = mm(H.roseWidth) / 2
    bld.box('handle-rose', 'Szyld klamki', 'hardware', steel, { s0: handleS - rw, s1: handleS + rw, y0: yc - mm(H.roseHeight) * 0.7, y1: yc + mm(H.roseHeight) * 0.3 }, sashFront, sashFront + mm(H.roseDepth))
    const n = mm(H.leverSection) / 2
    bld.box('handle-neck', 'Klamka', 'hardware', steel, { s0: handleS - n, s1: handleS + n, y0: yc - n, y1: yc + n }, sashFront + mm(H.roseDepth), sashFront + mm(H.neck))
    const l0 = handleS + dir * n
    const l1 = handleS + dir * mm(H.lever)
    bld.box('handle-lever', 'Klamka', 'hardware', steel, { s0: Math.min(l0, l1), s1: Math.max(l0, l1), y0: yc - n, y1: yc + n }, sashFront + mm(H.neck) - 2 * n, sashFront + mm(H.neck))
    const cy = yc - mm(H.roseHeight) * 0.45
    bld.box('handle-cylinder', 'Wkładka', 'hardware', '#2a2d2f', { s0: handleS - 0.007, s1: handleS + 0.007, y0: cy - 0.015, y1: cy + 0.015 }, sashFront + mm(H.roseDepth), sashFront + mm(H.roseDepth) + 0.003)
  }
  return bld.parts
}

/** Klamka okienna: szyld i klamka w dół (pozycja zamknięta), na ramie skrzydła po stronie zamka. */
function addWindowHandle(bld: Builder, s: number, yc: number, front: number) {
  const W = G.windowHandle
  const steel = '#d9dcde'
  const rw = mm(W.roseWidth) / 2
  bld.box('handle-rose', 'Szyld klamki okiennej', 'hardware', steel, { s0: s - rw, s1: s + rw, y0: yc - mm(W.roseHeight) / 2, y1: yc + mm(W.roseHeight) / 2 }, front, front + mm(W.roseDepth))
  const n = mm(W.leverSection) / 2
  bld.box('handle-lever', 'Klamka okienna', 'hardware', steel, { s0: s - n, s1: s + n, y0: yc - mm(W.lever), y1: yc + n }, front + mm(W.neck) - 2 * n, front + mm(W.neck))
}

/** Roleta zewnętrzna: skrzynka nad otworem (jak dotychczasowy render) i prowadnice przy krawędziach otworu. */
function addRoller(bld: Builder, outer: Rect, proud: number) {
  const R = G.roller
  const y0 = outer.y1 + mm(R.boxGap)
  bld.box('roller-box', 'Roleta — skrzynka', 'frame', R.color,
    { s0: outer.s0 - mm(R.boxOverhang), s1: outer.s1 + mm(R.boxOverhang), y0, y1: y0 + mm(R.boxHeight) }, mm(R.boxProud) - mm(R.boxDepth), mm(R.boxProud))
  for (const [k, s0] of [['l', outer.s0 - mm(R.guideWidth)], ['r', outer.s1]] as const) {
    bld.box('roller-guide-' + k, 'Roleta — prowadnica', 'frame', R.color, { s0, s1: s0 + mm(R.guideWidth), y0: outer.y0, y1: y0 }, proud - mm(2), mm(R.guideDepth))
  }
}
