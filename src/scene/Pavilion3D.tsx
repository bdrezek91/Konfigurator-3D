import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useMemo, useState, type RefObject } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import { autoTier, QUALITY, QualityContext, TIERS, type QualityMode, type QualityTier } from '../render/quality'
import { ACESFilmicToneMapping, PCFSoftShadowMap, PerspectiveCamera, SRGBColorSpace } from 'three'
import type { DecorKind, PavilionConfig } from '../types'
import { CameraRig, type CameraApi } from './camera/CameraRig'
import { CassetteEditor } from './editor/CassetteEditor'
import { PerfProbe, type PerfStats } from './PerfProbe'
import { cameraPose, type CameraPose } from './camera/presets'
import type { PavilionView } from './camera/views'
import { LightingContext, resolveLighting, type LightingMode } from './environment/lighting'
import { arch } from '../render/architecture'
import { SceneEnvironment } from './environment/SceneEnvironment'
import { Ground } from './ground/Ground'
import { HQPathTracer, type HQState } from './hq-render/HQPathTracer'
import { ProjectPavilion } from './pavilion/PavilionModel'

const TONE_MODE = { aces: ToneMappingMode.ACES_FILMIC, agx: ToneMappingMode.AGX, neutral: ToneMappingMode.NEUTRAL } as const

export type { PavilionView } from './camera/views'
export type { CameraApi } from './camera/CameraRig'
export type { CameraPose } from './camera/presets'
export type { LightingMode } from './environment/lighting'
export type { HQState } from './hq-render/HQPathTracer'

function RealExportBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const root = window as typeof window & { __DAMPOL3D_REAL_CAPTURE__?: () => string; __DAMPOL3D_STATS__?: () => Record<string, number>; __DAMPOL3D_SCENE__?: typeof scene }
    root.__DAMPOL3D_SCENE__ = scene // diagnostyka testów wizualnych (np. ukrycie warstwy)
    root.__DAMPOL3D_REAL_CAPTURE__ = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    // statystyki renderu (testy wydajności): wywołania rysowania, trójkąty, obiekty sceny, zasoby GPU
    root.__DAMPOL3D_STATS__ = () => {
      let meshes = 0
      const materials = new Set<string>()
      scene.traverse((o) => {
        const m = o as unknown as { isMesh?: boolean; material?: { uuid: string } | Array<{ uuid: string }> }
        if (!m.isMesh) return
        meshes++
        for (const mat of Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) materials.add(mat.uuid)
      })
      return {
        calls: gl.info.render.calls, triangles: gl.info.render.triangles, meshes, materials: materials.size,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
      }
    }
    // pełna klatka (mapa cienia + normalne AO + obraz + postprocessing): renderer.info bez resetu przy każdym render()
    const frameRoot = root as typeof root & { __DAMPOL3D_FRAME_STATS__?: () => Promise<Record<string, number>> }
    frameRoot.__DAMPOL3D_FRAME_STATS__ = () => new Promise((resolve) => {
      requestAnimationFrame(() => {
        gl.info.autoReset = false
        gl.info.reset()
        requestAnimationFrame(() => {
          const r = { calls: gl.info.render.calls, triangles: gl.info.render.triangles, lines: gl.info.render.lines, points: gl.info.render.points }
          gl.info.autoReset = true
          resolve(r)
        })
      })
    })
    return () => {
      delete frameRoot.__DAMPOL3D_FRAME_STATS__
      delete root.__DAMPOL3D_REAL_CAPTURE__
      delete root.__DAMPOL3D_STATS__
      delete root.__DAMPOL3D_SCENE__
    }
  }, [gl, scene, camera])

  return null
}

