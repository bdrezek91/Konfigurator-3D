import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing'
import { Suspense, useEffect, type RefObject } from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap, PerspectiveCamera, SRGBColorSpace } from 'three'
import type { PavilionConfig } from '../types'
import { CameraRig, type CameraApi } from './camera/CameraRig'
import { cameraPose, type CameraPose } from './camera/presets'
import type { PavilionView } from './camera/views'
import { LIGHTING, LightingContext, type LightingMode } from './environment/lighting'
import { SceneEnvironment } from './environment/SceneEnvironment'
import { Ground } from './ground/Ground'
import { HQPathTracer, type HQState } from './hq-render/HQPathTracer'
import { ProjectPavilion } from './pavilion/PavilionModel'

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
    return () => {
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
}

export default function Pavilion3D({ config, view = 'perspective', lighting = 'day', resetNonce = 0, cameraApiRef, hq }: Props) {
  const preset = LIGHTING[lighting]
  const pose = hq?.pose ?? cameraPose(config, view)

  return (
    <Canvas
      shadows
      frameloop={hq ? 'never' : 'always'}
      dpr={hq ? 1 : [1, 1.75]}
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
      <LightingContext.Provider value={preset}>
        <Suspense fallback={null}>
          <SceneEnvironment config={config} lighting={preset} />
          <Ground config={config} />
          <ProjectPavilion config={config} />
          {hq ? (
            <>
              <FixedCamera pose={pose} />
              <HQPathTracer state={hq.state} onProgress={hq.onProgress} />
            </>
          ) : (
            <>
              <RealExportBridge />
              <EffectComposer multisampling={4}>
                <N8AO
                  aoRadius={0.3}
                  distanceFalloff={0.6}
                  intensity={3}
                  quality="high"
                  halfRes={false}
                  screenSpaceRadius={false}
                  color="#000000"
                />
                <SMAA />
              </EffectComposer>
            </>
          )}
        </Suspense>
        {!hq && <CameraRig pose={pose} poseKey={config.project + '|' + view + '|' + resetNonce} apiRef={cameraApiRef} />}
      </LightingContext.Provider>
    </Canvas>
  )
}
