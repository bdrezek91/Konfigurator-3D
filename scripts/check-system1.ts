/**
 * Regresja geometrii Systemu 1 dla wszystkich presetów i wariantów wykończenia.
 * Sprawdza: poprawność liczb, obrys ramy, kolizje elementów nośnych, oparcie dachu, kontrole produkcji,
 * zgodność z obrysem używanym przez UI/kamerę (envelope), otwory w ścianach.
 * Uruchom: npm run check:system1   (kod wyjścia 1 przy błędzie)
 */
import { buildSystem1, type FinishBySide } from '../src/construction/system1/build'
import { finishForConfig } from '../src/construction/geometry'
import { buildComponentModel, geometryOf } from '../src/components'
import { m, PHYS } from '../src/physical/spec'
import { PRESETS } from '../src/presets'
import { envelope } from '../src/scene/geometry'
import type { Part, Vec3 } from '../src/construction/types'
import type { FinishVariant } from '../src/construction/types'
import { PANEL_THICKNESS_M } from '../src/types'

type Box = { min: Vec3; max: Vec3 }
const EPS = 0.0005 // 0,5 mm

function vertices(p: Part): Vec3[] {
  const g = p.geometry
  const out: Vec3[] = []
  for (const s of [0, g.length]) {
    for (const [u, v] of g.section) {
      out.push([0, 1, 2].map((i) => g.start[i] + g.axis[i] * s + g.u[i] * u + g.v[i] * v) as Vec3)
    }
  }
  return out
}
function box(p: Part): Box {
  const vs = vertices(p)
  return {
    min: [0, 1, 2].map((i) => Math.min(...vs.map((v) => v[i]))) as Vec3,
    max: [0, 1, 2].map((i) => Math.max(...vs.map((v) => v[i]))) as Vec3,
  }
}
const aligned = (v: Vec3) => v.filter((x) => Math.abs(x) > 1e-9).length === 1
const isAligned = (p: Part) => aligned(p.geometry.axis) && aligned(p.geometry.u) && aligned(p.geometry.v)
function overlap(a: Box, b: Box) {
  return [0, 1, 2].map((i) => Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i])) as Vec3
}
function polyArea(s: Array<[number, number]>) {
  let A = 0
  for (let i = 0; i < s.length; i++) {
    const [x1, y1] = s[i]
    const [x2, y2] = s[(i + 1) % s.length]
    A += x1 * y2 - x2 * y1
  }
  return Math.abs(A) / 2
}
/** Kątownik to L — prostopadłościan obwiedni zawyża kolizje; dzielimy go na dwa ramiona. */
function solids(p: Part): Box[] {
  if (p.material !== 'steel' || p.geometry.section.length !== 6) return [box(p)]
  const a = m(PHYS.system1.angleLeg)
  const t = m(PHYS.system1.angleThickness)
  const legs: Array<Array<[number, number]>> = [[[0, 0], [a, 0], [a, t], [0, t]], [[0, 0], [t, 0], [t, a], [0, a]]]
  return legs.map((section) => box({ ...p, geometry: { ...p.geometry, section } }))
}

type Issue = { preset: string; finish: string; msg: string }
const issues: Issue[] = []
const notes: string[] = []
let runs = 0
const steelNodes = new Set<string>()

