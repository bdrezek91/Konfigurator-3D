import type { Confidence } from '../physical/spec'
import { GENERIC_ALU_52 as G } from './generic-aluminium-52'

/**
 * Biblioteka przekrojów 2D. Każdy przekrój: wielokąt [u, v] w mm, materiał, punkt bazowy, orientacja, parametry.
 * Geometrię robi `buildRunGeometry` (Shape → ExtrudeGeometry wzdłuż osi elementu, z uciosem na końcach).
 *
 * Orientacja (wszystkie profile stolarki): u — w poprzek lica, w stronę światła otworu; v — od tyłu (wnętrze) do lica.
 * Punkt bazowy:
 *  - 'outer-edge' — u = 0 na zewnętrznej krawędzi profilu (ościeżnica, skrzydło, próg),
 *  - 'sightline'  — u = 0 na linii widoczności szyby (listwa, uszczelki, przylga drzwi): u < 0 = w stronę profilu,
 *  - 'axis'       — u = 0 w osi profilu (słupek, ślemię),
 *  - 'corner'     — narożnik zewnętrzny kątownika (konstrukcja).
 */
export type Poly = Array<[number, number]>
export type SectionMaterial = 'frame' | 'gasket' | 'steel' | 'flashing'
export type Section = {
  id: string
  poly: Poly
  material: SectionMaterial
  anchor: 'outer-edge' | 'sightline' | 'axis' | 'corner'
  orientation: string
  params: Record<string, number>
  confidence: Confidence
  /** wymiary nie z karty producenta (generic-aluminium-52) — ASSUMPTION */
  assumption?: boolean
}

const ALU = 'u: w poprzek lica → światło otworu; v: tył → lico [mm]'
const glassV0 = G.glazing.beadDepth + G.glazing.gasketThickness
const glassV1 = glassV0 + G.glazing.unit
const lipBack = glassV1 + G.glazing.gasketThickness

/** Położenie pakietu szybowego w głębokości profilu szklonego (v od tyłu profilu) [mm]. */
export const GLASS_DEPTH: [number, number] = [glassV0, glassV1]

/**
 * Profil szklony (ościeżnica FIX, skrzydło): część zewnętrzna pełnej głębokości, stopień do przylgi, przylga przed szybą,
 * wrąb na pakiet (dno 5 mm za krawędzią szyby). Listwa i uszczelki są osobnymi przekrojami (glazingBead, seal*).
 */
function glazedBody(id: string, face: number, depth: number, outerFace: number, step: number): Section {
  const r = G.glazing.rebate
  const front = depth - step
  return {
    id, material: 'frame', anchor: 'outer-edge', orientation: ALU, confidence: 'LOW', assumption: true,
    params: { face, depth, outerFace, step, rebate: r, lipBack, lipFront: front },
    poly: [[0, 0], [face - r, 0], [face - r, lipBack], [face, lipBack], [face, front], [outerFace, front], [outerFace, depth], [0, depth]],
  }
}

export const aluminiumFrame = (face: number = G.frame.face, depth: number = G.frame.depth): Section =>
  glazedBody('aluminiumFrame' + (face === G.frame.face && depth === G.frame.depth ? '' : '-' + face + 'x' + depth), face, depth,
    Math.min(G.frame.outerFace, face - G.glazing.rebate - 2), G.frame.step)

/** Ościeżnica FIX po stronie styku z sąsiednią ramą: ½ słupka (część pełnej głębokości = ½ środka słupka). */
export const aluminiumFrameCoupled = (): Section =>
  glazedBody('aluminiumFrameCoupled', G.coupling.face, G.frame.depth, G.coupling.face - G.glazing.rebate, G.frame.step)

/** Skrzydło drzwi: ten sam układ co ościeżnica FIX, inna szerokość lica (bok / góra / cokół). */
export const aluminiumSash = (face: number, depth: number = G.sash.depth): Section =>
  glazedBody('aluminiumSash-' + face + (depth === G.sash.depth ? '' : 'x' + depth), face, depth, Math.min(G.sash.outerFace, face - G.glazing.rebate - 2), G.sash.step)

