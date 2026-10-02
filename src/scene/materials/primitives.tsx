import { RoundedBox } from '@react-three/drei'
import { type Texture } from 'three'

export function Box({
  size,
  position,
  rotation = [0, 0, 0],
  color,
  metalness = 0.08,
  roughness = 0.72,
  opacity = 1,
  map,
  normalMap,
  envMapIntensity = 1,
}: {
  size: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  metalness?: number
  roughness?: number
  opacity?: number
  map?: Texture
  normalMap?: Texture
  envMapIntensity?: number
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        metalness={metalness}
        roughness={roughness}
        transparent={opacity < 1}
        opacity={opacity}
        map={map}
        normalMap={normalMap}
        normalScale={[0.22, 0.22]}
        envMapIntensity={envMapIntensity}
      />
    </mesh>
  )
}

export function RoundedPiece({
  size,
  position,
  rotation = [0, 0, 0],
  color,
  map,
  metalness = 0.10,
  roughness = 0.55,
  radius = 0.006,
}: {
  size: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  map?: Texture
  metalness?: number
  roughness?: number
  radius?: number
}) {
  return (
    <RoundedBox args={size} position={position} rotation={rotation} radius={Math.min(radius, size[0] / 5, size[1] / 5)} smoothness={2} castShadow receiveShadow>
      <meshStandardMaterial color={color} map={map} metalness={metalness} roughness={roughness} envMapIntensity={1.15} />
    </RoundedBox>
  )
}
