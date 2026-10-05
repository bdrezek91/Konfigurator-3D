import { geometryOf } from '../../components'
import { frameDims } from '../frame'
import { m, PHYS, RAL_7016_HEX, RAL_9010_HEX, RENDER, type Confidence } from '../../physical/spec'
import { ROOF_TRAPEZOIDS } from '../../scene/materials/profiles'
import { PANEL_THICKNESS_M, type OpeningPlacement, type PavilionConfig, type WallSide } from '../../types'
import { angle as angleSection, thickenPath as thicken } from '../../profiles/sections'
import { buildOpeningJoinery, type WallPlane } from '../joinery/build'
import { arch } from '../../render/architecture'
import type { ConstructionModel, DerivedDimension, FinishVariant, Layer, MaterialKind, Part, Stage, Vec3 } from '../types'

/**
 * SYSTEM 1 — konstrukcja z kątownika równoramiennego 50×50×4 mm.
 *
 * Kolejność budowy = kolejność produkcji (PRODUKCJA → GEOMETRIA → WYMIAR ZEWNĘTRZNY):
 *  1. dolna rama z kątownika po obrysie, piętka na zewnętrznym obrysie, ramiona do środka
 *     (ramię poziome = podparcie podłogi, ramię pionowe = krawędź ramy),
 *  2. pionowe kątowniki w narożach (piętka w narożu, ramiona w płaszczyznach ścian),
 *  3. płyty podłogowe PIR wewnątrz ramy, oparte na ramieniu poziomym, mocowane od góry wkrętem 120–125 mm,
 *  4–6. ściany na podłodze: tylna i przednia między słupami (przykręcone do słupów), boczne pomiędzy nimi,
 *  7. dach na ścianach, 8. górna rama (kątownik na płycie dachowej, zespawany ze słupami), 9. obróbki, 10. elewacja.
 *
 * Układ: x — długość (+ w prawo), y — w górę od gruntu, z — szerokość (+ front).
 * Zewnętrzny obrys ramy = config.length × config.width (np. 6,03 × 2,96 dla pawilonu „6 × 3”).
 */

const SHEET = 0.0006
const FLASH_T = RENDER.flashingSheetRenderMm.value / 1000

type Ctx = { parts: Part[] }

const add = (v: Vec3, w: Vec3): Vec3 => [v[0] + w[0], v[1] + w[1], v[2] + w[2]]
const mul = (v: Vec3, k: number): Vec3 => [v[0] * k, v[1] * k, v[2] * k]
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(...v) || 1
  return [v[0] / l, v[1] / l, v[2] / l]
}

function push(ctx: Ctx, p: Omit<Part, 'confidence'> & { confidence?: Confidence }) {
  ctx.parts.push({ confidence: 'HIGH', ...p })
}

const rect = (u0: number, v0: number, u1: number, v1: number): Array<[number, number]> => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]


function angle(ctx: Ctx, id: string, name: string, stage: Stage, layer: Layer, heel: Vec3, axis: Vec3, legA: Vec3, legB: Vec3, length: number, explode: Vec3) {
  const a = m(PHYS.system1.angleLeg)
  const t = m(PHYS.system1.angleThickness)
  push(ctx, {
    id, name, layer, stage, material: 'steel', color: '#6f767c', explode,
    geometry: { start: heel, axis, u: legA, v: legB, length, section: angleSection(a, t).poly },
  })
}

/**
 * Płyta warstwowa jako 3 warstwy (blacha zewn. / rdzeń PIR / blacha wewn.) wyciągnięte wzdłuż grubości.
 * Kontur płyty (z otworami) leży w płaszczyźnie (u, v); `axis` = kierunek od lica zewnętrznego do wewnętrznego.
 */
function sandwich(
  ctx: Ctx, id: string, name: string, stage: Stage, layer: Layer, origin: Vec3, axis: Vec3, u: Vec3, v: Vec3,
  thickness: number, outline: Array<[number, number]>, outerColor: string, innerColor: string, explode: Vec3,
  holes?: Array<Array<[number, number]>>, confidence: Confidence = 'HIGH',
) {
  const layers: Array<[string, number, number, MaterialKind, string]> = [
    ['outer', 0, SHEET, 'sheetOuter', outerColor],
    ['core', SHEET, thickness - 2 * SHEET, 'pirCore', '#e3cf8f'],
    ['inner', thickness - SHEET, SHEET, 'sheetInner', innerColor],
  ]
  for (const [tag, off, len, material, color] of layers) {
    push(ctx, {
      id: id + '-' + tag, name: name + (tag === 'core' ? ' — rdzeń PIR' : tag === 'outer' ? ' — blacha zewn.' : ' — blacha wewn.'),
      layer, stage, material, color, explode, confidence,
      geometry: { start: add(origin, mul(axis, off)), axis, u, v, length: len, section: outline, holes },
    })
  }
}

/** Prostokąty pola [u0,u1]×[0,h(u)] pozostałe po odjęciu otworów (pasy pionowe — stabilna triangulacja). */
function cutRects(u0: number, u1: number, top: (u: number) => number, openings: Array<{ a: number; b: number; y0: number; y1: number }>) {
  const xs = new Set<number>([u0, u1])
  for (const o of openings) {
    if (o.b <= u0 || o.a >= u1) continue
    xs.add(Math.max(u0, o.a))
    xs.add(Math.min(u1, o.b))
  }
  const cuts = [...xs].sort((p, q) => p - q)
  const out: Array<Array<[number, number]>> = []
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i]
    const b = cuts[i + 1]
    if (b - a < 0.002) continue
    const mid = (a + b) / 2
    const blocked = openings.filter((o) => o.a < mid && o.b > mid).sort((p, q) => p.y0 - q.y0)
    let y = 0
    const ta = top(a)
    const tb = top(b)
    for (const o of blocked) {
      if (o.y0 - y > 0.002) out.push([[a, y], [b, y], [b, o.y0], [a, o.y0]])
      y = Math.max(y, o.y1)
    }
    if (Math.min(ta, tb) - y > 0.002) out.push([[a, y], [b, y], [b, tb], [a, ta]])
  }
  return out
}

type WallDef = {
  side: WallSide
  stage: Stage
  origin: Vec3 // lewy-dolny punkt lica zewnętrznego (patrząc z zewnątrz)
  u: Vec3 // wzdłuż ściany
  inward: Vec3
  length: number
  top: (u: number) => number // wysokość panelu nad podłogą
  /** przesunięcie: współrzędna lokalna otworu (od środka rozpiętości starego modelu) → u */
  toU: (center: number) => number
}

/** Wykończenie dla każdej ściany: ten sam pawilon może mieć np. kasetony na froncie i goły PIR na bokach. */
export type FinishBySide = Record<WallSide, FinishVariant>