/** Ościeżnica drzwi: bez wrębu na szybę; przylga skrzydła jest osobnym przekrojem (doorStop) — kończy się na progu. */
export function aluminiumDoorFrame(coupled = false, faceIn: number = G.doorFrame.face, depth: number = G.doorFrame.depth): Section {
  const { step } = G.doorFrame
  // po stronie styku z sąsiednią ramą: lico ½ słupka, część pełnej głębokości jak w ościeżnicy FIX sprzężonej
  const face = coupled ? G.coupling.face : faceIn
  const outerFace = coupled ? G.coupling.face - G.glazing.rebate : Math.min(G.doorFrame.outerFace, Math.round(face * 0.6))
  const std = faceIn === G.doorFrame.face && depth === G.doorFrame.depth
  return {
    id: (coupled ? 'aluminiumDoorFrameCoupled' : 'aluminiumDoorFrame') + (std ? '' : '-' + face + 'x' + depth), material: 'frame', anchor: 'outer-edge', orientation: ALU, confidence: 'LOW', assumption: true,
    params: { face, depth, outerFace, step },
    poly: [[0, 0], [face, 0], [face, depth - step], [outerFace, depth - step], [outerFace, depth], [0, depth]],
  }
}

/** Listwa oporowa skrzydła (od wnętrza, za linią widoczności ościeżnicy) i uszczelka przylgowa. */
export function doorStop(): Section {
  const { stopWidth: w, stopDepth: d } = G.doorFrame
  return {
    id: 'doorStop', material: 'frame', anchor: 'sightline', orientation: ALU, confidence: 'LOW', assumption: true, params: { width: w, depth: d },
    poly: [[0, 0], [w, 0], [w, d], [0, d]],
  }
}
export function doorStopSeal(): Section {
  const { stopWidth: w, stopDepth: d } = G.doorFrame
  return {
    id: 'doorStopSeal', material: 'gasket', anchor: 'sightline', orientation: ALU, confidence: 'LOW', assumption: true, params: { thickness: 2 },
    poly: [[G.sash.gap + 1, d], [w - 1, d], [w - 1, d + 2], [G.sash.gap + 1, d + 2]],
  }
}

/** Słupek / ślemię: szklony z obu stron, część środkowa pełnej głębokości, przylgi po bokach. */
export function mullion(): Section {
  const { face: M, depth: D, step } = G.mullion
  const r = G.glazing.rebate
  const h = M / 2
  const c = h - r
  return {
    id: 'mullion', material: 'frame', anchor: 'axis', orientation: ALU, confidence: 'LOW', assumption: true, params: { face: M, depth: D },
    poly: [
      [-c, 0], [c, 0], [c, lipBack], [h, lipBack], [h, D - step], [c, D - step], [c, D],
      [-c, D], [-c, D - step], [-h, D - step], [-h, lipBack], [-c, lipBack],
    ],
  }
}
export const transom = (): Section => ({ ...mullion(), id: 'transom' })

/** Listwa przyszybowa (od wnętrza), lico na linii widoczności. */
export function glazingBead(): Section {
  const r = G.glazing.rebate
  const d = G.glazing.beadDepth
  return {
    id: 'glazingBead', material: 'frame', anchor: 'sightline', orientation: ALU, confidence: 'LOW', assumption: true, params: { width: r, depth: d },
    // skos 2 mm na licu listwy (listwa profilowana, nie płaska deska)
    poly: [[-r, 0], [0, 0], [0, d - 2], [-2, d], [-r, d]],
  }
}

/** Uszczelki EPDM po obu stronach szyby; wystają 1 mm poza linię widoczności (czarna linia przy szybie). */
function seal(id: string, v0: number): Section {
  const { gasketThickness: t, gasketWidth: w, gasketReveal: e } = G.glazing
  return {
    id, material: 'gasket', anchor: 'sightline', orientation: ALU, confidence: 'LOW', assumption: true, params: { thickness: t, width: w },
    poly: [[e - w, v0], [e, v0], [e, v0 + t], [e - w, v0 + t]],
  }
}
export const sealInner = () => seal('sealInner', G.glazing.beadDepth)
export const sealOuter = () => seal('sealOuter', glassV1)

