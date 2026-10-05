import { Html } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import { Plane, Vector3, type Camera, type Group } from 'three'
import { BOARD_KINDS, cassetteWallLayout, geometryOf, MIN_CASSETTE, wallNormal, wallPosition } from '../../components'
import { m, PHYS } from '../../physical/spec'
import { PANEL_THICKNESS_M, type CassetteEdits, type DecorPlacement, type PavilionConfig, type WallSide } from '../../types'
import { CUSTOM_PROJECT, editableGeometry } from '../../ui/configState'
import { envelope, openingSill } from '../geometry'

/**
 * Dopasowanie kasetonów w widoku 3D: zaznacz i przeciągnij
 *  - fugę pionową (korpus / attyka) — zmienia szerokości dwóch sąsiednich kasetonów,
 *  - fugę poziomą korpusu — wysokość pasa, linię attyki — początek attyki (wspólny rytm wszystkich ścian),
 *  - pole (deska, lamele, okładzina) — przesunięcie wzdłuż ściany, krawędzie pola — szerokość.
 * Uchwyty liczone z tej samej funkcji układu co elewacja i BOM (`cassetteWallLayout`). Zmiana zapisuje się po puszczeniu
 * w `config.cassetteEdits` / `config.geometry.decor` i przełącza projekt na „Własna konfiguracja”.
 * Fugi na krawędziach otworów, pól i narożnikach są stałe (wynikają z otworów).
 */

const SIDES: WallSide[] = ['front', 'back', 'left', 'right']
const SNAP = 0.005
const ACCENT = '#f0a43a'
const ACTIVE = '#ff6a2b'
/** prefiks klucza uchwytów należących do przeciąganego elementu (podświetlenie w trakcie) */
function dragKey(d: Drag) {
  if (d.type === 'band') return d.wall + '-band-'
  if (d.type === 'attic') return d.wall + '-attic'
  if (d.type === 'field') return d.wall + '-field-'
  if (d.type === 'opening') return d.wall + '-opening-' + d.id
  return d.wall + '-' + d.row + '-@' + d.auto
}
/** kursor nad uchwytem (poza komponentem — zmiana stylu dokumentu, nie stanu Reacta) */
function setCursor(c: string) {
  document.body.style.cursor = c
}
const snap = (x: number) => Math.round(x / SNAP) * SNAP
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

/** kierunek „lokalne x” ściany w świecie (zgodnie z wallPosition) */
function wallU(side: WallSide): [number, number, number] {
  if (side === 'front') return [1, 0, 0]
  if (side === 'back') return [-1, 0, 0]
  if (side === 'left') return [0, 0, 1]
  return [0, 0, -1]
}
const ROT_Y: Record<WallSide, number> = { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }

type Drag =
  | { type: 'joint'; wall: WallSide; row: 'body' | 'attic'; auto: number; value: number; min: number; max: number; y0: number; y1: number }
  | { type: 'band'; wall: WallSide; k: number; value: number; span: number }
  | { type: 'attic'; wall: WallSide; value: number; span: number; min: number; max: number }
  | { type: 'field'; wall: WallSide; id: string; edge: 'move' | 'a' | 'b'; a: number; b: number; y0: number; y1: number; grab: number; lo: number; hi: number }
  | { type: 'opening'; wall: WallSide; id: string; a: number; b: number; y0: number; y1: number; grab: number; lo: number; hi: number; snaps: number[] }