export function buildSystem1(
  config: PavilionConfig,
  finishIn: FinishVariant | FinishBySide,
  opts: { decor?: boolean } = {},
): ConstructionModel {
  const finishBySide: FinishBySide = typeof finishIn === 'string'
    ? { front: finishIn, back: finishIn, left: finishIn, right: finishIn }
    : finishIn
  const finish: FinishVariant = finishBySide.front
  const ctx: Ctx = { parts: [] }
  const L = config.length
  const W = config.width
  const a = m(PHYS.system1.angleLeg)
  const t = m(PHYS.system1.angleThickness)
  const tf = PANEL_THICKNESS_M[config.floorPanel]
  const tw = PANEL_THICKNESS_M[config.wallPanel]
  const tr = PANEL_THICKNESS_M[config.roofPanel]
  const geo = geometryOf(config)
  const y0 = geo.foundationGap ?? m(PHYS.base.groundGap)
  const outer = config.exteriorColor || RAL_7016_HEX
  const inner = RAL_9010_HEX // okładzina wewn. zawsze 9010 gładka
  const steelUp: Vec3 = [0, 1, 0]

  // ---- poziomy wynikające z montażu
  const yFrame = y0 // spód dolnej ramy
  const yFloorBottom = yFrame + t // płyta leży na ramieniu poziomym
  const yFloorTop = yFloorBottom + tf
  const hF = config.frontHeight
  const hB = config.backHeight
  // spód dachu przechodzi przez górne krawędzie ściany przedniej i tylnej (lica zewnętrzne)
  const zFrontFace = W / 2 - t
  const zBackFace = -W / 2 + t
  const roofUnder = (z: number) => yFloorTop + hB + (hF - hB) * (z - zBackFace) / (zFrontFace - zBackFace)
  const roofTopAtOuter = (z: number) => roofUnder(z) + tr
  // górna rama leży na dachu: na wierzchu żeber trapezu (dach trapezowy) albo na blasze (gładki) — nie wchodzi w dach
  const ribH = frameDims(config).roofRib
  const yTopF = roofTopAtOuter(W / 2) + ribH
  const yTopB = roofTopAtOuter(-W / 2) + ribH
  const postTopF = yTopF + a // słup kończy się na górze górnej ramy (WA0019)
  const postTopB = yTopB + a

  // ---- 1. dolna rama
  angle(ctx, 'frame-bottom-front', 'Dolna rama — kątownik front', 1, 'steel', [-L / 2, yFrame, W / 2], [1, 0, 0], steelUp, [0, 0, -1], L, [0, -0.6, 0.3])
  angle(ctx, 'frame-bottom-back', 'Dolna rama — kątownik tył', 1, 'steel', [-L / 2, yFrame, -W / 2], [1, 0, 0], steelUp, [0, 0, 1], L, [0, -0.6, -0.3])
  angle(ctx, 'frame-bottom-left', 'Dolna rama — kątownik lewy', 1, 'steel', [-L / 2, yFrame, -W / 2], [0, 0, 1], steelUp, [1, 0, 0], W, [-0.3, -0.6, 0])
  angle(ctx, 'frame-bottom-right', 'Dolna rama — kątownik prawy', 1, 'steel', [L / 2, yFrame, -W / 2], [0, 0, 1], steelUp, [-1, 0, 0], W, [0.3, -0.6, 0])

  // ---- 2. słupy narożne (ramiona w płaszczyznach ścian, do środka)
  const corners: Array<[string, number, number, Vec3, Vec3, number]> = [
    ['FL', -L / 2, W / 2, [1, 0, 0], [0, 0, -1], postTopF],
    ['FR', L / 2, W / 2, [-1, 0, 0], [0, 0, -1], postTopF],
    ['BL', -L / 2, -W / 2, [1, 0, 0], [0, 0, 1], postTopB],
    ['BR', L / 2, -W / 2, [-1, 0, 0], [0, 0, 1], postTopB],
  ]
  for (const [tag, x, z, lA, lB, top] of corners) {
    angle(ctx, 'post-' + tag, 'Słup narożny ' + tag + ' — kątownik 50×50×4', 2, 'steel', [x, yFrame, z], steelUp, lA, lB, top - yFrame,
      [Math.sign(x) * 0.5, 0.2, Math.sign(z) * 0.5])
  }

  // ---- 3. podłoga: wewnątrz ramy, na ramieniu poziomym; długie elementy wzdłuż długości pawilonu
  const floorL = L - 2 * t
  const floorW = W - 2 * t
  const floorModule = m(PHYS.system1.floorModule)
  const floorCount = Math.ceil(floorW / floorModule - 1e-6)
  for (let i = 0; i < floorCount; i++) {
    const z0 = -W / 2 + t + i * floorModule
    const z1 = Math.min(W / 2 - t, z0 + floorModule)
    // kontur w płaszczyźnie (x, z), wyciągnięty w górę; blacha „zewn.” = spód, „wewn.” = wierzch podłogi
    sandwich(ctx, 'floor-' + i, 'Płyta podłogowa ' + (i + 1), 3, 'floor', [-L / 2 + t, yFloorBottom, 0], steelUp, [1, 0, 0], [0, 0, 1],
      tf, rect(0, z0, floorL, z1), '#9aa0a3', '#d8d4cc', [0, 0.9, 0])
  }
  // mocowanie podłogi: wkręt z góry przez PIR → blachę → ramię poziome kątownika (w osi ramienia)
  const screwL = m(PHYS.system1.floorScrewLength)
  const fs = m(PHYS.system1.floorScrewSpacing)
  const legMid = t + (a - t) / 2
  const floorScrews: Array<[number, number]> = []
  for (let x = -L / 2 + 0.15; x <= L / 2 - 0.15 + 1e-6; x += (L - 0.3) / Math.max(1, Math.round((L - 0.3) / fs))) {
    floorScrews.push([x, W / 2 - legMid], [x, -W / 2 + legMid])
  }
  for (let z = -W / 2 + 0.15; z <= W / 2 - 0.15 + 1e-6; z += (W - 0.3) / Math.max(1, Math.round((W - 0.3) / fs))) {
    floorScrews.push([-L / 2 + legMid, z], [L / 2 - legMid, z])
  }
  floorScrews.forEach(([x, z], i) => {
    push(ctx, {
      id: 'screw-floor-' + i, name: 'Wkręt podłoga → kątownik (' + Math.round(screwL * 1000) + ' mm)', layer: 'fasteners', stage: 3,
      material: 'screw', color: '#c9a227', explode: [0, 0.9, 0], confidence: 'MEDIUM',
      geometry: { start: [x - 0.003, yFloorTop + 0.004, z - 0.003], axis: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], length: screwL, section: rect(0, 0, 0.006, 0.006) },
    })
  })

  // ---- 4–6. ściany na podłodze (na taśmie uszczelniającej — 2 mm, założenie; rozdziela też płaszczyzny w przekroju)
  const seal = 0.002
  const yWallBase = yFloorTop + seal
  const openings = geo.openings
  const wallModule = m(PHYS.panel.wallModule)
  const walls: WallDef[] = [
    {
      side: 'back', stage: 4, origin: [L / 2 - t, yWallBase, -W / 2 + t], u: [-1, 0, 0], inward: [0, 0, 1], length: L - 2 * t,
      top: () => hB - seal, toU: (c) => c + L / 2 - t,
    },
    {
      side: 'left', stage: 5, origin: [-L / 2 + t, yWallBase, -W / 2 + t + tw], u: [0, 0, 1], inward: [1, 0, 0], length: W - 2 * t - 2 * tw,
      top: (u) => roofUnder(-W / 2 + t + tw + u) - yWallBase, toU: (c) => c + W / 2 - t - tw,
    },
    {
      side: 'right', stage: 5, origin: [L / 2 - t, yWallBase, W / 2 - t - tw], u: [0, 0, -1], inward: [-1, 0, 0], length: W - 2 * t - 2 * tw,
      top: (u) => roofUnder(W / 2 - t - tw - u) - yWallBase, toU: (c) => c + W / 2 - t - tw,
    },
    {
      side: 'front', stage: 6, origin: [-L / 2 + t, yWallBase, W / 2 - t], u: [1, 0, 0], inward: [0, 0, -1], length: L - 2 * t,
      top: () => hF - seal, toU: (c) => c + L / 2 - t,
    },
  ]
  for (const wdef of walls) {
    const ops = openings.filter((o) => o.wall === wdef.side).map((o) => toWallOpening(o, wdef))
    const lay = panelLayout(wdef.length, wallModule)
    const explode = mul(wdef.inward, -1.4)
    for (let i = 0; i < lay.count; i++) {
      const u0 = lay.start + i * wallModule
      const u1 = i === lay.count - 1 ? wdef.length : u0 + wallModule
      const rects = cutRects(u0, u1, wdef.top, ops)
      // pasy jednej płyty (cięcie wokół otworów) zachodzą na siebie o 0,4 mm — bez szczelin renderu, przez które widać rdzeń
      const ov = 0.0004
      // (tylko między pasami tej samej płyty — nie na styku z sąsiednią płytą ani przy słupie)
      const uEnd = i === lay.count - 1 ? wdef.length : u0 + wallModule
      rects.map((poly) => {
        const lo = Math.min(...poly.map((q) => q[0]))
        return poly.map(([pu, pv]) => {
          const left = pu <= lo + 1e-9
          const d = left ? (pu > u0 + 1e-6 ? -ov : 0) : (pu < uEnd - 1e-6 ? ov : 0)
          return [pu + d, pv] as [number, number]
        })
      })
        .forEach((poly, k) => {
        sandwich(ctx, 'wall-' + wdef.side + '-' + i + '-' + k, 'Płyta ścienna ' + wdef.side + ' ' + (i + 1), wdef.stage, 'walls',
          wdef.origin, wdef.inward, wdef.u, steelUp, tw, poly, outer, inner, explode)
      })
    }
    // styki płyt na zamku: ciemna linia na licu zewnętrznym na każdej granicy modułu (przerwana otworami)
    const jw = m(PHYS.panel.jointWidth)
    for (let i = 1; i < lay.count; i++) {
      const uj = lay.start + i * wallModule
      cutRects(uj - jw / 2, uj + jw / 2, wdef.top, ops).forEach((poly, k) => {
        push(ctx, {
          id: 'wall-joint-' + wdef.side + '-' + i + '-' + k, name: 'Styk płyt na zamku ' + wdef.side + ' ' + i, layer: 'walls', stage: wdef.stage,
          material: 'frame', color: '#15181a', explode, confidence: 'MEDIUM',
          geometry: { start: add(wdef.origin, mul(wdef.inward, -0.0005)), axis: wdef.inward, u: wdef.u, v: steelUp, length: 0.0012, section: poly },
        })
      })
    }
    // obróbka ościeży: boki, nadproże i parapet otworu wyłożone blachą (rdzeń płyty w otworze niewidoczny; BOM: ościeża/nadproże/parapet)
    const rv = 0.0008
    // stolarka z przekrojów: sąsiednie ramy sprzężone (wspólny słupek) — między nimi bez blachy ościeża
    const sj = arch(config).sectionJoinery
    const joinOf = (o: { a: number; b: number; id: string }) => ({
      l: sj && ops.some((x) => x.id !== o.id && Math.abs(x.b - o.a) < JOIN_TOL),
      r: sj && ops.some((x) => x.id !== o.id && Math.abs(x.a - o.b) < JOIN_TOL),
    })
    for (const o of ops) {
      const j = joinOf(o)
      const lin: Array<[string, Array<[number, number]>]> = [
        ...(j.l ? [] : [['l', rect(o.a, o.y0, o.a + rv, o.y1)] as [string, Array<[number, number]>]]),
        ...(j.r ? [] : [['r', rect(o.b - rv, o.y0, o.b, o.y1)] as [string, Array<[number, number]>]]),
        ['t', rect(o.a, o.y1 - rv, o.b, o.y1)],
        ...(o.y0 > 0.01 ? [['b', rect(o.a, o.y0, o.b, o.y0 + rv)] as [string, Array<[number, number]>]] : []),
      ]
      for (const [tag, poly] of lin) {
        push(ctx, {
          id: 'reveal-' + o.id + '-' + tag, name: 'Obróbka ościeża ' + o.id + ' (' + tag + ')', layer: 'flashings', stage: 9,
          material: 'flashing', color: config.flashingColor || outer, explode: mul(explode, 1.2), confidence: 'MEDIUM',
          geometry: { start: add(wdef.origin, mul(wdef.inward, -0.0005)), axis: wdef.inward, u: wdef.u, v: steelUp, length: tw + 0.001, section: poly },
        })
      }
    }
    // stolarka w otworach: presety z `sectionJoinery` — z przekrojów generic-aluminium-52; pozostałe — uproszczona rama + szyba
    if (sj) {
      const plane: WallPlane = { origin: wdef.origin, u: wdef.u, up: steelUp, out: mul(wdef.inward, -1), stage: wdef.stage, explode }
      for (const op of openings.filter((x) => x.wall === wdef.side)) {
        const o = toWallOpening(op, wdef)
        const j = joinOf(o)
        ctx.parts.push(...buildOpeningJoinery({
          id: op.id, kind: op.kind.startsWith('door-') ? 'door' : 'fixed', a: o.a, b: o.b, y0: o.y0, y1: o.y1,
          // rama przylega do blachy ościeża (0,8 mm); przy sprzężeniu — do sąsiedniej ramy; próg drzwi na posadzce
          inset: { l: j.l ? 0 : rv, r: j.r ? 0 : rv, t: rv, b: o.y0 > 0.01 ? rv : 0 },
          join: j,
          color: op.frameColor ?? RAL_7016_HEX, hinge: op.hinge === 'right' ? 'right' : 'left', handle: op.handle,
        }, plane))
      }
    } else {
      for (const o of ops) addJoinery(ctx, wdef, o, tw, explode)
    }
  }

  // mocowanie ścian skrajnych (przód/tył) do słupów: wkręt przez ramię słupa w krawędź płyty
  const ws = m(PHYS.system1.wallScrewSpacing)
  for (const [tag, x, z] of [['FL', -L / 2, W / 2], ['FR', L / 2, W / 2], ['BL', -L / 2, -W / 2], ['BR', L / 2, -W / 2]] as const) {
    const h = z > 0 ? hF : hB
    const n = Math.max(2, Math.round(h / ws))
    for (let k = 0; k < n; k++) {
      const y = yWallBase + (k + 0.5) * (h / n)
      // przez ramię leżące w płaszczyźnie ściany przedniej/tylnej (normalna ±z)
      push(ctx, {
        id: 'screw-post-' + tag + '-' + k, name: 'Wkręt słup → płyta ściany skrajnej', layer: 'fasteners', stage: z > 0 ? 6 : 4,
        material: 'screw', color: '#c9a227', explode: [0, 0, Math.sign(z) * 1.4], confidence: 'UNKNOWN',
        geometry: { start: [x - Math.sign(x) * legMid - 0.003, y - 0.003, z + Math.sign(z) * 0.004], axis: [0, 0, -Math.sign(z)], u: [1, 0, 0], v: [0, 1, 0], length: 0.06, section: rect(0, 0, 0.006, 0.006) },
      })
    }
  }

  // ---- 7. dach: płyty w poprzek (kierunek z), luz przy kątownikach wyliczony z danych produkcji
  const c = m(PHYS.system1.roofClearance)
  const zR0 = -W / 2 + t + c
  const zR1 = W / 2 - t - c
  const dy = roofUnder(zR1) - roofUnder(zR0)
  const dz = zR1 - zR0
  const roofLen = Math.hypot(dz, dy)
  const slopeDir = norm([0, dy, dz])
  const roofNormal = norm([0, dz, -dy])
  const roofModule = m(PHYS.panel.roofModule)
  const roofSpanX = L - 2 * t - 2 * c
  const roofCount = Math.ceil(roofSpanX / roofModule - 1e-6)
  const roofOrigin: Vec3 = [-L / 2 + t + c, roofUnder(zR0), zR0]
  for (let i = 0; i < roofCount; i++) {
    const x0 = i * roofModule
    const x1 = Math.min(roofSpanX, x0 + roofModule)
    // „zewn.” = sufit (biały, od dołu), „wewn.” = wierzch dachu — kolejność warstw wzdłuż normalnej do góry
    sandwich(ctx, 'roof-' + i, 'Płyta dachowa ' + (i + 1), 7, 'roof', roofOrigin, roofNormal, [1, 0, 0], slopeDir, tr,
      rect(x0, 0, x1, roofLen), inner, outer, [0, 1.6, 0])
  }
  if (config.roofProfile === 'trapezoid') {
    const tz = ROOF_TRAPEZOIDS[config.panelManufacturer]
    const b = tz.baseMm / 2000
    const top = tz.topMm / 2000
    const h = tz.heightMm / 1000
    const topOrigin = add(roofOrigin, mul(roofNormal, tr))
    // żebra od krawędzi (żebro zakładu na brzegu płyty), co rozstaw, ostatnie przy przeciwległej krawędzi — boczne kątowniki górnej ramy leżą na skrajnych
    const ribXs: number[] = []
    for (let x = b; x <= roofSpanX - b + 1e-6; x += tz.pitchMm / 1000) ribXs.push(x)
    if (roofSpanX - b - ribXs[ribXs.length - 1] > 2 * b) ribXs.push(roofSpanX - b)
    for (const x of ribXs) {
      push(ctx, {
        id: 'roof-rib-' + x.toFixed(3), name: 'Żebro trapezu dachu', layer: 'roof', stage: 7, material: 'sheetOuter', color: outer,
        explode: [0, 1.6, 0], confidence: 'MEDIUM',
        geometry: { start: topOrigin, axis: slopeDir, u: [1, 0, 0], v: roofNormal, length: roofLen, section: [[x - b, 0], [x + b, 0], [x + top, h], [x - top, h]] },
      })
    }
  }

  // ---- 8. górna rama: kątownik na płycie dachowej, ramię pionowe w płaszczyźnie zewnętrznej, poziome do środka
  // przód/tył: ramię poziome leży w płaszczyźnie dachu (spadek), ramię pionowe prostopadle do dachu — pełne oparcie, bez wcinania
  angle(ctx, 'frame-top-front', 'Górna rama — kątownik front', 8, 'topFrame', [-L / 2, yTopF, W / 2], [1, 0, 0], roofNormal, mul(slopeDir, -1), L, [0, 2.2, 0.3])
  angle(ctx, 'frame-top-back', 'Górna rama — kątownik tył', 8, 'topFrame', [-L / 2, yTopB, -W / 2], [1, 0, 0], roofNormal, slopeDir, L, [0, 2.2, -0.3])
  const sideAxis = norm([0, yTopF - yTopB, W])
  const sideLen = Math.hypot(W, yTopF - yTopB)
  const sideUp = norm([0, W, -(yTopF - yTopB)])
  angle(ctx, 'frame-top-left', 'Górna rama — kątownik lewy', 8, 'topFrame', [-L / 2, yTopB, -W / 2], sideAxis, sideUp, [1, 0, 0], sideLen, [-0.3, 2.2, 0])
  angle(ctx, 'frame-top-right', 'Górna rama — kątownik prawy', 8, 'topFrame', [L / 2, yTopB, -W / 2], sideAxis, sideUp, [-1, 0, 0], sideLen, [0.3, 2.2, 0])

  // ---- 8b. ucha transportowe: pręt gładki φ16, 250 mm, gięty w U, dospawany w każdym górnym narożu (produkcja 2026-10-04)
  //      pręt okrągły: odcinki (ramiona + łuk) o przekroju koła φ16, oś pręta wzdłuż linii gięcia
  {
    const r = m(PHYS.system1.liftingEyeRod) / 2
    const c2 = m(PHYS.system1.liftingEyeSpan) / 2
    const leg = Math.max(0.02, (m(PHYS.system1.liftingEyeLength) - Math.PI * c2) / 2)
    const circle: Array<[number, number]> = Array.from({ length: 12 }, (_, i) => [r * Math.cos((i / 12) * 2 * Math.PI), r * Math.sin((i / 12) * 2 * Math.PI)])
    // linia osi pręta w płaszczyźnie U (s — poziomo wzdłuż ściany, h — w górę)
    const path: Array<[number, number]> = [[-c2, 0], [-c2, leg]]
    const n = 12
    for (let i = 1; i <= n; i++) {
      const th = Math.PI - (i / n) * Math.PI
      path.push([c2 * Math.cos(th), leg + c2 * Math.sin(th)])
    }
    path.push([c2, 0])
    for (const [tag, sx, sz] of [['FL', -1, 1], ['FR', 1, 1], ['BL', -1, -1], ['BR', 1, -1]] as const) {
      const yBase = (sz > 0 ? yTopF : yTopB) + 0.002
      // ramiona przy wewnętrznym licu ramienia pionowego kątownika przód/tył, tuż za słupem
      const cx = sx * (L / 2 - a - c2 - r - 0.01)
      const zc = sz * (W / 2 - t - r)
      for (let k = 0; k < path.length - 1; k++) {
        const [s0, h0] = path[k]
        const [s1, h1] = path[k + 1]
        const len = Math.hypot(s1 - s0, h1 - h0)
        const dir: Vec3 = [(s1 - s0) / len, (h1 - h0) / len, 0]
        const perp: Vec3 = [-dir[1], dir[0], 0]
        const over = k === 0 || k === path.length - 2 ? 0 : r * Math.tan(Math.PI / n / 2) // zakład na łuku — bez szczelin
        push(ctx, {
          id: 'lift-eye-' + tag + (k ? '-' + k : ''), name: 'Ucho transportowe ' + tag + ' — pręt φ16, 250 mm, U', layer: 'topFrame', stage: 8,
          material: 'steel', color: '#6f767c', explode: [sx * 0.3, 2.5, sz * 0.3], confidence: 'MEDIUM',
          geometry: {
            start: [cx + s0 - dir[0] * over, yBase + h0 - dir[1] * over, zc], axis: dir, u: perp, v: [0, 0, 1],
            length: len + 2 * over, section: circle,
          },
        })
      }
    }
  }

  // ---- 9. obróbki
  addFlashings(ctx, { L, W, y0, yTopF, yTopB, a, t, tw, sideAxis, sideLen, sideUp, color: config.flashingColor || outer, slope: (hF - hB) / (zFrontFace - zBackFace), roofEdge: ribH + tr, mitre: arch(config).flashingMitre }, finishBySide)

  // ---- 10. elewacja (tylko wariant pod kasetony) — osobna warstwa, nie zmienia konstrukcji
  if (opts.decor !== false && finish === 'cassette') addCassettes(ctx, { L, W, y0, yFloorTop, yTopF, yTopB, t, walls, openings: geo.openings, color: outer })
  if (opts.decor !== false && finish === 'squares') addBoards(ctx, { L, W, y0, yFloorTop, yTopF, yTopB, t, walls, openings: geo.openings, color: outer })

  // ---- wymiary wyliczone
  const derived: DerivedDimension[] = [
    { key: 'floorInner', label: 'Płyta podłogowa — pole wewnątrz ramy', valueMm: Math.round(floorL * 1000), formula: 'L − 2·t (dł.) × W − 2·t = ' + Math.round(floorL * 1000) + ' × ' + Math.round(floorW * 1000), confidence: 'HIGH' },
    { key: 'floorCount', label: 'Liczba płyt podłogowych (wzdłuż długości)', valueMm: floorCount, formula: `⌈(W − 2·t) / moduł⌉ = ⌈${Math.round(floorW * 1000)} / ${Math.round(floorModule * 1000)}⌉, ostatnia ${Math.round((floorW - (floorCount - 1) * floorModule) * 1000)} mm`, confidence: 'MEDIUM' },
    { key: 'floorTop', label: 'Poziom podłogi (wierzch PIR) nad spodem ramy', valueMm: Math.round((yFloorTop - yFrame) * 1000), formula: 't + grubość podłogi = 4 + ' + Math.round(tf * 1000), confidence: 'HIGH' },
    { key: 'frontBackWallLength', label: 'Ściana przednia/tylna — długość', valueMm: Math.round((L - 2 * t) * 1000), formula: 'L − 2·t (między ramionami słupów)', confidence: 'HIGH' },
    {
      key: 'sideWallLength', label: 'Ściana boczna — długość', valueMm: Math.round((W - 2 * t - 2 * tw) * 1000),
      formula: `W − 2·t − 2·grubość ściany przód/tył = ${Math.round(W * 1000)} − 8 − ${Math.round(2 * tw * 1000)}`, confidence: 'HIGH',
      check: { expected: 'produkcja: 2740–2760 mm', ok: Math.abs(W - 2 * t - 2 * tw - 2.75) <= 0.011 },
    },
    (() => {
      const len = L - 2 * t
      const lay = panelLayout(len, wallModule)
      return {
        key: 'wallModules', label: 'Płyty ściany przedniej', valueMm: lay.count,
        formula: lay.cut
          ? `⌈${Math.round(len * 1000)} / ${Math.round(wallModule * 1000)}⌉, ostatnia docięta ${Math.round(lay.last * 1000)} mm`
          : `${Math.round(len * 1000)} mm między słupami = ${lay.count} × ${Math.round(wallModule * 1000)} + ${Math.round(lay.rest * 1000)} mm tolerancji (ostatnia płyta docinana, gdy się nie mieści)`,
        confidence: 'VERIFIED' as Confidence,
        check: { expected: 'produkcja: 6 płyt dla 6 × 3', ok: Math.abs(config.length - 6.03) > 0.01 || lay.count === 6 },
      }
    })(),
    (() => {
      const lay = panelLayout(W - 2 * t - 2 * tw, wallModule)
      return {
        key: 'sideWallPanels', label: 'Płyty ściany bocznej', valueMm: lay.count,
        formula: lay.cut ? `${lay.count - 1} × ${Math.round(wallModule * 1000)} + docięta ${Math.round(lay.last * 1000)} mm` : `${lay.count} × ${Math.round(wallModule * 1000)}`,
        confidence: 'VERIFIED' as Confidence,
        check: { expected: 'produkcja: 3 płyty, jedna docięta na 752 mm', ok: Math.abs(W - 2.96) > 0.01 || (lay.count === 3 && Math.abs(lay.last - 0.752) < 0.002) },
      }
    })(),
    {
      key: 'roofLength', label: 'Element dachowy — długość (w poprzek)', valueMm: Math.round(roofLen * 1000),
      formula: 'W − 2·t − 2·luz (luz z danych produkcji) — po skosie', confidence: 'MEDIUM',
      check: { expected: 'produkcja: ≈ 2940 mm', ok: Math.abs(roofLen - 2.94) <= 0.012 },
    },
    { key: 'roofCount', label: 'Liczba płyt dachowych', valueMm: roofCount, formula: `⌈${Math.round(roofSpanX * 1000)} / ${Math.round(roofModule * 1000)}⌉`, confidence: 'MEDIUM' },
    { key: 'postFront', label: 'Słup narożny przedni — długość', valueMm: Math.round((postTopF - yFrame) * 1000), formula: 't + podłoga + ściana przednia + dach' + (ribH > 0 ? ' + żebro trapezu' : '') + ' + 50 (górna rama)', confidence: 'MEDIUM' },
    { key: 'postBack', label: 'Słup narożny tylny — długość', valueMm: Math.round((postTopB - yFrame) * 1000), formula: 't + podłoga + ściana tylna + dach' + (ribH > 0 ? ' + żebro trapezu' : '') + ' + 50 (górna rama)', confidence: 'MEDIUM' },
    {
      key: 'postAboveRoof', label: 'Wysunięcie słupa ponad dach', valueMm: Math.round((a + ribH) * 1000),
      formula: ribH > 0
        ? `żebro trapezu ${Math.round(ribH * 1000)} + górna rama ${Math.round(a * 1000)} (rama leży na żebrach; nad żebrami ${Math.round(a * 1000)} mm — produkcja „~5 cm”)`
        : 'górna rama leży na blasze dachu; produkcja „~5 cm”, WA0019 ≈ 55 mm',
      confidence: 'HIGH',
    },
    { key: 'outerHeightFront', label: 'Wysokość zewn. front (spód ramy → góra górnej ramy)', valueMm: Math.round((postTopF - yFrame) * 1000), formula: 'konstrukcja; + prześwit ' + Math.round(y0 * 1000) + ' mm do gruntu', confidence: 'MEDIUM' },
  ]

  return {
    system: 'angle_50x50x4',
    parts: ctx.parts,
    derived,
    levels: { yFrame, yFloorTop, wallTopFront: yFloorTop + hF, wallTopBack: yFloorTop + hB, yTopF, yTopB, postTopF, postTopB },
  }
}

