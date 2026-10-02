import { envelope } from './geometry'
import { GalleryGround, PhotoEnvironment } from './ground/Ground'
import { HQPathTracer } from './hq-render/HQPathTracer'
import { ProjectPavilion, type Props } from './pavilion/PavilionModel'
import { ContactShadows, Environment, Lightformer, OrbitControls, Sky, SoftShadows } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, N8AO, SMAA } from '@react-three/postprocessing'
import { useEffect } from 'react'
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three'

export type { PavilionView } from './camera/views'

export function RealExportBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const root = window as typeof window & { __DAMPOL3D_REAL_CAPTURE__?: () => string }
    root.__DAMPOL3D_REAL_CAPTURE__ = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    return () => {
      delete root.__DAMPOL3D_REAL_CAPTURE__
    }
  }, [gl, scene, camera])

  return null
}

export default function Pavilion3D({ config, view = 'perspective', hq = false }: Props) {
  const gallery03 = config.project === 'GALERIA/03'
  const cameraDistance = Math.max(9.0, config.length * 1.28)
  const { outerFront, outerBack } = envelope(config)
  const targetHeight = gallery03 ? 1.30 : Math.min(1.34, (outerFront + outerBack) * 0.245)
  const cameraHeight = gallery03 ? 0.60 : 1.68
  const cameraPosition: [number, number, number] =
    gallery03 && view === 'perspective' ? [-0.90, 0.60, 4.45] :
    view === 'front' ? [0, cameraHeight, cameraDistance] :
    view === 'back' ? [0, cameraHeight, -cameraDistance] :
    view === 'left' ? [-cameraDistance, cameraHeight, 0] :
    view === 'right' ? [cameraDistance, cameraHeight, 0] :
    view === 'front-left' ? [-cameraDistance * 0.50, 1.72, cameraDistance * 0.92] :
    view === 'front-right' ? [cameraDistance * 0.50, 1.72, cameraDistance * 0.92] :
    [cameraDistance * 0.52, 1.78, cameraDistance * 0.94]

  return (
    <Canvas
      shadows
      frameloop={hq ? 'never' : 'always'}
      dpr={[1, 1.75]}
      camera={{ position: cameraPosition, fov: gallery03 ? 68 : 32 }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = gallery03 ? 1.0 : 1.18
        gl.outputColorSpace = SRGBColorSpace
        gl.shadowMap.enabled = true
        gl.shadowMap.type = PCFSoftShadowMap
      }}
    >
      {!gallery03 && <SoftShadows size={24} samples={10} focus={0.55} />}
      {gallery03 ? (
        <Environment
          files="./hdri/kloofendal_43d_clear_2k.hdr"
          background
          backgroundBlurriness={0}
          environmentIntensity={0.85}
          backgroundIntensity={0.85}
          environmentRotation={[0, Math.PI, 0]}
          backgroundRotation={[0, Math.PI, 0]}
        />
      ) : (
        <>
          <color attach="background" args={['#dfe2e2']} />
          <fog attach="fog" args={['#d6dde0', 20, 46]} />
          <Sky
            distance={450000}
            sunPosition={[10, 5, 8]}
            turbidity={5.2}
            rayleigh={2.2}
            mieCoefficient={0.0038}
            mieDirectionalG={0.80}
          />
        </>
      )}
      {gallery03 ? (
        <>
          <hemisphereLight color="#f4f5f1" groundColor="#77766f" intensity={0.12} />
          <ambientLight intensity={0.06} />
          <directionalLight
            position={[-6.5, 5.2, 9.5]}
            intensity={2.4}
            color="#fff1dc"
            castShadow
            shadow-mapSize-width={4096}
            shadow-mapSize-height={4096}
            shadow-camera-left={-7}
            shadow-camera-right={7}
            shadow-camera-top={6}
            shadow-camera-bottom={-3}
            shadow-camera-near={1}
            shadow-camera-far={30}
            shadow-bias={-0.0002}
            shadow-normalBias={0.02}
          />
        </>
      ) : (
        <>
          <hemisphereLight color="#f1f6f8" groundColor="#aaa49a" intensity={0.72} />
          <ambientLight intensity={0.44} />
          <directionalLight
            position={[8, 10, 7]}
            intensity={2.65}
            color="#fff7ea"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-bias={-0.00018}
          />
          <directionalLight position={[-8, 5, -3]} intensity={0.26} color="#c9d9ea" />
        </>
      )}

      {gallery03 ? <GalleryGround /> : <PhotoEnvironment />}

      <RealExportBridge />
      <ProjectPavilion config={config} />

      {gallery03 && !hq && (
        <EffectComposer multisampling={4}>
          <N8AO
            aoRadius={0.30}
            distanceFalloff={0.6}
            intensity={3}
            quality="high"
            aoSamples={16}
            denoiseSamples={8}
            denoiseRadius={10}
            halfRes={false}
            screenSpaceRadius={false}
            color="#000000"
          />
          <SMAA />
        </EffectComposer>
      )}

      {!hq && !gallery03 && <ContactShadows
        position={[0, 0.004, 0]}
        opacity={0.38}
        scale={26}
        blur={2.6}
        far={10}
      />}
      {!gallery03 && (
        <Environment resolution={128}>
          <Lightformer form="rect" intensity={1.8} color="#eef5ff" position={[0, 7, -8]} scale={[12, 5, 1]} />
          <Lightformer form="rect" intensity={1.35} color="#e9f2f6" position={[0, 3.2, 8]} scale={[10, 4.5, 1]} rotation={[0, Math.PI, 0]} />
          <Lightformer form="rect" intensity={1.15} color="#fff3de" position={[8, 4, 5]} scale={[5, 5, 1]} rotation={[0, -Math.PI / 2, 0]} />
          <Lightformer form="rect" intensity={0.9} color="#d9e7f2" position={[-8, 3, 2]} scale={[5, 4, 1]} rotation={[0, Math.PI / 2, 0]} />
        </Environment>
      )}

      {hq && <HQPathTracer enabled />}

      {!hq && <OrbitControls
        makeDefault
        target={gallery03 ? [0.22, 1.25, 0] : [0, targetHeight, 0]}
        minDistance={gallery03 ? 2.6 : Math.max(6.3, config.length * 0.78)}
        maxDistance={gallery03 ? 12 : Math.max(24, config.length * 2.4)}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.50}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
      />}
    </Canvas>
  )
}