export function CassetteEditor({ config, onChange }: { config: PavilionConfig; onChange: (next: PavilionConfig) => void }) {
  const geometry = geometryOf(config)
  const gapY = geometry.foundationGap ?? m(PHYS.base.groundGap)
  const get = useThree((s) => s.get)
  const setControls = (on: boolean) => {
    const ctl = get().controls as { enabled: boolean } | null
    if (ctl) ctl.enabled = on
  }
  const [drag, setDrag] = useState<Drag | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  // uchwyty tylko na ścianach zwróconych do kamery (ściana za bryłą nie łapie kursora i nie zaśmieca widoku)
  const groups = useRef<Partial<Record<WallSide, Group | null>>>({})
  const facing = (side: WallSide, cam: Camera) => {
    const n = wallNormal(side)
    const p = wallPosition(side, 0, 1, config)
    return (cam.position.x - p[0]) * n[0] + (cam.position.z - p[2]) * n[2] > 0.05
  }
  useFrame(({ camera }) => {
    for (const side of SIDES) {
      const g = groups.current[side]
      if (g) g.visible = facing(side, camera)
    }
  })

  const walls = useMemo(() => {
    // układ automatyczny (bez przesunięć fug) — do zapisu `from` przesuwanej fugi
    const auto = { ...config, cassetteEdits: { ...config.cassetteEdits, joints: [] } }
    return SIDES.map((side) => {
      const L = cassetteWallLayout(config, geometryOf(config), side)
      const A = L && cassetteWallLayout(auto, geometryOf(auto), side)
      return L && A ? { side, L, A } : null
    }).filter((x): x is NonNullable<typeof x> => x !== null)
  }, [config])

  // płaszczyzna uchwytów: lico kasetonów (ściana kasetonowa) albo lico płyty
  const cassetteSides = new Set(walls.map((w) => w.side))
  const faceOffsetOf = (side: WallSide) => PANEL_THICKNESS_M[config.wallPanel] / 2 + (cassetteSides.has(side) ? m(PHYS.cassette.thickness) : 0) + 0.004
  const L0 = walls[0]?.L
  const bodyRows = L0 ? L0.rows.filter((r) => !r.attic) : []
  const pitch = bodyRows.length ? bodyRows[0].y1 - bodyRows[0].y0 : 0.24
  const atticStart = L0?.atticStart ?? 0
  const hasAttic = !!L0 && L0.rows.some((r) => r.attic)
  const minWallH = Math.min(...walls.map((w) => w.L.maxHeight))
  const atticRows = L0 ? L0.rows.filter((r) => r.attic).length : 0
  const spanOf = (side: WallSide) => (side === 'front' || side === 'back' ? config.length : config.width)
  // attyka nad stolarką (jak układ automatyczny i zdjęcia realizacji): linia attyki nie schodzi poniżej najwyższego otworu
  const floorT = envelope(config).floorT
  const topOpening = Math.max(1.0, ...geometry.openings.map((o) => floorT + openingSill(o) + o.height + 0.01))

  /** punkt kursora na płaszczyźnie lica kasetonów ściany → lokalne (x wzdłuż ściany, y od spodu ramy) */
  const toLocal = (e: ThreeEvent<PointerEvent>, side: WallSide) => {
    const n = wallNormal(side)
    const p0 = wallPosition(side, 0, gapY, config)
    const f = faceOffsetOf(side)
    const o = new Vector3(p0[0] + n[0] * f, p0[1], p0[2] + n[2] * f)
    const hit = e.ray.intersectPlane(new Plane().setFromNormalAndCoplanarPoint(new Vector3(...n), o), new Vector3())
    if (!hit) return null
    const u = wallU(side)
    const d = hit.sub(o)
    return { x: d.x * u[0] + d.z * u[2], y: d.y }
  }

  const start = (e: ThreeEvent<PointerEvent>, d: Drag) => {
    if (!facing(d.wall, e.camera)) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setControls(false)
    setDrag(d)
  }
  const move = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return
    e.stopPropagation()
    const p = toLocal(e, drag.wall)
    if (!p) return
    if (drag.type === 'joint') setDrag({ ...drag, value: clamp(snap(p.x), drag.min, drag.max) })
    else if (drag.type === 'band') setDrag({ ...drag, value: clamp(snap(p.y / drag.k), MIN_CASSETTE, 0.8) * drag.k })
    else if (drag.type === 'attic') setDrag({ ...drag, value: clamp(snap(p.y), drag.min, drag.max) })
    else if (drag.type === 'opening') {
      // otwór między sąsiadami; przy krawędzi sąsiedniego otworu (< 3 cm) — przyciąga (sprzężenie ram, wspólny słupek)
      const w = drag.b - drag.a
      let a = clamp(snap(p.x - drag.grab), drag.lo, drag.hi - w)
      for (const sx of drag.snaps) {
        if (Math.abs(a - sx) < 0.03) a = sx
        if (Math.abs(a + w - sx) < 0.03) a = sx - w
      }
      setDrag({ ...drag, a, b: a + w })
    } else {
      // pole między sąsiednimi otworami / polami (lo, hi) — nie wchodzi na stolarkę
      const w = drag.b - drag.a
      if (drag.edge === 'move') {
        const a = clamp(snap(p.x - drag.grab), drag.lo, drag.hi - w)
        setDrag({ ...drag, a, b: a + w })
      } else if (drag.edge === 'a') setDrag({ ...drag, a: clamp(snap(p.x), drag.lo, drag.b - MIN_CASSETTE) })
      else setDrag({ ...drag, b: clamp(snap(p.x), drag.a + MIN_CASSETTE, drag.hi) })
    }
  }
  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!drag) return
    e.stopPropagation()
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    setControls(true)
    commit(drag)
    setDrag(null)
    // uchwyt przesunął się spod kursora — pointerOut nie przyjdzie
    setHover(null)
    setCursor('')
  }

  const commit = (d: Drag) => {
    const ed: CassetteEdits = { ...config.cassetteEdits }
    const base = { ...config, project: CUSTOM_PROJECT, geometry: editableGeometry(config) }
    if (d.type === 'joint') {
      const keep = (ed.joints ?? []).filter((j) => !(j.wall === d.wall && j.row === d.row && Math.abs(j.from - d.auto) < 0.02))
      ed.joints = Math.abs(d.value - d.auto) < 0.002 ? keep : [...keep, { wall: d.wall, row: d.row, from: d.auto, to: d.value }]
    } else if (d.type === 'band') ed.bandPitch = d.value / d.k
    else if (d.type === 'attic') ed.atticStart = d.value
    else if (d.type === 'opening') {
      const openings = base.geometry.openings.map((x) => (x.id === d.id ? { ...x, center: Number(((d.a + d.b) / 2).toFixed(3)), sourceAccuracy: 'drawing-estimate' as const } : x))
      onChange({ ...base, geometry: { ...base.geometry, openings } })
      return
    } else {
      const decor: DecorPlacement[] = base.geometry.decor.map((x) => (x.id === d.id ? { ...x, center: (d.a + d.b) / 2, width: d.b - d.a, sourceAccuracy: 'drawing-estimate' } : x))
      onChange({ ...base, geometry: { ...base.geometry, decor } })
      return
    }
    onChange({ ...base, cassetteEdits: ed })
  }

  // geometria uchwytu w lokalnym układzie ściany → świat
  const bar = (side: WallSide, x0: number, x1: number, y0: number, y1: number) => {
    const p = wallPosition(side, (x0 + x1) / 2, gapY + (y0 + y1) / 2, config)
    const n = wallNormal(side)
    const f = faceOffsetOf(side)
    return { position: [p[0] + n[0] * f, p[1], p[2] + n[2] * f] as [number, number, number], size: [x1 - x0, y1 - y0] as [number, number] }
  }

  /** uchwyt: niewidoczna strefa chwytu (hit) + widoczny pasek (linia fugi albo obrys pola) */
  const handle = (key: string, side: WallSide, x0: number, x1: number, y0: number, y1: number, onDown: (e: ThreeEvent<PointerEvent>) => void, opts: { fill?: boolean; line?: 'v' | 'h'; front?: number } = {}) => {
    const b = bar(side, x0, x1, y0, y1)
    // `front`: uchwyt minimalnie przed innymi (stolarka wygrywa z fugą poziomą przechodzącą przez otwór)
    if (opts.front) {
      const n = wallNormal(side)
      b.position = [b.position[0] + n[0] * opts.front, b.position[1], b.position[2] + n[2] * opts.front]
    }
    const hot = hover === key || (drag !== null && (drag.type === 'joint' ? key === dragKey(drag) : key.startsWith(dragKey(drag))))
    const [w, h] = b.size
    const vis: [number, number] = opts.line === 'v' ? [hot ? 0.016 : 0.008, h] : opts.line === 'h' ? [w, hot ? 0.016 : 0.008] : [w, h]
    return (
      <group key={key} name={key} position={b.position} rotation={[0, ROT_Y[side], 0]}>
        <mesh
          onPointerOver={(e) => { if (!facing(side, e.camera)) return; e.stopPropagation(); setHover(key); setCursor(opts.line === 'h' ? 'ns-resize' : opts.line === 'v' ? 'ew-resize' : 'grab') }}
          onPointerOut={() => { setHover((k) => (k === key ? null : k)); if (!drag) setCursor('') }}
          onPointerDown={onDown}
          onPointerMove={move}
          onPointerUp={end}
        >
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <mesh renderOrder={10} raycast={() => null}>
          <planeGeometry args={vis} />
          <meshBasicMaterial color={hot ? ACTIVE : ACCENT} transparent opacity={opts.fill ? (hot ? 0.2 : 0) : hot ? 1 : 0.7} depthWrite={false} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      </group>
    )
  }

  const perWall: Array<[WallSide, React.ReactNode[]]> = []
  for (const side of SIDES) {
    const out: React.ReactNode[] = []
    perWall.push([side, out])
    const half = spanOf(side) / 2
    const W = walls.find((w) => w.side === side)
    if (W) {
    const { L, A } = W
    // fugi pionowe (przesuwalne — poza krawędziami pól i końcami ściany)
    for (const [row, lines, autoLines, locked, y0, y1] of [
      ['body', L.bodyLines, A.bodyLines, L.isLockedBody, 0, L.atticStart],
      ['attic', L.atticLines, A.atticLines, L.isLockedAttic, L.atticStart, L.maxHeight],
    ] as const) {
      if (y1 - y0 < 0.05 || lines.length !== autoLines.length) continue
      for (let i = 1; i < lines.length - 1; i++) {
        if (locked(autoLines[i])) continue
        const key = side + '-' + row + '-@' + autoLines[i]
        const active = drag?.type === 'joint' && drag.wall === side && drag.row === row && Math.abs(drag.auto - autoLines[i]) < 1e-6
        const x = active ? drag.value : lines[i]
        out.push(handle(key, side, x - 0.03, x + 0.03, y0, y1, (e) => start(e, {
          type: 'joint', wall: side, row, auto: autoLines[i], value: lines[i], min: lines[i - 1] + MIN_CASSETTE, max: lines[i + 1] - MIN_CASSETTE, y0, y1,
        }), { line: 'v' }))
      }
    }
    // fugi poziome korpusu (wysokość pasa) i linia attyki
    for (let k = 1; k < bodyRows.length; k++) {
      const key = side + '-band-' + k
      const y = drag?.type === 'band' ? drag.value * (k / drag.k) : k * pitch
      out.push(handle(key, side, -half, half, y - 0.02, y + 0.02, (e) => start(e, { type: 'band', wall: side, k, value: k * pitch, span: L.span }), { line: 'h' }))
    }
    if (hasAttic) {
      const y = drag?.type === 'attic' ? drag.value : atticStart
      out.push(handle(side + '-attic', side, -half, half, y - 0.025, y + 0.025, (e) => start(e, {
        type: 'attic', wall: side, value: atticStart, span: L.span, min: Math.min(topOpening, atticStart), max: minWallH - atticRows * MIN_CASSETTE,
      }), { line: 'h' }))
    }
    }
    // pola (deska, lamele, okładziny) — przesunięcie i szerokość; na ścianie kasetonowej tylko pola układu (dawne pasy kasetonów
    // zastąpione elewacją pomijamy)
    for (const d of geometry.decor.filter((x) => x.wall === side && x.kind !== 'led-strip')) {
      const isField = !W || BOARD_KINDS.has(d.kind) || W.L.fields.some((f) => Math.abs(f.a - (d.center - d.width / 2)) < 1e-6)
      if (!isField) continue
      const active = drag?.type === 'field' && drag.id === d.id
      const a = active ? drag.a : d.center - d.width / 2
      const b = active ? drag.b : d.center + d.width / 2
      const y0 = d.yCenter - d.height / 2
      const y1 = d.yCenter + d.height / 2
      // sąsiedzi pola na tej ścianie: otwory i inne pola zachodzące w pionie (fuga 20 mm odstępu)
      const others = [
        ...geometry.openings.filter((o) => o.wall === side).map((o) => ({ a: o.center - o.width / 2, b: o.center + o.width / 2, y0: floorT + openingSill(o), y1: floorT + openingSill(o) + o.height })),
        ...geometry.decor.filter((x) => x.wall === side && x.id !== d.id && x.kind !== 'led-strip').map((x) => ({ a: x.center - x.width / 2, b: x.center + x.width / 2, y0: x.yCenter - x.height / 2, y1: x.yCenter + x.height / 2 })),
      ].filter((o) => Math.min(o.y1, y1) - Math.max(o.y0, y0) > 0.01)
      const a0 = d.center - d.width / 2
      const b0 = d.center + d.width / 2
      const sep = 0.02
      const lo = Math.max(-half, ...others.filter((o) => o.b <= a0 + 0.01).map((o) => o.b + sep))
      const hi = Math.min(half, ...others.filter((o) => o.a >= b0 - 0.01).map((o) => o.a - sep))
      const base = { type: 'field' as const, wall: side, id: d.id, a: a0, b: b0, y0, y1, lo: Math.min(lo, a0), hi: Math.max(hi, b0) }
      out.push(handle(side + '-field-' + d.id, side, a + 0.04, b - 0.04, y0 + 0.04, y1 - 0.04, (e) => {
        const p = toLocal(e, side)
        start(e, { ...base, edge: 'move', grab: (p?.x ?? a) - a })
      }, { fill: true }))
      out.push(handle(side + '-field-a-' + d.id, side, a - 0.03, a + 0.03, y0, y1, (e) => start(e, { ...base, edge: 'a', grab: 0 }), { line: 'v' }))
      out.push(handle(side + '-field-b-' + d.id, side, b - 0.03, b + 0.03, y0, y1, (e) => start(e, { ...base, edge: 'b', grab: 0 }), { line: 'v' }))
    }
    // stolarka (okna, drzwi) — przesunięcie wzdłuż ściany; nie wchodzi na inne otwory i pola, 15 cm od narożnika
    for (const o of geometry.openings.filter((x) => x.wall === side)) {
      const a0 = o.center - o.width / 2
      const b0 = o.center + o.width / 2
      const y0 = floorT + openingSill(o)
      const y1 = y0 + o.height
      const active = drag?.type === 'opening' && drag.id === o.id
      const a = active ? drag.a : a0
      const b = active ? drag.b : b0
      const others = [
        ...geometry.openings.filter((x) => x.wall === side && x.id !== o.id).map((x) => ({ a: x.center - x.width / 2, b: x.center + x.width / 2, y0: floorT + openingSill(x), y1: floorT + openingSill(x) + x.height, sep: 0 })),
        ...geometry.decor.filter((x) => x.wall === side && x.kind !== 'led-strip').map((x) => ({ a: x.center - x.width / 2, b: x.center + x.width / 2, y0: x.yCenter - x.height / 2, y1: x.yCenter + x.height / 2, sep: 0.02 })),
      ].filter((x) => Math.min(x.y1, y1) - Math.max(x.y0, y0) > 0.01)
      const lo = Math.max(-half + 0.15, ...others.filter((x) => x.b <= a0 + 0.01).map((x) => x.b + x.sep))
      const hi = Math.min(half - 0.15, ...others.filter((x) => x.a >= b0 - 0.01).map((x) => x.a - x.sep))
      const snaps = others.filter((x) => x.sep === 0).flatMap((x) => [x.a, x.b])
      out.push(handle(side + '-opening-' + o.id, side, a + 0.03, b - 0.03, y0 + 0.03, y1 - 0.03, (e) => {
        const p = toLocal(e, side)
        start(e, { type: 'opening', wall: side, id: o.id, a: a0, b: b0, y0, y1, grab: (p?.x ?? a0) - a0, lo: Math.min(lo, a0), hi: Math.max(hi, b0), snaps })
      }, { fill: true, front: 0.003 }))
    }
  }

  // podpis wymiaru podczas przeciągania
  let label: { side: WallSide; x: number; y: number; text: string } | null = null
  if (drag?.type === 'joint') label = { side: drag.wall, x: drag.value, y: (drag.y0 + drag.y1) / 2, text: 'kasetony ' + Math.round((drag.value - drag.min + MIN_CASSETTE) * 1000) + ' | ' + Math.round((drag.max + MIN_CASSETTE - drag.value) * 1000) + ' mm' }
  else if (drag?.type === 'band') label = { side: drag.wall, x: 0, y: drag.value, text: 'pas ' + Math.round((drag.value / drag.k) * 1000) + ' mm' }
  else if (drag?.type === 'attic') label = { side: drag.wall, x: 0, y: drag.value, text: 'attyka od ' + Math.round(drag.value * 1000) + ' mm' }
  else if (drag?.type === 'opening') label = { side: drag.wall, x: (drag.a + drag.b) / 2, y: (drag.y0 + drag.y1) / 2, text: 'oś ' + Math.round(((drag.a + drag.b) / 2) * 1000) + ' mm · od lewej ' + Math.round((drag.a + spanOf(drag.wall) / 2) * 1000) + ' mm' }
  else if (drag?.type === 'field') label = { side: drag.wall, x: (drag.a + drag.b) / 2, y: (drag.y0 + drag.y1) / 2, text: 'pole ' + Math.round((drag.b - drag.a) * 1000) + ' mm, oś ' + Math.round(((drag.a + drag.b) / 2) * 1000) + ' mm' }

  return (
    <group>
      {perWall.map(([side, items]) => <group key={side} ref={(g) => { groups.current[side] = g }}>{items}</group>)}
      {label && (
        <Html position={bar(label.side, label.x, label.x, label.y, label.y).position} center style={{ pointerEvents: 'none' }}>
          <div className="cassette-edit-label">{label.text}</div>
        </Html>
      )}
    </group>
  )
}
