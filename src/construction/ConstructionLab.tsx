import { Environment, Html, OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useState } from 'react'
import {
  ACESFilmicToneMapping, DoubleSide, Material, MeshPhysicalMaterial, MeshStandardMaterial, Plane, SRGBColorSpace, Vector3,
} from 'three'
import { geometryOf } from '../components'
import { RENDER } from '../physical/spec'
import { PRESETS } from '../presets'
import { DEFAULT_CONFIG, type PavilionConfig } from '../types'
import { buildRunGeometry, finishForConfig } from './geometry'
import { buildSystem1 } from './system1/build'
import { STAGES, type FinishVariant, type Layer, type Part, type Vec3 } from './types'

/**
 * Stanowisko konstrukcji SYSTEMU 1 (kątownik 50×50×4).
 * ?lab=construction&preset=722-08-26&view=assembled|exploded|A|B|C|D|E|F&finish=bare|cassette&step=1..10
 */

type ViewId = 'assembled' | 'exploded' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

const LAYER_LABELS: Record<Layer, string> = {
  steel: 'Konstrukcja stalowa', floor: 'Podłoga', walls: 'Ściany + stolarka', roof: 'Dach', topFrame: 'Górna rama',
  flashings: 'Obróbki', decor: 'Elewacja', fasteners: 'Mocowania',
}

const materialCache = new Map<string, Material>()
function materialFor(p: Part) {
  const key = p.material + p.color
  const hit = materialCache.get(key)
  if (hit) return hit
  let mat: Material
  switch (p.material) {
    case 'steel': mat = new MeshStandardMaterial({ color: p.color, metalness: 0.65, roughness: 0.42, side: DoubleSide }); break
    case 'pirCore': mat = new MeshStandardMaterial({ color: p.color, roughness: 0.92, side: DoubleSide }); break
    case 'glass': mat = new MeshPhysicalMaterial({ color: p.color, metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.45, side: DoubleSide }); break
    case 'screw': mat = new MeshStandardMaterial({ color: p.color, metalness: 0.8, roughness: 0.3, side: DoubleSide }); break
    case 'flashing': mat = new MeshStandardMaterial({ color: p.color, metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value, side: DoubleSide }); break
    default: mat = new MeshStandardMaterial({ color: p.color, metalness: p.material === 'sheetInner' ? 0.1 : 0.35, roughness: p.material === 'sheetInner' ? 0.35 : RENDER.panelSemiMattRoughness.value, side: DoubleSide })
  }
  materialCache.set(key, mat)
  return mat
}

function PartMesh({ part, explode }: { part: Part; explode: number }) {
  const geo = useMemo(() => buildRunGeometry(part.geometry), [part.geometry])
  useEffect(() => () => geo.dispose(), [geo])
  const off = part.explode.map((x) => x * explode) as Vec3
  return <mesh geometry={geo} material={materialFor(part)} position={off} castShadow receiveShadow />
}

/** Płaszczyzna cięcia (globalna dla renderera). */
function Clip({ plane }: { plane: Plane | null }) {
  const get = useThree((s) => s.get)
  useEffect(() => {
    const gl = get().gl
    gl.clippingPlanes = plane ? [plane] : []
    return () => { gl.clippingPlanes = [] }
  }, [get, plane])
  return null
}

type SectionDef = {
  title: string
  finish?: FinishVariant
  plane: Plane | null
  /** fov — kamera perspektywiczna; viewHeight [m] — kamera ortogonalna (przekrój jak na rysunku) */
  camera: { position: Vec3; target: Vec3; fov: number; up?: Vec3; viewHeight?: number }
  hide?: Layer[]
  labels: Array<{ at: Vec3; text: string }>
}