/** Ustawia kamerę HQ dokładnie na zadany kadr (bez kontrolek). */
function FixedCamera({ pose }: { pose: CameraPose }) {
  const get = useThree((state) => state.get)
  useEffect(() => {
    const camera = get().camera as PerspectiveCamera
    camera.position.set(...pose.position)
    camera.fov = pose.fov
    camera.lookAt(...pose.target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    // uchwyt diagnostyczny dla testów wizualnych (porównanie kadru HQ z podglądem)
    const root = window as typeof window & { __DAMPOL3D_HQ_CAMERA__?: PerspectiveCamera; __DAMPOL3D_HQ_RASTER__?: () => string }
    root.__DAMPOL3D_HQ_CAMERA__ = camera
    root.__DAMPOL3D_HQ_RASTER__ = () => {
      const { gl, scene } = get()
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
  }, [get, pose])
  return null
}

type Props = {
  config: PavilionConfig
  view?: PavilionView
  lighting?: LightingMode
  /** Zmiana = płynny powrót do kadru widoku (reset kamery). */
  resetNonce?: number
  cameraApiRef?: RefObject<CameraApi | null>
  /** Tryb HQ: path tracer z ustalonego kadru. */
  hq?: { pose: CameraPose; state: HQState; onProgress?: (samples: number, done: boolean) => void }
  /** Tryb jakości (E5); 'auto' — start z parametrów urządzenia, obniżany przy spadku FPS. */
  quality?: QualityMode
  /** aktualny tryb po automatycznym obniżeniu (do UI) */
  onTier?: (tier: QualityTier) => void
  /** Dopasowanie kasetonów (przeciąganie fug i pól) — zmiana konfiguracji po puszczeniu uchwytu. */
  onEditCassettes?: (next: PavilionConfig) => void
  /** tryb malowania kasetonów: pędzel (kolor) albo null — przesuwanie */
  editBrush?: string | null
  /** tryb dodawania pola okładziny (rodzaj) albo null */
  editAdding?: DecorKind | null
  onEditAdded?: () => void
  editStretch?: boolean
}

/** HDRI z wersją 1k w public/hdri */
const HDRI_1K = new Set(['./hdri/cloudy_vondelpark_2k.hdr', './hdri/pretoria_gardens_2k.hdr'])

export default function Pavilion3D({ config, view = 'perspective', lighting = 'day', resetNonce = 0, cameraApiRef, hq, quality = 'auto', onTier, onEditCassettes, editBrush, editAdding, onEditAdded, editStretch }: Props) {
  // w trybie dopasowania kasetonów kamera zostaje (przejście na „Własna konfiguracja” nie zmienia kadru)
  const [heldProject, setHeldProject] = useState(config.project)
  const editing = !!onEditCassettes
  if (!editing && heldProject !== config.project) setHeldProject(config.project)
  const poseKey = (editing ? heldProject : config.project) + '|' + view + '|' + resetNonce
  const base = resolveLighting(lighting, arch(config).lighting)
  const pose = hq?.pose ?? cameraPose(config, view)
  // tryb auto: start z parametrów urządzenia, PerformanceMonitor obniża o jeden poziom przy spadku FPS
  const [autoT, setAutoT] = useState<QualityTier>(autoTier)
  const tier: QualityTier = hq ? 'ultra' : quality === 'auto' ? autoT : quality
  const q = QUALITY[tier]
  // P13: tryb niski / średni (telefony) — HDRI 1k (1,7–1,8 MB zamiast 6,8–7,2 MB), HQ zawsze 2k
  const preset = useMemo(() => (tier === 'low' || tier === 'medium') && HDRI_1K.has(base.hdri)
    ? { ...base, hdri: base.hdri.replace('_2k.hdr', '_1k.hdr') } : base, [base, tier])
  useEffect(() => { onTier?.(tier) }, [tier, onTier])

  // P14: ?perf=1 — nakładka pomiaru wydajności (FPS, czas klatki, draw calls) do testów na telefonie / laptopie
  const [perf, setPerf] = useState<PerfStats | null>(null)
  const perfOn = !hq && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('perf') === '1'
  const copyPerf = () => {
    const report = { ...perf, tier, project: config.project, ua: navigator.userAgent, cores: navigator.hardwareConcurrency, memoryGB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory, screen: window.screen.width + '×' + window.screen.height, at: new Date().toISOString() }
    void navigator.clipboard?.writeText(JSON.stringify(report)).catch(() => window.prompt('Wynik pomiaru:', JSON.stringify(report)))
  }

  return (
    <>
    {perfOn && perf && (
      <div className="perf-overlay">
        <b>{perf.fps} FPS</b> · klatka {perf.frameP50} ms (p95 {perf.frameP95})<br />
        {perf.calls} draw calls · {(perf.triangles / 1000).toFixed(1)} tys. trójkątów<br />
        jakość: {tier} · DPR {perf.dpr} · tekstury {perf.textures}<br />
        <small>{perf.gpu}</small><br />
        <button type="button" onClick={copyPerf}>Kopiuj wynik</button>
      </div>
    )}
    <Canvas
      shadows
      frameloop={hq ? 'never' : 'always'}
      dpr={hq ? 1 : q.dpr}
      gl={{ preserveDrawingBuffer: !!hq, antialias: !hq }}
      camera={{ position: pose.position, fov: pose.fov, near: 0.1, far: 400 }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = preset.exposure
        gl.outputColorSpace = SRGBColorSpace
        gl.shadowMap.enabled = true
        gl.shadowMap.type = PCFSoftShadowMap
      }}
    >
      <QualityContext.Provider value={q}>
      <LightingContext.Provider value={preset}>
        {!hq && quality === 'auto' && (
          <PerformanceMonitor flipflops={2} onDecline={() => setAutoT((t) => TIERS[Math.max(0, TIERS.indexOf(t) - 1)])} />
        )}
        <Suspense fallback={null}>
          <SceneEnvironment config={config} lighting={preset} />
          <Ground config={config} />
          <ProjectPavilion config={config} />
          {!hq && onEditCassettes && <CassetteEditor config={config} onChange={onEditCassettes} brush={editBrush} adding={editAdding} onAdded={onEditAdded} stretch={editStretch} />}
          {hq ? (
            <>
              <FixedCamera pose={pose} />
              <HQPathTracer state={hq.state} onProgress={hq.onProgress} />
            </>
          ) : (
            <>
              <RealExportBridge />
              {perfOn && <PerfProbe onStats={setPerf} />}
              <EffectComposer multisampling={q.msaa} key={'fx-' + tier}>
                {/* mapowanie tonów musi być efektem: EffectComposer wymusza NoToneMapping na rendererze */}
                {q.ao !== 'off' ? (
                  <N8AO
                    aoRadius={0.3}
                    distanceFalloff={0.6}
                    intensity={3}
                    quality={q.aoQuality}
                    halfRes={q.ao === 'half'}
                    screenSpaceRadius={false}
                    color="#000000"
                  />
                ) : <></>}
                {/* ToneMapping po AO, przed SMAA (antyaliasing na obrazie LDR); bez presetu.toneMapping — bez efektu, jak dotąd */}
                {preset.toneMapping ? <ToneMapping mode={TONE_MODE[preset.toneMapping]} /> : <></>}
                {q.smaa ? <SMAA /> : <></>}
              </EffectComposer>
            </>
          )}
        </Suspense>
        {!hq && <CameraRig pose={pose} poseKey={poseKey} apiRef={cameraApiRef} />}
      </LightingContext.Provider>
      </QualityContext.Provider>
    </Canvas>
    </>
  )
}