/** Próg niski: u — wysokość nad posadzką, v — głębokość (od tyłu ościeżnicy), nos ze spadkiem na zewnątrz. */
export function threshold(depth = G.doorFrame.depth): Section {
  const { height: h, back, nose, noseHeight } = G.threshold
  return {
    id: 'threshold', material: 'frame', anchor: 'outer-edge', orientation: 'u: w górę od posadzki; v: tył → zewnątrz [mm]', confidence: 'LOW', assumption: true,
    params: { height: h, back, nose },
    poly: [[0, -back], [0, depth + nose], [noseHeight, depth + nose], [h, depth - 10], [h, -back]],
  }
}

/** Parapet zewnętrzny z blachy: półka ze spadkiem i kapinosem (galeria-163 — nieużywany, brak na zdjęciu). */
export function sill(): Section {
  const { projection: p, thickness: t, drip } = G.sill
  return {
    id: 'sill', material: 'flashing', anchor: 'outer-edge', orientation: 'u: w dół; v: tył → zewnątrz [mm]', confidence: 'LOW', assumption: true,
    params: { projection: p, thickness: t, drip },
    poly: thickenPath([[0, 0], [p, 4], [p, 4 + drip]], t),
  }
}

/** Kątownik równoramienny (konstrukcja Systemu 1) — narożnik zewnętrzny w (0, 0), ramiona wzdłuż +u i +v. */
export function angle(a: number, t: number): Section {
  return {
    id: 'angle-' + a + 'x' + t, material: 'steel', anchor: 'corner', orientation: 'u, v: ramiona kątownika [mm]', confidence: 'HIGH',
    params: { leg: a, thickness: t },
    poly: [[0, 0], [a, 0], [a, t], [t, t], [t, a], [0, a]],
  }
}

/** Linia środkowa obróbki (blacha gięta) → wielokąt o grubości blachy (połowa po każdej stronie; normalna z sąsiednich punktów).
 *  Jednostki jak w `path` (obróbki Systemu 1: metry). */
export function thickenPath(path: Poly, th: number): Poly {
  const left: Poly = []
  const right: Poly = []
  for (let i = 0; i < path.length; i++) {
    const p = path[Math.max(0, i - 1)]
    const n = path[Math.min(path.length - 1, i + 1)]
    const dx = n[0] - p[0]
    const dy = n[1] - p[1]
    const l = Math.hypot(dx, dy) || 1
    const nx = -dy / l
    const ny = dx / l
    left.push([path[i][0] + nx * th / 2, path[i][1] + ny * th / 2])
    right.push([path[i][0] - nx * th / 2, path[i][1] - ny * th / 2])
  }
  return [...left, ...right.reverse()]
}

/**
 * Bok tacy kasetonu: obrzeże (do środka albo w fugę) → bok → gięcie R → lico na szerokość R (dalej lico tacy osobno).
 * Punkt bazowy 'outer-edge': u = 0 na zewnętrznej powierzchni boku, v = 0 na licu płyty.
 */
export function cassetteReturn(p: { depth: number; sheet: number; bendRadius: number; bendSegments: number; flange: number }, flangeOut: boolean): Section {
  const { depth: D, sheet: t, bendRadius: R, bendSegments: n, flange: fl } = p
  const path: Poly = [[flangeOut ? -fl : fl, t / 2], [t / 2, t / 2], [t / 2, D - R]]
  // łuk gięcia: środek (R, D − R), promień linii środkowej R − t/2
  for (let i = 1; i <= n; i++) {
    const a = Math.PI - (Math.PI / 2) * (i / n)
    path.push([R + (R - t / 2) * Math.cos(a), D - R + (R - t / 2) * Math.sin(a)])
  }
  return {
    id: 'cassetteReturn', material: 'flashing', anchor: 'outer-edge', orientation: 'u: od krawędzi tacy do środka; v: płyta → lico [mm]',
    confidence: 'LOW', assumption: true, params: { depth: D, sheet: t, bendRadius: R, flange: fl, flangeOut: flangeOut ? 1 : 0 },
    poly: thickenPath(path, t),
  }
}

/** Przekrój [mm] → [m]; opcjonalne przesunięcie w u (np. przekrój „sightline” w układzie profilu). */
export function toMeters(poly: Poly, du = 0, dv = 0): Poly {
  return poly.map(([u, v]) => [(u + du) / 1000, (v + dv) / 1000])
}