function sections(config: PavilionConfig, lv: Record<string, number>): Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G', SectionDef> {
  const L = config.length
  const W = config.width
  const zf = W / 2
  // przekroje x = const w miejscu pełnej ściany przedniej (bez otworów), z dala od narożnika
  const fronts = geometryOf(config).openings.filter((o) => o.wall === 'front')
  const free = (x: number) => fronts.every((o) => Math.abs(x - o.center) > o.width / 2 + 0.15)
  const xs = [-L / 2 + 0.45, L / 2 - 0.45, -L / 2 + 0.9, 0].find(free) ?? -L / 2 + 0.45
  const t = 0.004
  const tw = 0.1
  const cutX = new Plane(new Vector3(1, 0, 0), -xs)
  return {
    A: {
      title: `A — podłoga i dolny kątownik (przekrój x = ${xs.toFixed(2)} m)`, plane: cutX,
      camera: { position: [xs - 1.3, lv.yFloorTop, zf - 0.12], target: [xs, lv.yFloorTop, zf - 0.12], fov: 14, viewHeight: 0.42 },
      labels: [
        { at: [xs, lv.yFrame + 0.02, zf], text: 'Kątownik 50×50×4 — piętka na obrysie, ramię poziome pod podłogą' },
        { at: [xs, (lv.yFrame + lv.yFloorTop) / 2, zf - 0.17], text: 'Płyta podłogowa PIR na ramieniu poziomym' },
        { at: [xs, lv.yFloorTop + 0.12, zf - t - tw / 2], text: 'Ściana PIR stoi na podłodze' },
        { at: [xs, lv.yFrame - 0.01, zf - 0.027], text: 'Wkręt 120–125 mm: PIR → blacha → kątownik' },
        { at: [xs, lv.yFrame + 0.13, zf + 0.004], text: 'Obróbka cokołowa' },
      ],
    },
    B: {
      title: 'B — narożnik pionowy (przekrój poziomy y = 1,2 m)', plane: new Plane(new Vector3(0, -1, 0), 1.2),
      camera: { position: [-L / 2 + 0.16, 2.6, zf - 0.16], target: [-L / 2 + 0.16, 1.2, zf - 0.16], fov: 13, up: [0, 0, -1], viewHeight: 0.42 },
      labels: [
        { at: [-L / 2, 1.2, zf], text: 'Słup: kątownik 50×50×4, piętka w narożu' },
        { at: [-L / 2 + 0.2, 1.2, zf - 0.054], text: 'Blacha ściany przedniej oparta o ramię słupa (przykręcona)' },
        { at: [-L / 2 + 0.004, 1.2, zf - 0.03], text: 'Czoło płyty (rdzeń/zamek) dotyka drugiego ramienia' },
        { at: [-L / 2 + 0.054, 1.2, zf - 0.25], text: 'Ściana boczna między przednią a tylną' },
      ],
    },
    C: {
      title: `C — ściana–dach (przekrój x = ${xs.toFixed(2)} m, bez obróbki)`, plane: cutX, hide: ['flashings', 'decor'],
      camera: { position: [xs - 1.4, lv.yTopF - 0.08, zf - 0.12], target: [xs, lv.yTopF - 0.08, zf - 0.12], fov: 16, viewHeight: 0.45 },
      labels: [
        { at: [xs, lv.wallTopFront - 0.15, zf - t - tw / 2], text: 'Ściana przednia' },
        { at: [xs, lv.wallTopFront + 0.05, zf - 0.25], text: 'Płyta dachowa na ścianach' },
        { at: [xs, lv.yTopF + 0.025, zf], text: 'Górna rama: kątownik na dachu' },
      ],
    },
    D: {
      title: 'D — górna konstrukcja: słup ponad dachem + górna rama (bez obróbek)', plane: null, hide: ['flashings', 'decor', 'fasteners'],
      camera: { position: [-L / 2 - 0.7, lv.yTopF + 0.55, zf + 0.75], target: [-L / 2 + 0.15, lv.yTopF - 0.05, zf - 0.2], fov: 30 },
      labels: [
        { at: [-L / 2, lv.postTopF, zf], text: 'Słup wystaje ~5 cm nad dach — do dospawania górnej ramy' },
        { at: [-L / 2 + 0.6, lv.yTopF + 0.05, zf], text: 'Górna rama (kątownik) zespawana ze słupami' },
      ],
    },
    E: {
      title: 'E — obróbka „półtorówka” 15 mm (goły PIR)', finish: 'bare', plane: cutX,
      camera: { position: [xs - 1.4, lv.yTopF - 0.08, zf - 0.08], target: [xs, lv.yTopF - 0.08, zf - 0.08], fov: 18, viewHeight: 0.45 },
      labels: [
        { at: [xs, lv.yTopF + 0.055, zf + 0.012], text: 'Górny kątownik widoczny; pod nim półtorówka — lico 15 mm od ściany' },
        { at: [xs, lv.yTopF + 0.05 - 0.215, zf - 0.002], text: 'Załamanie do ściany + kołnierz przykręcany' },
      ],
    },
    G: {
      title: 'G — obróbka „na kwadraty” 25 mm + deska', finish: 'squares', plane: cutX,
      camera: { position: [xs - 1.4, lv.yTopF - 0.08, zf - 0.06], target: [xs, lv.yTopF - 0.08, zf - 0.06], fov: 18, viewHeight: 0.45 },
      labels: [
        { at: [xs, lv.yTopF + 0.055, zf + 0.022], text: 'Górny kątownik widoczny; pod nim „na kwadraty” — lico 25 mm od ściany' },
        { at: [xs, lv.yTopF + 0.05 - 0.215, zf + 0.006], text: 'Powrót poziomy do ściany + kapinos' },
        { at: [xs, lv.yTopF - 0.25, zf + 0.012], text: 'Deska — lico w płaszczyźnie obróbki (grubość LOW)' },
      ],
    },
    F: {
      title: 'F — wariant z kasetonem (obróbka B + kaseton)', finish: 'cassette', plane: cutX,
      camera: { position: [xs - 1.6, lv.yTopF - 0.12, zf - 0.02], target: [xs, lv.yTopF - 0.12, zf - 0.02], fov: 22, viewHeight: 0.6 },
      labels: [
        { at: [xs, lv.yTopF - 0.2, zf + 0.06], text: 'Kaseton 0,5 mm przykręcony przez obrzeże do płyty; fuga 20 mm (głębokość tacy UNKNOWN)' },
        { at: [xs, lv.yTopF + 0.05, zf + 0.002], text: 'Obróbka B — płaska techniczna' },
      ],
    },
  }
}

