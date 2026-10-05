import { BufferGeometry, Matrix4, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { runBasis, runLocalGeometry } from '../construction/geometry'
import type { Part, RunGeometry } from '../construction/types'

/**
 * RENDERER WARSTW (E0): MODEL CZĘŚCI → warstwa → grupa (materiał, cień) → scalona geometria albo InstancedMesh → three.js.
 * Zamiast „1 część = 1 <mesh>” — jedna siatka na grupę: mniej wywołań rysowania w każdym przebiegu (obraz, cień, AO).
 */
export type RenderLayer = 'STRUCTURE' | 'PIR' | 'FACADE' | 'JOINERY' | 'TRIMS' | 'ROOF' | 'FLOOR' | 'TECHNICAL'

export function renderLayerOf(p: Part): RenderLayer {
  switch (p.layer) {
    case 'steel': case 'topFrame': return 'STRUCTURE'
    case 'walls': return 'PIR'
    case 'joinery': return 'JOINERY'
    case 'flashings': return 'TRIMS'
    case 'roof': return 'ROOF'
    case 'floor': return 'FLOOR'
    case 'decor': return 'FACADE'
    case 'fasteners': return 'TECHNICAL'
  }
}

export type PartLook = { material: Material; castShadow: boolean; receiveShadow?: boolean }

/** Ta sama geometria (przekrój po przesunięciu do zera, długość, uciosy, odbicie bazy) → można instancjonować. */
function signature(g: RunGeometry, flip: boolean) {
  const du = Math.min(...g.section.map((p) => p[0]))
  const dvRaw = g.section.map((p) => (flip ? -p[1] : p[1]))
  const dv = Math.min(...dvRaw)
  const r = (x: number) => Math.round(x * 1e5)
  const sec = g.section.map((p, i) => r(p[0] - du) + ',' + r(dvRaw[i] - dv)).join(';')
  const holes = (g.holes ?? []).map((h) => h.map((p) => r(p[0] - du) + ',' + r((flip ? -p[1] : p[1]) - dv)).join(';')).join('|')
  // cień i UV zależą od położenia przekroju — wchodzą do sygnatury (inne UV = inna geometria)
  const extras = JSON.stringify([g.shade ?? null, g.uvTransform ?? null])
  return { key: [sec, holes, r(g.length), g.mitre?.join(',') ?? '', flip, extras].join('#'), du, dv }
}

/**
 * Minimalna liczba powtórzeń, od której bryła idzie do InstancedMesh (poniżej — scalenie z resztą grupy).
 * Scalenie = 1 wywołanie rysowania na grupę; każda sygnatura instancji to osobne wywołanie — instancje opłacają się
 * dopiero przy licznych powtórzeniach (wkręty, żebra), nie przy kilku–kilkunastu kasetonach jednego rozmiaru
 * (galeria-207: próg 4 → 48 siatek elewacji, scalenie → kilka).
 */
const INSTANCE_MIN = 24

export type Batch =
  | { kind: 'merged'; key: string; layer: RenderLayer; geometry: BufferGeometry; look: PartLook; parts: string[] }
  | { kind: 'instanced'; key: string; layer: RenderLayer; geometry: BufferGeometry; matrices: Matrix4[]; look: PartLook; parts: string[] }

export function buildBatches(parts: Part[], lookOf: (p: Part) => PartLook): Batch[] {
  type Item = { part: Part; look: PartLook; flip: boolean; matrix: Matrix4; sig: ReturnType<typeof signature> }
  const groups = new Map<string, Item[]>()
  for (const part of parts) {
    const look = lookOf(part)
    const { matrix, flip } = runBasis(part.geometry)
    const sig = signature(part.geometry, flip)
    const layer = renderLayerOf(part)
    // części z kolorem wierzchołków (cień w zagłębieniu) nie scalają się z częściami bez niego (inne atrybuty)
    const key = layer + '|' + look.material.uuid + '|' + look.castShadow + '|' + (look.receiveShadow ?? true) + '|' + (part.geometry.shade ? 'c' : '')
    const list = groups.get(key) ?? []
    list.push({ part, look, flip, matrix, sig })
    groups.set(key, list)
  }
  const out: Batch[] = []
  for (const [key, items] of groups) {
    const layer = renderLayerOf(items[0].part)
    const look = items[0].look
    // powtarzalne bryły w grupie → instancje; reszta → jedna scalona geometria
    const bySig = new Map<string, Item[]>()
    for (const it of items) bySig.set(it.sig.key, [...(bySig.get(it.sig.key) ?? []), it])
    const rest: Item[] = []
    for (const [sk, same] of bySig) {
      if (same.length < INSTANCE_MIN) {
        rest.push(...same)
        continue
      }
      const first = same[0]
      const geometry = runLocalGeometry(first.part.geometry, first.flip, first.sig.du, first.sig.dv)
      const matrices = same.map((it) => it.matrix.clone().multiply(new Matrix4().makeTranslation(it.sig.du, it.sig.dv, 0)))
      out.push({ kind: 'instanced', key: key + '|' + sk.length + '|' + out.length, layer, geometry, matrices, look, parts: same.map((s) => s.part.id) })
    }
    if (rest.length) {
      const geos = rest.map((it) => {
        const g = runLocalGeometry(it.part.geometry, it.flip)
        g.applyMatrix4(it.matrix)
        g.clearGroups()
        return g
      })
      const geometry = geos.length === 1 ? geos[0] : mergeGeometries(geos, false)
      if (geos.length > 1) geos.forEach((g) => g.dispose())
      out.push({ kind: 'merged', key, layer, geometry, look, parts: rest.map((r) => r.part.id) })
    }
  }
  return out
}