/**
 * Układ płyt w module: pełne płyty od jednego końca, ostatnia przejmuje resztę — docinana, gdy się nie mieści
 * (produkcja 2026-10-02). Jeśli reszta ≤ 30 mm, to tolerancja złożenia zamków, a nie osobny pasek płyty.
 * Przykład: 6022 mm między słupami → 6 płyt w module 1000 (produkcja: 6 płyt na froncie 6 × 3), 22 mm w zamku/tolerancji.
 */
export function panelLayout(available: number, module: number, tolerance = 0.03) {
  const full = Math.floor(available / module + 1e-6)
  const rest = available - full * module
  if (full > 0 && rest <= tolerance) return { count: full, start: 0, last: module + rest, rest, cut: false }
  const count = Math.ceil(available / module - 1e-6)
  return { count, start: 0, last: available - (count - 1) * module, rest: 0, cut: true }
}

/** Tolerancja styku sąsiednich otworów (jak OpeningFrame: wspólny słupek przy odstępie < 12 mm). */
const JOIN_TOL = 0.012

function toWallOpening(o: OpeningPlacement, w: WallDef) {
  const c = w.toU(o.center)
  const sill = o.sill ?? (o.kind.startsWith('door-') ? 0 : 0.08)
  return { a: c - o.width / 2, b: c + o.width / 2, y0: sill, y1: sill + o.height, kind: o.kind, id: o.id }
}