function CameraSet({ cam }: { cam: SectionDef['camera'] | null }) {
  const get = useThree((s) => s.get)
  const key = JSON.stringify(cam)
  useEffect(() => {
    if (!cam) return
    const camera = get().camera
    const controls = get().controls as unknown as { target: Vector3; update: () => void } | null
    camera.position.set(...cam.position)
    camera.up.set(...(cam.up ?? [0, 1, 0]))
    const c = camera as unknown as { isOrthographicCamera?: boolean; fov: number; zoom: number; updateProjectionMatrix: () => void }
    if (c.isOrthographicCamera) c.zoom = get().size.height / (cam.viewHeight ?? 1)
    else c.fov = cam.fov
    c.updateProjectionMatrix()
    camera.lookAt(...cam.target)
    if (controls) {
      controls.target.set(...cam.target)
      controls.update()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, get])
  return null
}

export default function ConstructionLab() {
  const q = new URLSearchParams(window.location.search)
  const [config] = useState<PavilionConfig>(() => {
    if (q.get('from') === 'app') {
      try {
        const raw = window.sessionStorage.getItem('dampol3d.construction.config')
        if (raw) return JSON.parse(raw) as PavilionConfig
      } catch {
        // brak dostępu — preset z adresu
      }
    }
    const preset = PRESETS.find((p) => p.id === (q.get('preset') ?? '722-08-26'))
    return preset ? { ...preset.config } : { ...DEFAULT_CONFIG }
  })
  const [view, setView] = useState<ViewId>((q.get('view') as ViewId) ?? 'assembled')
  const [finish, setFinish] = useState<FinishVariant>(() => (['bare', 'squares', 'cassette'] as const).find((f) => f === q.get('finish')) ?? finishForConfig(config).front)
  const [step, setStep] = useState(Number(q.get('step') ?? 10))
  const [hidden, setHidden] = useState<Set<Layer>>(new Set(q.get('hide')?.split(',') as Layer[] | undefined))

  const isSection = view.length === 1
  const base = useMemo(() => buildSystem1(config, 'bare'), [config])
  const sec = isSection ? sections(config, base.levels)[view as 'A'] : null
  const effFinish: FinishVariant = view === 'E' ? 'bare' : view === 'F' ? 'cassette' : view === 'G' ? 'squares' : finish
  const model = useMemo(() => buildSystem1(config, effFinish), [config, effFinish])
  const explode = view === 'exploded' ? 1 : 0
  const showFasteners = view === 'A' || view === 'B' || q.get('fasteners') === '1'
  const hide = new Set([...(sec?.hide ?? []), ...hidden, ...(showFasteners ? [] : ['fasteners' as Layer])])
  const parts = model.parts.filter((p) => p.stage <= step && !hide.has(p.layer))
  const defaultCam: SectionDef['camera'] = view === 'exploded'
    ? { position: [9.5, 6.5, 9.5], target: [0, 1.6, 0], fov: 38 }
    : { position: [6.8, 3.6, 7.6], target: [0, 1.3, 0], fov: 36 }
  // ?cam=px,py,pz,tx,ty,tz,fov — kadr z adresu (zbliżenia detali, testy wizualne)
  const camQ = q.get('cam')?.split(',').map(Number)
  const urlCam: SectionDef['camera'] | null = camQ && camQ.length === 7 && camQ.every(Number.isFinite)
    ? { position: [camQ[0], camQ[1], camQ[2]], target: [camQ[3], camQ[4], camQ[5]], fov: camQ[6] }
    : null
  const cam = urlCam ?? sec?.camera ?? defaultCam

  const btn = (on: boolean) => ({
    padding: '5px 9px', borderRadius: 6, border: '1px solid #c9ccce', background: on ? '#1d2124' : '#fff', color: on ? '#fff' : '#1d2124',
    font: '600 12px Inter, system-ui', cursor: 'pointer',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#e9ebec', font: '13px Inter, system-ui', color: '#1d2124' }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: cam.position, fov: cam.fov, near: 0.01, far: 200 }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.outputColorSpace = SRGBColorSpace
          gl.localClippingEnabled = true
        }}
      >
        <color attach="background" args={['#e9ebec']} />
        <Suspense fallback={null}>
          <Environment files="./hdri/kloofendal_43d_clear_2k.hdr" environmentIntensity={0.8} environmentRotation={[0, Math.PI, 0]} />
        </Suspense>
        <hemisphereLight args={['#ffffff', '#b8b4ac', 0.6]} />
        <directionalLight position={[-6, 9, 7]} intensity={1.6} castShadow shadow-mapSize={[2048, 2048]} />
        <Clip plane={sec?.plane ?? null} />
        {cam.viewHeight
          ? <OrthographicCamera makeDefault position={cam.position} near={0.001} far={100} />
          : <PerspectiveCamera makeDefault position={cam.position} fov={cam.fov} near={0.01} far={200} />}
        <OrbitControls makeDefault target={cam.target} />
        <CameraSet cam={cam} />
        {parts.map((p) => <PartMesh key={p.id} part={p} explode={explode} />)}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#d6d8d6" roughness={0.95} />
        </mesh>
        {view === 'exploded' && STAGES.filter((s) => s.stage <= step).map((s) => {
          const first = model.parts.find((p) => p.stage === s.stage && !hide.has(p.layer))
          if (!first) return null
          const g = first.geometry
          const at = [g.start[0] + first.explode[0], g.start[1] + first.explode[1] + 0.15, g.start[2] + first.explode[2]] as Vec3
          return (
            <Html key={s.stage} position={at} center style={{ pointerEvents: 'none' }}>
              <div style={{ background: '#1d2124', color: '#fff', borderRadius: 999, padding: '2px 8px', font: '700 11px Inter', whiteSpace: 'nowrap' }}>{s.stage}. {s.label}</div>
            </Html>
          )
        })}
        {sec?.labels.map((l, i) => (
          <Html key={i} position={l.at} style={{ pointerEvents: 'none' }}>
            <div style={{ transform: 'translate(8px, -50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: 7, background: '#e0201b', flex: 'none' }} />
              <span style={{ background: 'rgba(255,255,255,.94)', border: '1px solid #c9ccce', borderRadius: 5, padding: '2px 6px', font: '600 11px Inter', whiteSpace: 'nowrap' }}>{l.text}</span>
            </div>
          </Html>
        ))}
      </Canvas>

      <div style={{ position: 'absolute', left: 12, top: 12, width: 330, background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: 12, boxShadow: '0 4px 18px rgba(0,0,0,.12)', maxHeight: 'calc(100vh - 24px)', overflow: 'auto' }}>
        <div style={{ font: '700 14px Inter' }}>System 1 — kątownik 50×50×4</div>
        <div style={{ color: '#5d6468', marginBottom: 8 }}>{config.project} · rama {Math.round(config.length * 1000)} × {Math.round(config.width * 1000)} mm</div>
        {sec && <div style={{ font: '700 12px Inter', marginBottom: 6 }}>{sec.title}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {(['assembled', 'exploded', 'A', 'B', 'C', 'D', 'E', 'F', 'G'] as ViewId[]).map((v) => (
            <button key={v} style={btn(view === v)} onClick={() => setView(v)}>{v === 'assembled' ? 'Złożony' : v === 'exploded' ? 'Exploded' : 'Przekrój ' + v}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          <button style={btn(effFinish === 'bare')} onClick={() => setFinish('bare')}>Goły PIR · półtorówka</button>
          <button style={btn(effFinish === 'squares')} onClick={() => setFinish('squares')}>Deska · na kwadraty</button>
          <button style={btn(effFinish === 'cassette')} onClick={() => setFinish('cassette')}>Kasetony · płaska</button>
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Krok montażu: <b>{step}. {STAGES[step - 1].label}</b>
          <input type="range" min={1} max={10} value={step} onChange={(e) => setStep(Number(e.target.value))} style={{ width: '100%' }} />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {(Object.keys(LAYER_LABELS) as Layer[]).map((l) => (
            <button key={l} style={btn(!hide.has(l))} onClick={() => setHidden((h) => { const n = new Set(h); if (n.has(l)) n.delete(l); else n.add(l); return n })}>{LAYER_LABELS[l]}</button>
          ))}
        </div>
        <div style={{ font: '700 12px Inter', margin: '4px 0' }}>Wymiary wyliczone z konstrukcji</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '11px Inter' }}>
          <tbody>
            {model.derived.map((d) => (
              <tr key={d.key} style={{ borderTop: '1px solid #e3e5e6' }}>
                <td style={{ padding: '3px 2px' }}>{d.label}<div style={{ color: '#6c7377' }}>{d.formula}</div>{d.check && <div style={{ color: d.check.ok ? '#18794e' : '#c2410c' }}>{d.check.ok ? '✓' : '✗'} {d.check.expected}</div>}</td>
                <td style={{ padding: '3px 2px', textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{d.valueMm}{d.key.endsWith('Count') || d.key === 'wallModules' ? ' szt.' : ' mm'}</td>
                <td style={{ padding: '3px 2px', color: d.confidence === 'HIGH' || d.confidence === 'VERIFIED' ? '#18794e' : d.confidence === 'MEDIUM' ? '#a16207' : '#c2410c', fontWeight: 600 }}>{d.confidence}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
