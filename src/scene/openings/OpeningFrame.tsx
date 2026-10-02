import { type OpeningPlacement } from '../../types'
import { openingSill } from '../geometry'
import { Box, RoundedPiece } from '../materials/primitives'
import { glassReflectionTexture } from '../materials/textures'

export function OpeningFrame({
  opening,
  floorOffset,
  depth = 0.10,
}: {
  opening: OpeningPlacement
  floorOffset: number
  depth?: number
}) {
  const sill = openingSill(opening)
  const y = floorOffset + sill + opening.height / 2
  const frame = opening.frameColor ?? '#17191b'
  const isDoor = opening.kind.startsWith('door-')
  const gallery03Opening = opening.id.startsWith('G03-')
  const rail = gallery03Opening ? 0.060 : Math.min(0.068, Math.max(0.052, opening.width * 0.055))
  const frameDepth = gallery03Opening ? 0.070 : 0.060
  const innerW = Math.max(0.12, opening.width - rail * 2)
  const innerH = Math.max(0.12, opening.height - rail * 2)
  const z = depth / 2 + 0.018

  if (opening.kind === 'door-full') {
    return (
      <group position={[opening.center, y, z]}>
        <RoundedPiece size={[opening.width, opening.height, 0.058]} position={[0, 0, 0]} color={frame} metalness={0.34} roughness={0.46} radius={0.004} />
        <Box size={[0.12, 0.018, 0.018]} position={[opening.width * 0.28, 0.02, 0.052]} color="#24282a" metalness={0.72} roughness={0.22} />
        <Box size={[0.020, 0.020, 0.045]} position={[opening.width * 0.23, 0.02, 0.035]} color="#24282a" metalness={0.72} roughness={0.22} />
        {[-0.62, 0, 0.62].map((hy) => (
          <Box key={'full-hinge-' + hy} size={[0.028, 0.085, 0.028]} position={[opening.width / 2 - 0.025, hy, 0.045]} color="#202426" metalness={0.56} roughness={0.30} />
        ))}
        <Box size={[opening.width, 0.035, 0.075]} position={[0, -opening.height / 2 + 0.018, -0.005]} color="#111315" metalness={0.42} roughness={0.40} />
      </group>
    )
  }

  return (
    <group position={[opening.center, y, z]}>
      {gallery03Opening && (
        <>
          <Box
            size={[innerW * 0.99, innerH * 0.99, 0.025]}
            position={[0, 0, -0.205]}
            color="#16191b"
            metalness={0}
            roughness={0.94}
          />
          <Box
            size={[innerW * 0.99, 0.055, 0.26]}
            position={[0, -innerH / 2 + 0.030, -0.105]}
            color="#292a28"
            metalness={0}
            roughness={0.90}
          />
        </>
      )}
      <mesh position={[0, 0, gallery03Opening ? -0.011 : -0.002]} castShadow receiveShadow>
        <boxGeometry args={[innerW, innerH, gallery03Opening ? 0.012 : 0.016]} />
        {gallery03Opening ? (
          <meshPhysicalMaterial
            color="#1a2228"
            roughness={0.02}
            metalness={0}
            envMapIntensity={2.7}
            ior={1.5}
            clearcoat={0.30}
            clearcoatRoughness={0.025}
          />
        ) : (
          <meshPhysicalMaterial
            color="#526975"
            transparent
            opacity={0.38}
            roughness={0.08}
            metalness={0.02}
            transmission={0.50}
            ior={1.46}
            thickness={0.014}
            clearcoat={0.52}
            clearcoatRoughness={0.06}
            envMapIntensity={1.85}
          />
        )}
      </mesh>
      {!gallery03Opening && (
        <mesh position={[0, 0, 0.010]}>
          <planeGeometry args={[innerW * 0.985, innerH * 0.985]} />
          <meshBasicMaterial
            map={glassReflectionTexture()}
            transparent
            opacity={0.14}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
      <Box size={[rail, opening.height, frameDepth]} position={[-opening.width / 2 + rail / 2, 0, 0.020]} color={frame} metalness={gallery03Opening ? 0.30 : 0.42} roughness={gallery03Opening ? 0.55 : 0.44} />
      <Box size={[rail, opening.height, frameDepth]} position={[opening.width / 2 - rail / 2, 0, 0.020]} color={frame} metalness={gallery03Opening ? 0.30 : 0.42} roughness={gallery03Opening ? 0.55 : 0.44} />
      <Box size={[innerW, rail, frameDepth]} position={[0, opening.height / 2 - rail / 2, 0.020]} color={frame} metalness={gallery03Opening ? 0.30 : 0.42} roughness={gallery03Opening ? 0.55 : 0.44} />
      <Box size={[innerW, rail, frameDepth]} position={[0, -opening.height / 2 + rail / 2, 0.020]} color={frame} metalness={gallery03Opening ? 0.30 : 0.42} roughness={gallery03Opening ? 0.55 : 0.44} />
      {opening.kind === 'door-double' && <Box size={[0.052, innerH, 0.064]} position={[0, 0, 0.024]} color={frame} metalness={0.42} roughness={0.44} />}
      {opening.kind === 'alu-window' && <Box size={[0.046, innerH, 0.064]} position={[opening.width * 0.18, 0, 0.024]} color={frame} metalness={0.42} roughness={0.44} />}
      {opening.kind === 'pvc-window' && (
        <>
          <Box size={[0.042, innerH, 0.064]} position={[0, 0, 0.024]} color={frame} metalness={0.30} roughness={0.48} />
          <Box size={[innerW, 0.042, 0.064]} position={[0, 0, 0.024]} color={frame} metalness={0.30} roughness={0.48} />
        </>
      )}
      {isDoor && (
        gallery03Opening ? (
          <>
            <Box
              size={[0.018, 1.00, 0.026]}
              position={[opening.width / 2 - 0.11, 0.02, 0.082]}
              color="#c6c9c8"
              metalness={0.86}
              roughness={0.18}
            />
            <Box
              size={[0.035, 0.028, 0.050]}
              position={[opening.width / 2 - 0.11, -0.49, 0.060]}
              color="#b7bcbd"
              metalness={0.78}
              roughness={0.20}
            />
            {[-0.62, 0, 0.62].map((hy) => (
              <Box
                key={'hinge-gallery03-' + hy}
                size={[0.030, 0.085, 0.030]}
                position={[-opening.width / 2 + rail * 0.46, hy, 0.060]}
                color="#8f989d"
                metalness={0.70}
                roughness={0.24}
              />
            ))}
          </>
        ) : (
          <>
            <Box size={[0.12, 0.018, 0.018]} position={[opening.width * 0.28, 0.02, 0.070]} color="#24282a" metalness={0.72} roughness={0.22} />
            <Box size={[0.020, 0.020, 0.045]} position={[opening.width * 0.23, 0.02, 0.053]} color="#24282a" metalness={0.72} roughness={0.22} />
            {[-0.62, 0, 0.62].map((hy) => (
              <Box
                key={'hinge-' + hy}
                size={[0.028, 0.085, 0.028]}
                position={[opening.width / 2 - rail * 0.45, hy, 0.058]}
                color="#202426"
                metalness={0.56}
                roughness={0.30}
              />
            ))}
          </>
        )
      )}
      {isDoor && <Box size={[opening.width, 0.035, 0.075]} position={[0, -opening.height / 2 + 0.018, 0.006]} color="#111315" metalness={0.45} roughness={0.38} />}
      {opening.roller && (
        <RoundedPiece
          size={[opening.width + 0.09, 0.14, 0.105]}
          position={[0, opening.height / 2 + 0.086, 0.006]}
          color="#1a1d1f"
          metalness={0.36}
          roughness={0.45}
          radius={0.008}
        />
      )}
    </group>
  )
}