function addJoinery(ctx: Ctx, w: WallDef, o: ReturnType<typeof toWallOpening>, tw: number, explode: Vec3) {
  const face = m(PHYS.joinery.fixFrameFace)
  const depth = m(PHYS.joinery.frameDepth)
  const origin = add(w.origin, mul(w.inward, (tw - depth) / 2))
  const pieces: Array<[string, Array<[number, number]>]> = [
    ['l', rect(o.a, o.y0, o.a + face, o.y1)],
    ['r', rect(o.b - face, o.y0, o.b, o.y1)],
    ['t', rect(o.a + face, o.y1 - face, o.b - face, o.y1)],
    ['b', rect(o.a + face, o.y0, o.b - face, o.y0 + face)],
  ]
  for (const [tag, poly] of pieces) {
    push(ctx, {
      id: 'joinery-' + o.id + '-' + tag, name: 'Rama stolarki ' + o.id, layer: 'walls', stage: w.stage, material: 'frame', color: RAL_7016_HEX,
      explode, confidence: 'MEDIUM', geometry: { start: origin, axis: w.inward, u: w.u, v: [0, 1, 0], length: depth, section: poly },
    })
  }
  push(ctx, {
    id: 'glass-' + o.id, name: 'Szyba ' + o.id, layer: 'walls', stage: w.stage, material: 'glass', color: '#5d6b74', explode, confidence: 'MEDIUM',
    geometry: { start: add(origin, mul(w.inward, depth / 2)), axis: w.inward, u: w.u, v: [0, 1, 0], length: 0.024, section: rect(o.a + face, o.y0 + face, o.b - face, o.y1 - face) },
  })
}

