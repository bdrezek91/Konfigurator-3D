import { Environment } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { ACESFilmicToneMapping, AgXToneMapping, NeutralToneMapping, Object3D } from 'three'
import type { PavilionConfig } from '../../types'
import type { LightingPreset } from './lighting'
import { useQuality } from '../../render/quality'

/**
 * Wspólne środowisko renderu: HDRI jako tło i odbicia, jedno słońce z cieniem 4096 dopasowanym
 * do gabarytu pawilonu. Żadnych świateł "wypełniających" — resztę światła daje HDRI, dzięki czemu
 * cienie w fugach i odbicia w szkle są fizycznie spójne.
 */
export function SceneEnvironment({ config, lighting }: { config: PavilionConfig; lighting: LightingPreset }) {
  const get = useThree((state) => state.get)
  const shadowMap = useQuality().shadowMap
  const half = Math.max(config.length, config.width) / 2 + 1.5
  const distance = 14
  const [dx, dy, dz] = lighting.sunDirection
  const norm = Math.hypot(dx, dy, dz) || 1
  const sunPosition: [number, number, number] = [(dx / norm) * distance, (dy / norm) * distance, (dz / norm) * distance]
  const target = useMemo(() => {
    const object = new Object3D()
    object.position.set(0, 1.2, 0)
    return object
  }, [])

  useEffect(() => {
    const gl = get().gl
    gl.toneMappingExposure = lighting.exposure
    gl.toneMapping = lighting.toneMapping === 'agx' ? AgXToneMapping : lighting.toneMapping === 'neutral' ? NeutralToneMapping : ACESFilmicToneMapping
  }, [get, lighting.exposure, lighting.toneMapping])

  return (
    <>
      <Environment
        files={lighting.hdri}
        background
        backgroundBlurriness={0}
        environmentIntensity={lighting.environmentIntensity}
        backgroundIntensity={lighting.backgroundIntensity}
        environmentRotation={[0, lighting.rotationY, 0]}
        backgroundRotation={[0, lighting.rotationY, 0]}
      />
      <primitive object={target} />
      <directionalLight
        // rozmiar mapy cienia z trybu jakości; zmiana = nowe światło (mapa cienia tworzona od nowa)
        key={'sun-' + shadowMap}
        position={sunPosition}
        target={target}
        intensity={lighting.sunIntensity}
        color={lighting.sunColor}
        castShadow
        shadow-mapSize-width={shadowMap}
        shadow-mapSize-height={shadowMap}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={distance * 2.2}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
    </>
  )
}
