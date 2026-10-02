import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { RepeatWrapping, SRGBColorSpace, Shape, type Texture } from 'three'

export function GalleryGround() {
  const [
    grassDiffuse,
    grassNormal,
    grassRoughness,
    gravelDiffuse,
    gravelNormal,
    gravelRoughness,
  ] = useTexture([
    './textures/pbr/aerial_grass_rock_diff_1k.jpg',
    './textures/pbr/aerial_grass_rock_nor_gl_1k.jpg',
    './textures/pbr/aerial_grass_rock_rough_1k.jpg',
    './textures/pbr/gravel_diff.jpg',
    './textures/pbr/gravel_nor.jpg',
    './textures/pbr/gravel_rough.jpg',
  ])

  const textures = useMemo(() => {
    const prep = (source: Texture, repeat: number, srgb = false) => {
      const texture = source.clone()
      texture.wrapS = RepeatWrapping
      texture.wrapT = RepeatWrapping
      texture.repeat.set(repeat, repeat)
      if (srgb) texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      return texture
    }
    return {
      grassDiffuse: prep(grassDiffuse, 7, true),
      grassNormal: prep(grassNormal, 7),
      grassRoughness: prep(grassRoughness, 7),
      gravelDiffuse: prep(gravelDiffuse, 4.5, true),
      gravelNormal: prep(gravelNormal, 4.5),
      gravelRoughness: prep(gravelRoughness, 4.5),
    }
  }, [grassDiffuse, grassNormal, grassRoughness, gravelDiffuse, gravelNormal, gravelRoughness])

  const gravelShape = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-5.0, -0.75)
    shape.lineTo(5.0, -0.70)
    shape.lineTo(4.6, 0.62)
    shape.lineTo(2.6, 0.48)
    shape.lineTo(0.3, 0.66)
    shape.lineTo(-2.2, 0.45)
    shape.lineTo(-4.8, 0.64)
    shape.closePath()
    return shape
  }, [])

  useEffect(() => () => {
    Object.values(textures).forEach((texture) => texture.dispose())
  }, [textures])

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.020, 0]} receiveShadow>
        <planeGeometry args={[48, 48]} />
        <meshStandardMaterial
          map={textures.grassDiffuse}
          normalMap={textures.grassNormal}
          roughnessMap={textures.grassRoughness}
          color="#817865"
          normalScale={[0.55, 0.55]}
          roughness={0.96}
          metalness={0}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.011, 1.95]} receiveShadow>
        <shapeGeometry args={[gravelShape]} />
        <meshStandardMaterial
          map={textures.gravelDiffuse}
          normalMap={textures.gravelNormal}
          roughnessMap={textures.gravelRoughness}
          color="#898277"
          normalScale={[0.70, 0.70]}
          roughness={0.93}
          metalness={0}
        />
      </mesh>
    </>
  )
}

export function PhotoEnvironment() {
  const loadedGround = useTexture('./textures/dampol-gravel.jpg')
  const ground = useMemo(() => {
    const texture = loadedGround.clone()
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(7, 7)
    texture.needsUpdate = true
    return texture
  }, [loadedGround])

  useEffect(() => () => {
    ground.dispose()
  }, [ground])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0]} receiveShadow>
      <planeGeometry args={[48, 48]} />
      <meshStandardMaterial
        color="#d6d2c8"
        map={ground}
        roughness={0.98}
        metalness={0.01}
      />
    </mesh>
  )
}