type FlashCtx = {
  L: number; W: number; y0: number; yTopF: number; yTopB: number; a: number; t: number; tw: number; sideAxis: Vec3; sideLen: number; sideUp: Vec3
  color: string; slope: number; roofEdge: number
  /** E4 (PoC): korona i cokół łączone na narożniku uciosem 45° (zamiast wydłużenia i cięcia prostego — wystające kapinosy) */
  mitre: boolean
}

/** u lica obróbki cokołowej (od płaszczyzny kątownika na zewnątrz). */
function baseFlashingFaceU(f: FlashCtx) {
  return -f.t + 0.0008 + m(PHYS.system1.baseFlashingOffset)
}

function flashingProfiles(f: FlashCtx, finish: FinishVariant, kIn = 0) {
  // lico korony musi zejść poniżej krawędzi dachu (kątownik + żebro + płyta) z zakładem — inaczej widać rdzeń
  const face = Math.max(m(PHYS.system1.crownFlashingFace), f.a + f.roofEdge + 0.015)
  const baseFace = m(PHYS.system1.baseFlashingFace)
  const o = 0.0012 // odsunięcie blachy od lica kątownika
  const uWall = -f.t + 0.0008 // lico ściany (4 mm za płaszczyzną kątownika)
  // układ przekroju: u — na zewnątrz od płaszczyzny kątownika, v — od góry górnej ramy; wierzch dachu przy krawędzi: v = −a
  // górny kątownik zostaje widoczny nad obróbką (produkcja 2026-10-03, WA0019): obróbka zaczyna się pod nim, na wierzchu dachu,
  // górna krawędź dosunięta do lica kątownika; lico liczone od góry kątownika: face − a pod kątownikiem
  // kątownik leży na dachu/obróbce (zdjęcie gotowego pawilonu 2026-10-04): obróbka ma kołnierz pod kątownikiem, na wierzchu dachu,
  // z nachyleniem dachu w kierunku do środka (k), więc nie ma szczeliny, przez którą widać płytę/żebra
  const capW = m(PHYS.system1.crownUnderFrame)
  const vCap = -f.a - FLASH_T / 2 - 0.0003
  const cap: Array<[number, number]> = [[-capW, vCap + kIn * capW - 0.0008], [-0.0005, vCap]]
  let crown: Array<[number, number]>
  let label: string
  let conf: Confidence
  if (finish === 'bare') {
    // „półtorówka”: lico 15 mm od ściany, na dole załamanie do ściany i kołnierz przykręcany (szkic produkcji)
    const uF = uWall + m(PHYS.system1.flashingOffsetPoltorowka)
    const step = uF - uWall
    crown = [...cap, [uF, vCap], [uF, -face + step], [uWall, -face], [uWall, -face - 0.04]]
    label = 'Obróbka „półtorówka” 15 mm'
    conf = 'HIGH'
  } else if (finish === 'squares') {
    // „na kwadraty”: lico 25 mm od ściany, powrót poziomy do ściany, kapinos (szkic produkcji)
    const uF = uWall + m(PHYS.system1.flashingOffsetSquares)
    crown = [...cap, [uF, vCap], [uF, -face], [uWall + 0.006, -face], [uWall + 0.012, -face - 0.02]]
    label = 'Obróbka „na kwadraty” 25 mm'
    conf = 'HIGH'
  } else {
    // płaska pod kaseton: zakrywa krawędź dachu (kątownik + żebro + płyta) z zakładem 30 mm na ścianę — rdzeń niewidoczny
    crown = [...cap, [o, vCap], [o, -(f.a + f.roofEdge + 0.03)]]
    label = 'Obróbka płaska techniczna (pod kaseton)'
    conf = 'LOW'
  }
  // cokół (zdjęcie narożnika): lico odsunięte od ściany, u góry skośny powrót do ściany i kołnierz przykręcony do płyty
  const uB = baseFlashingFaceU(f)
  const uFl = uWall + FLASH_T / 2
  const baseRise = (uB - uFl) * Math.tan((PHYS.system1.baseFlashingSlope.value * Math.PI) / 180)
  const base: Array<[number, number]> = finish === 'cassette'
    ? [[o, 0], [o, baseFace], [-f.t - 0.002, baseFace + 0.004]]
    : [[uB, -0.01], [uB, baseFace - baseRise], [uFl, baseFace], [uFl, baseFace + m(PHYS.system1.baseFlashingFlange)]]
  return { crownSec: thicken(crown, FLASH_T), baseSec: thicken(base, FLASH_T), label, conf, crownU: Math.max(...crown.map((q) => q[0])) }
}

