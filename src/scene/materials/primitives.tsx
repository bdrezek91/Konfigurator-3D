import { RoundedBox } from '@react-three/drei'
import { MeshStandardMaterial, type Texture } from 'three'

/**
 * Wspólne materiały dla prymitywów (Box, RoundedPiece): ten sam zestaw parametrów → ten sam obiekt materiału.
 * Wcześniej każdy element tworzył własny materiał (9×3: ~315 materiałów na ~600 meshy) — więcej zmian stanu GPU i pamięci.
 * Materiały żyją przez cały czas działania aplikacji (zestaw kombinacji jest skończony i mały).
 */
const materialCache = new Map<string, MeshStandardMaterial>()
type MatParams = {
  color: string; metalness: number; roughness: number; opacity?: number; envMapIntensity?: number
  map?: Texture; normalMap?: Texture; roughnessMap?: Texture; normalScale?: number
}
function sharedMaterial(p: MatParams) {
  const key = [p.color, p.metalness, p.roughness, p.opacity ?? 1, p.envMapIntensity ?? 1, p.map?.uuid ?? '', p.normalMap?.uuid ?? '', p.roughnessMap?.uuid ?? '', p.normalScale ?? 0].join('|')
  let mat = materialCache.get(key)
  if (!mat) {
    const opacity = p.opacity ?? 1
    mat = new MeshStandardMaterial({
      color: p.color, metalness: p.metalness, roughness: p.roughness, transparent: opacity < 1, opacity,
      map: p.map ?? null, normalMap: p.normalMap ?? null, roughnessMap: p.roughnessMap ?? null, envMapIntensity: p.envMapIntensity ?? 1,
    })
    if (p.normalMap && p.normalScale != null) mat.normalScale.set(p.normalScale, p.normalScale)
    // R3F przy odmontowaniu meshu woła material.dispose() — materiał współdzielony nie może być wtedy zwolniony
    // (ponowna kompilacja shadera = przycięcie przy każdej zmianie konfiguracji)
    mat.dispose = () => {}
    materialCache.set(key, mat)
  }
  return mat
}

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
    <mesh position={position} rotation={rotation} castShadow receiveShadow material={sharedMaterial({ color, metalness, roughness, opacity, map, normalMap, normalScale: 0.22, envMapIntensity })}>
      <boxGeometry args={size} />
    </mesh>
  )
}

export function RoundedPiece({
  size,
  position,
  rotation = [0, 0, 0],
  color,
  map,
  normalMap,
  roughnessMap,
  metalness = 0.10,
  roughness = 0.55,
  radius = 0.006,
}: {
  size: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  map?: Texture
  normalMap?: Texture
  roughnessMap?: Texture
  metalness?: number
  roughness?: number
  radius?: number
}) {
  return (
    <RoundedBox args={size} position={position} rotation={rotation} radius={Math.min(radius, size[0] / 5, size[1] / 5)} smoothness={2} castShadow receiveShadow
      material={sharedMaterial({ color, map, normalMap, roughnessMap, normalScale: 0.6, metalness, roughness, envMapIntensity: 1.15 })} />
  )
}