for (const preset of PRESETS) {
  const cfg = preset.config
  if (cfg.construction !== 'angle50') {
    notes.push(`${preset.id}: konstrukcja „${cfg.construction}” — poza Systemem 1 (model uproszczony, bez kontroli)`)
    continue
  }
  const auto = finishForConfig(cfg)
  const variants: Array<[string, FinishVariant | FinishBySide]> = [['auto', auto], ['bare', 'bare'], ['squares', 'squares'], ['cassette', 'cassette']]
  for (const [fname, fin] of variants) {
    runs++
    const err = (msg: string) => issues.push({ preset: preset.id, finish: fname, msg })
    const model = buildSystem1(cfg, fin)
    const L = cfg.length
    const W = cfg.width
    const y0 = model.levels.yFrame

    // 1. liczby i geometria niezdegenerowana
    const ids = new Set<string>()
    for (const p of model.parts) {
      if (ids.has(p.id)) err(`zduplikowane id części: ${p.id}`)
      ids.add(p.id)
      const g = p.geometry
      const nums = [...g.start, ...g.axis, ...g.u, ...g.v, g.length, ...g.section.flat()]
      if (nums.some((x) => !Number.isFinite(x))) err(`${p.id}: liczba nieskończona/NaN`)
      if (g.length <= 0) err(`${p.id}: długość ≤ 0 (${g.length})`)
      if (g.section.length < 3 || polyArea(g.section) < 1e-9) err(`${p.id}: zdegenerowany przekrój`)
      // baza (axis, u, v) ortogonalna — inaczej wyciągnięcie jest skośne
      const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
      if (Math.abs(dot(g.axis, g.u)) > 1e-6 || Math.abs(dot(g.axis, g.v)) > 1e-6 || Math.abs(dot(g.u, g.v)) > 1e-6) err(`${p.id}: baza nieortogonalna`)
    }

    // 2. obrys: konstrukcja nośna w obrysie ramy L × W, nad spodem ramy
    const structural = model.parts.filter((p) => ['steel', 'floor', 'walls', 'roof', 'topFrame'].includes(p.layer) && !p.id.startsWith('roof-rib'))
    for (const p of structural) {
      const b = box(p)
      // boczne kątowniki górnej ramy leżą na spadku: ramię prostopadłe do dachu wychodzi za obrys o a·sin(spadek) na końcu
      // (w produkcji koniec docięty pionowo / zeszlifowany na spoinie) — dopuszczone jawnie
      const tilt = p.layer === 'topFrame' ? m(PHYS.system1.angleLeg) * Math.max(Math.abs(p.geometry.u[2]), Math.abs(p.geometry.v[2]) < 1 ? Math.abs(p.geometry.v[2]) : 0) : 0
      if (b.min[0] < -L / 2 - EPS || b.max[0] > L / 2 + EPS || b.min[2] < -W / 2 - EPS - tilt || b.max[2] > W / 2 + EPS + tilt || b.min[1] < y0 - EPS) {
        err(`${p.id}: wychodzi poza obrys ramy (${b.min.map((x) => x.toFixed(4))} … ${b.max.map((x) => x.toFixed(4))})`)
      }
    }
    // obróbki i elewacja: tylko na zewnątrz, nie dalej niż 80 mm od obrysu
    for (const p of model.parts.filter((p) => p.layer === 'flashings' || p.layer === 'decor')) {
      const b = box(p)
      const out = Math.max(-L / 2 - b.min[0], b.max[0] - L / 2, -W / 2 - b.min[2], b.max[2] - W / 2)
      if (out > 0.08) err(`${p.id}: wystaje ${Math.round(out * 1000)} mm poza obrys`)
    }

    // 3. kolizje nośnych (części osiowe; L rozbite na ramiona). Styk dopuszczalny, przenikanie > 0,5 mm nie.
    const solid = structural.filter(isAligned).filter((p) => p.material !== 'glass' && !p.id.startsWith('joinery-'))
    const sb = solid.map((p) => ({ p, boxes: solids(p) }))
    for (let i = 0; i < sb.length; i++) {
      for (let j = i + 1; j < sb.length; j++) {
        const A = sb[i]
        const B = sb[j]
        // warstwy tej samej płyty: sąsiadują z definicji
        const base = (id: string) => id.replace(/-(outer|core|inner)$/, '')
        if (base(A.p.id) === base(B.p.id)) continue
        // stal × stal w narożach: węzeł spawany (kątowniki zachodzą na siebie, bez cięcia pod 45°) — liczone osobno
        if (A.p.material === 'steel' && B.p.material === 'steel') {
          if (A.boxes.some((a) => B.boxes.some((b) => overlap(a, b).every((x) => x > EPS)))) steelNodes.add(`${A.p.id}×${B.p.id}`)
          continue
        }
        for (const a of A.boxes) for (const b of B.boxes) {
          const o = overlap(a, b)
          if (o.every((x) => x > EPS)) {
            err(`kolizja ${A.p.id} × ${B.p.id}: ${o.map((x) => Math.round(x * 1000 * 10) / 10).join(' × ')} mm`)
          }
        }
      }
    }

    // 4. dach: spód płyty dachowej oparty na górze ściany przedniej i tylnej (lico zewn.), bez przenikania lica wewnętrznego
    const tw = PANEL_THICKNESS_M[cfg.wallPanel]
    const lv = model.levels
    const slope = (cfg.frontHeight - cfg.backHeight) / (W - 2 * m(PHYS.system1.angleThickness))
    const intoRoofMm = Math.abs(slope) * tw * 1000
    if (intoRoofMm > 0.5) {
      notes.push(`spadek ${Math.round(slope * 1000)}‰: ściana przednia/tylna wchodzi w spadek dachu o ${intoRoofMm.toFixed(1)} mm przy licu wewnętrznym (krawędź płyty prostokątna, dach skośny) — w produkcji docinane/uszczelniane`)
    }
    if (Math.abs(lv.wallTopFront - (lv.yFloorTop + cfg.frontHeight)) > 1e-6) err('poziom góry ściany przedniej niezgodny z wysokością w świetle')

    // 4b. korona zakrywa krawędź dachu: dół korony przód/tył poniżej góry ściany (inaczej widać rdzeń PIR płyty dachowej)
    for (const [side, wallTop] of [['front', lv.wallTopFront], ['back', lv.wallTopBack]] as const) {
      const cr = model.parts.find((p) => p.id === 'flash-crown-' + side)
      if (cr && box(cr).min[1] > wallTop - 0.005) err(`korona ${side}: dół ${Math.round(box(cr).min[1] * 1000)} mm nad górą ściany ${Math.round(wallTop * 1000)} mm — odsłonięta krawędź dachu`)
    }

    // 5. kontrole z produkcji
    for (const d of model.derived) if (d.check && !d.check.ok) err(`kontrola „${d.label}” = ${d.valueMm}: oczekiwane ${d.check.expected}`)

    // 6. zgodność z obrysem używanym przez UI, kamerę i elewację (envelope)
    const env = envelope(cfg)
    const hModelF = lv.postTopF - lv.yFrame
    const hModelB = lv.postTopB - lv.yFrame
    if (Math.abs(env.outerFront - hModelF) > 0.001 || Math.abs(env.outerBack - hModelB) > 0.001) {
      err(`envelope ≠ model: front ${Math.round(env.outerFront * 1000)} vs ${Math.round(hModelF * 1000)}, tył ${Math.round(env.outerBack * 1000)} vs ${Math.round(hModelB * 1000)} mm`)
    }

    // 7. otwory: w ścianie, nad podłogą i pod dachem
    const geo = geometryOf(cfg)
    for (const o of geo.openings) {
      const span = o.wall === 'front' || o.wall === 'back' ? L - 2 * 0.004 : W - 2 * 0.004 - 2 * tw
      const a = o.center - o.width / 2 + (o.wall === 'front' || o.wall === 'back' ? L / 2 : W / 2)
      const b = a + o.width
      const lo = o.wall === 'front' || o.wall === 'back' ? 0.004 : 0.004 + tw
      if (a < lo - EPS || b > lo + span + EPS) err(`otwór ${o.kind} (${o.wall}, środek ${o.center}) poza ścianą`)
      const sill = o.sill ?? (o.kind.startsWith('door-') ? 0 : 0.08)
      const hWall = o.wall === 'back' ? cfg.backHeight : o.wall === 'front' ? cfg.frontHeight : Math.min(cfg.frontHeight, cfg.backHeight)
      if (sill + o.height > hWall + EPS) err(`otwór ${o.kind} (${o.wall}) wyższy niż ściana: ${Math.round((sill + o.height) * 1000)} > ${Math.round(hWall * 1000)} mm`)
    }

    // 8. kompletność warstw
    for (const layer of ['steel', 'floor', 'walls', 'roof', 'topFrame', 'flashings']) {
      if (!model.parts.some((p) => p.layer === layer)) err(`brak warstwy ${layer}`)
    }
    if (model.parts.filter((p) => p.id.startsWith('post-')).length !== 4) err('liczba słupów ≠ 4')

    // 9. BOM (komponenty) liczony z tego samego modelu: liczby płyt i długości stali muszą się zgadzać
    if (fname === 'auto') {
      const comps = buildComponentModel(cfg).components
      const count = (cat: string) => comps.filter((x) => x.category === cat).length
      const wallPanels = new Set(model.parts.filter((p) => p.layer === 'walls' && p.material === 'pirCore').map((p) => p.id.replace(/-\d+-core$/, ''))).size
      const pairs: Array<[string, number, number]> = [
        ['wall-panels', count('wall-panels'), wallPanels],
        ['floor-panels', count('floor-panels'), model.parts.filter((p) => p.layer === 'floor' && p.material === 'pirCore').length],
        ['roof-panels', count('roof-panels'), model.parts.filter((p) => p.layer === 'roof' && p.material === 'pirCore').length],
        ['stal', count('floor-frame') + count('corner-posts') + count('roof-beams'), model.parts.filter((p) => p.material === 'steel' && !p.id.startsWith('lift-eye-')).length],
        ['ucha', comps.filter((x) => x.id.startsWith('lift-eye-')).length, model.parts.filter((p) => /^lift-eye-(FL|FR|BL|BR)$/.test(p.id)).length],
      ]
      for (const [name, bom, mod] of pairs) if (bom !== mod) err(`BOM ${name}: ${bom} ≠ model ${mod}`)
      const steelBom = comps.filter((x) => ['floor-frame', 'corner-posts', 'roof-beams'].includes(x.category)).reduce((s, x) => s + x.dimensions.lengthMm, 0)
      const steelModel = model.parts.filter((p) => p.material === 'steel' && !p.id.startsWith('lift-eye-')).reduce((s, p) => s + p.geometry.length * 1000, 0)
      if (Math.abs(steelBom - steelModel) > 10) err(`BOM stal ${Math.round(steelBom)} mm ≠ model ${Math.round(steelModel)} mm`)
    }
  }
}

const uniqueNotes = [...new Set(notes)]
uniqueNotes.push(`węzły spawane stal × stal (nakładanie w narożach, uproszczenie geometrii): ${steelNodes.size} par`)
console.log(`System 1 — ${runs} przebiegów (${PRESETS.length} presetów × warianty wykończenia)`)
for (const n of uniqueNotes) console.log('  uwaga: ' + n)
if (issues.length) {
  const grouped = new Map<string, string[]>()
  for (const i of issues) {
    const k = i.msg
    grouped.set(k, [...(grouped.get(k) ?? []), `${i.preset}/${i.finish}`])
  }
  console.log(`BŁĘDY: ${issues.length} (${grouped.size} unikalnych)`)
  for (const [msg, where] of [...grouped].slice(0, 60)) console.log(`  ✗ ${msg}  [${where.slice(0, 4).join(', ')}${where.length > 4 ? ` +${where.length - 4}` : ''}]`)
  process.exit(1)
}
console.log('OK — brak błędów')
