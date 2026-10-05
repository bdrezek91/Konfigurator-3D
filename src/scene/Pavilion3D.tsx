import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, SMAA, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useState, type RefObject } from 'react'
import { PerformanceMonitor } from '@react-three/drei'
import { autoTier, QUALITY, QualityContext, TIERS, type QualityMode, type QualityTier } from '../render/quality'
import { ACESFilmicToneMapping, PCFSoftShadowMap, PerspectiveCamera, SRGBColorSpace } from 'three'
import type { PavilionConfig } from '../types'
import { CameraRig, type CameraApi } from './camera/CameraRig'
import { CassetteEditor } from './editor/CassetteEditor'
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
}

export default function Pavilion3D({ config, view = 'perspective', lighting = 'day', resetNonce = 0, cameraApiRef, hq, quality = 'auto', onTier, onEditCassettes }: Props) {
  // w trybie dopasowania kasetonów kamera zostaje (przejście na „Własna konfiguracja” nie zmienia kadru)
  const [heldProject, setHeldProject] = useState(config.project)
  const editing = !!onEditCassettes
  if (!editing && heldProject !== config.project) setHeldProject(config.project)
  const poseKey = (editing ? heldProject : config.project) + '|' + view + '|' + resetNonce
  const preset = resolveLighting(lighting, arch(config).lighting)
  const pose = hq?.pose ?? cameraPose(config, view)
  // tryb auto: start z parametrów urządzenia, PerformanceMonitor obniża o jeden poziom przy spadku FPS
  const [autoT, setAutoT] = useState<QualityTier>(autoTier)
  const tier: QualityTier = hq ? 'ultra' : quality === 'auto' ? autoT : quality
  const q = QUALITY[tier]
  useEffect(() => { onTier?.(tier) }, [tier, onTier])

  return (
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
          {!hq && onEditCassettes && <CassetteEditor config={config} onChange={onEditCassettes} />}
          {hq ? (
            <>
              <FixedCamera pose={pose} />
              <HQPathTracer state={hq.state} onProgress={hq.onProgress} />
            </>
          ) : (
            <>
              <RealExportBridge />
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
  )
}
