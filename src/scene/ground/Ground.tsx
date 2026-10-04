import { useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { RepeatWrapping, SRGBColorSpace, Shape, type Texture } from 'three'
import type { PavilionConfig } from '../../types'

/**
 * Grunt: trawnik (tekstura z scripts/gen-wood-textures.py, kolor jak na zdjęciach realizacji) + opaska żwirowa (galeria-03).
 * Dla galerii-03 kształt opaski odwzorowuje zdjęcie 03; dla pozostałych projektów
 * jest liczony z gabarytu pawilonu.
 */
export function Ground({ config }: { config: PavilionConfig }) {
  const gallery03 = config.project === 'GALERIA/03'
  const [
    grassDiffuse,
    grassNormal,
    grassRoughness,
    gravelDiffuse,
    gravelNormal,
    gravelRoughness,
  ] = useTexture([
    './textures/pbr/grass_diff.jpg',
    './textures/pbr/grass_nor.jpg',
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
      grassDiffuse: prep(grassDiffuse, 14, true),
      grassNormal: prep(grassNormal, 14),
      grassRoughness: prep(grassRoughness, 7),
      gravelDiffuse: prep(gravelDiffuse, 4.5, true),
      gravelNormal: prep(gravelNormal, 4.5),
      gravelRoughness: prep(gravelRoughness, 4.5),
    }
  }, [grassDiffuse, grassNormal, grassRoughness, gravelDiffuse, gravelNormal, gravelRoughness])

  const gravelShape = useMemo(() => {
    const shape = new Shape()
    if (gallery03) {
      shape.moveTo(-5.0, -0.75)
      shape.lineTo(5.0, -0.70)
      shape.lineTo(4.6, 0.62)
      shape.lineTo(2.6, 0.48)
      shape.lineTo(0.3, 0.66)
      shape.lineTo(-2.2, 0.45)
      shape.lineTo(-4.8, 0.64)
      shape.closePath()
      return shape
    }
    // opaska żwirowa ~0,35 m wokół obrysu (jasny żwir przy podkładach, jak na zdjęciach), lekko nieregularna krawędź
    const hx = config.length / 2 + 0.35
    const hz = config.width / 2 + 0.35
    shape.moveTo(-hx, -hz)
    shape.lineTo(hx * 0.4, -hz - 0.08)
    shape.lineTo(hx, -hz)
    shape.lineTo(hx + 0.06, hz * 0.2)
    shape.lineTo(hx, hz)
    shape.lineTo(-hx * 0.3, hz + 0.1)
    shape.lineTo(-hx, hz)
    shape.lineTo(-hx - 0.05, -hz * 0.3)
    shape.closePath()
    return shape
  }, [gallery03, config.length, config.width])

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
          // trawa matowa (roughness 1, bez mapy chropowatości) — pod ostrym kątem nie „prała się” na niebiesko od nieba
          // trawa: zieleń jak na zdjęciach realizacji (163, 054, 090) — wcześniej szaro-brązowa, wyglądała jak asfalt;
          // przyciemnienie dobrane do zdjęcia 163 (trawa 127/141/59 sRGB)
          color="#c9c070"
          normalScale={[0.55, 0.55]}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* opaska żwirowa tylko dla wzorca galerii-03 (zdjęcie 03); prostokątny pas przy innych projektach wyglądał jak betonowa płyta */}
      {gallery03 && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.011, 1.95]} receiveShadow>
        <shapeGeometry args={[gravelShape]} />
        <meshStandardMaterial
          map={textures.gravelDiffuse}
          normalMap={textures.gravelNormal}
          roughnessMap={textures.gravelRoughness}
          color="#b9b4aa"
          normalScale={[0.70, 0.70]}
          roughness={0.93}
          metalness={0}
        />
      </mesh>}
    </>
  )
}