function addFlashings(ctx: Ctx, f: FlashCtx, finishBySide: FinishBySide) {
  const o = 0.0012
  // spadek dachu „do środka” od krawędzi: przód (wyżej) — dach opada, tył — wznosi się; boki — poziomo w poprzek
  const kInOf = (side: WallSide) => (side === 'front' ? -f.slope : side === 'back' ? f.slope : 0)
  const prof = (side: WallSide) => flashingProfiles(f, finishBySide[side], kInOf(side))
  const runs: Array<[WallSide, Vec3, Vec3, Vec3, number, Vec3, number]> = [
    // tag, start (na krawędzi zewn., poziom odniesienia), oś biegu, kierunek „na zewnątrz”, długość, w górę, y odniesienia
    ['front', [-f.L / 2, 0, f.W / 2], [1, 0, 0], [0, 0, 1], f.L, [0, 1, 0], f.yTopF],
    ['back', [f.L / 2, 0, -f.W / 2], [-1, 0, 0], [0, 0, -1], f.L, [0, 1, 0], f.yTopB],
  ]
  // cokół odsunięty owija narożnik: przebiegi wydłużone o odsunięcie lica z obu stron (bez kasetonów)
  const wrap = (side: WallSide) => (finishBySide[side] === 'cassette' ? 0 : Math.max(0, baseFlashingFaceU(f)))
  for (const [tag, st, axis, out, len, up, yTop] of runs) {
    const { crownSec, baseSec, label, conf, crownU } = prof(tag)
    const w = wrap(tag)
    // korona owija narożnik: wydłużona o wysięg lica, styka się z koroną boczną (bez prześwitu w rogu)
    const cw = Math.max(0, crownU)
    // ucios (E4): przebieg od narożnika do narożnika, u przekroju na zewnątrz → k = −1 wydłuża część zewnętrzną dokładnie
    // do płaszczyzny 45° przez narożnik (zagięcia i kapinosy obu ścian schodzą się w jednej linii)
    const crownGeo = f.mitre
      ? { start: [st[0], yTop + f.a, st[2]] as Vec3, axis, u: out, v: up, length: len, section: crownSec, mitre: [-1, -1] as [number, number] }
      : { start: [st[0] - axis[0] * cw, yTop + f.a, st[2]] as Vec3, axis, u: out, v: up, length: len + 2 * cw, section: crownSec }
    const baseGeo = f.mitre
      ? { start: [st[0], f.y0, st[2]] as Vec3, axis, u: out, v: up, length: len, section: baseSec, mitre: [-1, -1] as [number, number] }
      : { start: [st[0] - axis[0] * w, f.y0, st[2]] as Vec3, axis, u: out, v: up, length: len + 2 * w, section: baseSec }
    // BOM: długość nominalna jak przed uciosem (przebieg z wydłużeniem za narożnik) — znaczenie pola bez zmian
    push(ctx, {
      id: 'flash-crown-' + tag, name: label + ' — korona ' + tag, layer: 'flashings', stage: 9, material: 'flashing', color: f.color,
      explode: mul(out, 1.0), confidence: conf, geometry: crownGeo, bom: { lengthM: len + 2 * cw },
    })
    push(ctx, {
      id: 'flash-base-' + tag, name: label + ' — cokół ' + tag, layer: 'flashings', stage: 9, material: 'flashing', color: f.color,
      explode: mul(out, 1.0), confidence: conf, geometry: baseGeo, bom: { lengthM: len + 2 * w },
    })
  }
  // narożniki: L zakrywające słup i czoło ściany przedniej/tylnej (ramię boczne wyliczone z grubości ściany)
  // ramiona 25 cm (produkcja 2026-10-04); boczne musi zakryć czoło ściany przedniej/tylnej (t + grubość ściany) — kontrola niżej
  const legS = Math.max(m(PHYS.system1.cornerFlashingSide), f.t + f.tw + 0.02)
  const legF = m(PHYS.system1.cornerFlashingFront)
  // przy kasetonach obróbka narożna leży na licu kasetonów i przykrywa ich końce (produkcja 2026-10-04: róg zakryty obróbką)
  const cassFace = -f.t + m(PHYS.cassette.thickness) + FLASH_T / 2 + 0.001
  for (const [tag, x, z] of [['FL', -1, 1], ['FR', 1, 1], ['BL', -1, -1], ['BR', 1, -1]] as const) {
    // do spodu górnej ramy: kątownik ramy i wierzch słupa zostają widoczne (nieprzykryte)
    const top = z > 0 ? f.yTopF : f.yTopB
    const sideFB: WallSide = z > 0 ? 'front' : 'back'
    const sideLR: WallSide = x < 0 ? 'left' : 'right'
    // kasetony po obu stronach narożnika: róg tworzą kasetony zawinięte przez narożnik (zdjęcia 12, 110, 207) — bez obróbki
    if (finishBySide[sideFB] === 'cassette' && finishBySide[sideLR] === 'cassette') continue
    const oF = finishBySide[sideFB] === 'cassette' ? cassFace : o // lico w płaszczyźnie ściany przód/tył (v)
    const oS = finishBySide[sideLR] === 'cassette' ? cassFace : o // lico w płaszczyźnie ściany bocznej (u)
    const cornerSec = thicken([[-legF, oF], [oS, oF], [oS, -legS]], FLASH_T)
    const { label } = prof(sideFB)
    push(ctx, {
      id: 'flash-corner-' + tag, name: label + ' — narożnik ' + tag, layer: 'flashings', stage: 9, material: 'flashing', color: f.color,
      explode: [x * 0.8, 0, z * 0.8], confidence: 'MEDIUM',
      geometry: { start: [x * f.L / 2, f.y0, z * f.W / 2], axis: [0, 1, 0], u: [x, 0, 0], v: [0, 0, z], length: top - f.y0, section: cornerSec },
    })
  }
  // boki: korona po skosie dachu, cokół poziomo
  for (const [tag, x, out] of [['left', -f.L / 2, [-1, 0, 0]], ['right', f.L / 2, [1, 0, 0]]] as const) {
    const { crownSec, baseSec, label, conf } = prof(tag)
    // korona boczna zachodzi na narożu za lico korony przedniej/tylnej — róg zamknięty, rdzeń płyty niewidoczny
    const ext = Math.max(0, prof('front').crownU, prof('back').crownU) + FLASH_T
    // ucios po skosie dachu: przesunięcie wzdłuż osi k·u, w rzucie −u → k = −(długość po skosie / rzut)
    const kSide = -f.sideLen / f.W
    push(ctx, {
      id: 'flash-crown-' + tag, name: label + ' — korona ' + tag, layer: 'flashings', stage: 9, material: 'flashing', color: f.color,
      explode: mul(out as Vec3, 1.0), confidence: conf, bom: { lengthM: f.sideLen + 2 * ext },
      geometry: f.mitre
        ? { start: [x, f.yTopB + f.a, -f.W / 2], axis: f.sideAxis, u: out as Vec3, v: f.sideUp, length: f.sideLen, section: crownSec, mitre: [kSide, kSide] }
        : { start: add([x, f.yTopB + f.a, -f.W / 2], mul(f.sideAxis, -ext)), axis: f.sideAxis, u: out as Vec3, v: f.sideUp, length: f.sideLen + 2 * ext, section: crownSec },
    })
    push(ctx, {
      id: 'flash-base-' + tag, name: label + ' — cokół ' + tag, layer: 'flashings', stage: 9, material: 'flashing', color: f.color,
      explode: mul(out as Vec3, 1.0), confidence: conf, bom: { lengthM: f.W + 2 * wrap(tag) },
      geometry: f.mitre
        ? { start: [x, f.y0, -f.W / 2], axis: [0, 0, 1], u: out as Vec3, v: [0, 1, 0], length: f.W, section: baseSec, mitre: [-1, -1] }
        : { start: [x, f.y0, -f.W / 2 - wrap(tag)], axis: [0, 0, 1], u: out as Vec3, v: [0, 1, 0], length: f.W + 2 * wrap(tag), section: baseSec },
    })
  }
}

type CassCtx = { L: number; W: number; y0: number; yFloorTop: number; yTopF: number; yTopB: number; t: number; walls: WallDef[]; openings: OpeningPlacement[]; color: string }

/** Kasetony poziome (pas korpusu 240, attyka 2 × 330, fuga 20) przykręcane przez obrzeże do płyty — lico = głębokość tacy. */
function addCassettes(ctx: Ctx, k: CassCtx) {
  const gap = m(PHYS.cassette.gap)
  const th = m(PHYS.cassette.thickness)
  const off = th // kaseton leży na płycie (wkręty przez obrzeże), lico = głębokość tacy
  const band = m(PHYS.cassette.bodyBandHeight)
  const attic = m(PHYS.cassette.atticRowHeight)
  for (const side of ['front', 'back'] as const) {
    const z = side === 'front' ? k.W / 2 - k.t + off : -k.W / 2 + k.t - off
    const out: Vec3 = side === 'front' ? [0, 0, 1] : [0, 0, -1]
    // pełna elewacja kasetonowa: attyka do góry górnej ramy, rama zasłonięta (galeria: 025–029, 093–095, 110, 157);
    // przy gołej płycie (bez kasetonów) kątownik zostaje widoczny
    const yTop = (side === 'front' ? k.yTopF : k.yTopB) + m(PHYS.system1.angleLeg)
    const x0 = -k.L / 2 - off + k.t
    const len = k.L + 2 * off - 2 * k.t
    const atticStart = yTop - 2 * attic
    const rows: Array<[number, number]> = []
    const bodyRows = Math.max(1, Math.round((atticStart - k.y0) / band))
    const pitch = (atticStart - k.y0) / bodyRows
    for (let r = 0; r < bodyRows; r++) rows.push([k.y0 + r * pitch, k.y0 + (r + 1) * pitch])
    rows.push([atticStart, atticStart + attic], [atticStart + attic, yTop])
    const wall = k.walls.find((w) => w.side === side)!
    const ops = k.openings.filter((o) => o.wall === side).map((o) => toWallOpening(o, wall))
    rows.forEach(([ya, yb], r) => {
      // pas przerywany tylko otworami; s — współrzędna od lewego końca kasetonów (x0), otwory przeliczone z układu ściany
      const cuts = ops
        .filter((o) => Math.min(yb, k.yFloorTop + o.y1) - Math.max(ya, k.yFloorTop + o.y0) > 0.001)
        .map((o) => (side === 'front' ? [o.a + off, o.b + off] : [len - off - o.b, len - off - o.a]) as [number, number])
      let cursor = 0
      const segs: Array<[number, number]> = []
      for (const [ca, cb] of cuts.sort((p, q) => p[0] - q[0])) {
        if (ca > cursor) segs.push([cursor, ca])
        cursor = Math.max(cursor, cb)
      }
      if (cursor < len) segs.push([cursor, len])
      segs.forEach(([sa, sb], s) => {
        if (sb - sa < 0.03) return
        push(ctx, {
          id: `cassette-${side}-${r}-${s}`, name: 'Kaseton elewacyjny', layer: 'decor', stage: 10, material: 'cassette', color: k.color,
          explode: mul(out, 2.2), confidence: 'MEDIUM',
          geometry: {
            start: [x0, 0, z], axis: mul(out, -1) as Vec3, u: [1, 0, 0], v: [0, 1, 0], length: th,
            section: rect(sa + (sa > 0 ? gap / 2 : 0), ya + gap / 2, sb - (sb < len ? gap / 2 : 0), yb - gap / 2),
          },
        })
      })
    })
  }
}

/**
 * Deska elewacyjna pozioma (wariant pod obróbkę „na kwadraty”): lico deski w płaszczyźnie lica obróbki (25 mm od ściany).
 * Grubość deski i sposób mocowania — niepotwierdzone (LOW).
 */
function addBoards(ctx: Ctx, k: CassCtx) {
  const h = m(PHYS.board.height)
  const gap = m(PHYS.board.gap)
  const off = m(PHYS.system1.flashingOffsetSquares)
  const th = 0.024
  const face = m(PHYS.system1.crownFlashingFace)
  for (const side of ['front', 'back'] as const) {
    const out: Vec3 = side === 'front' ? [0, 0, 1] : [0, 0, -1]
    const zFace = side === 'front' ? k.W / 2 - k.t + off : -k.W / 2 + k.t - off
    const yTop = (side === 'front' ? k.yTopF : k.yTopB) + m(PHYS.system1.angleLeg) - face
    const wall = k.walls.find((w) => w.side === side)!
    const ops = k.openings.filter((o) => o.wall === side).map((o) => toWallOpening(o, wall))
    const x0 = -k.L / 2 + k.t
    const len = k.L - 2 * k.t
    let r = 0
    for (let ya = k.y0 + m(PHYS.system1.baseFlashingFace); ya + h <= yTop + 1e-6; ya += h + gap, r++) {
      const yb = ya + h
      const cuts = ops
        .filter((o) => Math.min(yb, k.yFloorTop + o.y1) - Math.max(ya, k.yFloorTop + o.y0) > 0.001)
        .map((o) => (side === 'front' ? [o.a, o.b] : [len - o.b, len - o.a]) as [number, number])
        .sort((p, q) => p[0] - q[0])
      let cursor = 0
      const segs: Array<[number, number]> = []
      for (const [ca, cb] of cuts) {
        if (ca > cursor) segs.push([cursor, ca])
        cursor = Math.max(cursor, cb)
      }
      if (cursor < len) segs.push([cursor, len])
      segs.forEach(([sa, sb], s) => {
        if (sb - sa < 0.03) return
        push(ctx, {
          id: `board-${side}-${r}-${s}`, name: 'Deska elewacyjna', layer: 'decor', stage: 10, material: 'cassette', color: '#8a6446',
          explode: mul(out, 2.2), confidence: 'LOW',
          geometry: { start: [x0, 0, zFace], axis: mul(out, -1) as Vec3, u: [1, 0, 0], v: [0, 1, 0], length: th, section: rect(sa, ya, sb, yb) },
        })
      })
    }
  }
}
