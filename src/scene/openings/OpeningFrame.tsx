import type { OpeningHandle, OpeningPlacement, OpeningProfile } from '../../types'
import { defaultHandle, defaultProfile } from './openingDefaults'
import { openingSill } from '../geometry'
import { Box, RoundedPiece } from '../materials/primitives'

/** Widoczna szerokość ramy [m] dla systemu profili. */
const PROFILE_FACE: Record<OpeningProfile, number> = {
  'alu-slim': 0.05,
  'alu-standard': 0.062,
  pvc: 0.075,
}

const STEEL = { color: '#c3c7c8', metalness: 0.88, roughness: 0.2 }

/** Szyba zespolona: ciemny pakiet odbijający HDRI. Za szybą ciemne wnętrze — kontrast dla odbić. */
function GlassPane({ width, height }: { width: number; height: number }) {
  return (
    <>
      <Box size={[width * 0.99, height * 0.99, 0.025]} position={[0, 0, -0.205]} color="#16191b" metalness={0} roughness={0.94} />
      <Box size={[width * 0.99, 0.055, 0.26]} position={[0, -height / 2 + 0.03, -0.105]} color="#292a28" metalness={0} roughness={0.9} />
      <mesh position={[0, 0, -0.011]}>
        <boxGeometry args={[width, height, 0.012]} />
        {/* Szkło zespolone z powłoką niskoemisyjną: na zdjęciach z realizacji działa prawie jak lustro
            (jasne otoczenie, ciemne wnętrze). Częściowo metaliczna powierzchnia odtwarza ten efekt
            stabilnie zarówno w rasteryzacji, jak i w path tracerze. */}
        <meshPhysicalMaterial
          color="#5d6b74"
          roughness={0.015}
          metalness={0.82}
          envMapIntensity={1.6}
          clearcoat={1}
          clearcoatRoughness={0}
        />
      </mesh>
    </>
  )
}

function Handle({ kind, x, height, side }: { kind: OpeningHandle; x: number; height: number; side: 1 | -1 }) {
  if (kind === 'none') return null
  if (kind === 'lever') {
    return (
      <>
        <Box size={[0.03, 0.17, 0.012]} position={[x, 0.0, 0.07]} {...STEEL} />
        <Box size={[0.13, 0.019, 0.019]} position={[x - side * 0.055, 0.03, 0.09]} {...STEEL} />
      </>
    )
  }
  const length = Math.min(1.2, height * 0.48)
  return (
    <>
      <Box size={[0.026, length, 0.026]} position={[x, 0.02, 0.095]} {...STEEL} />
      {[-1, 1].map((k) => (
        <Box key={k} size={[0.016, 0.016, 0.05]} position={[x, 0.02 + k * (length / 2 - 0.08), 0.07]} {...STEEL} />
      ))}
    </>
  )
}

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
  const frame = opening.frameColor ?? '#2b3033'
  const isDoor = opening.kind.startsWith('door-')
  const profile = defaultProfile(opening)
  const rail = PROFILE_FACE[profile]
  const frameDepth = 0.07
  const innerW = Math.max(0.12, opening.width - rail * 2)
  const innerH = Math.max(0.12, opening.height - rail * 2)
  const z = depth / 2 + 0.018
  const hingeSide: 1 | -1 = opening.hinge === 'right' ? 1 : -1
  const handle = defaultHandle(opening)
  const frameMat = { color: frame, metalness: profile === 'pvc' ? 0.05 : 0.3, roughness: profile === 'pvc' ? 0.62 : 0.52 }

  if (opening.kind === 'door-full') {
    return (
      <group position={[opening.center, y, z]}>
        <RoundedPiece size={[opening.width, opening.height, 0.058]} position={[0, 0, 0]} color={frame} metalness={0.34} roughness={0.46} radius={0.004} />
        <Handle kind={handle} x={-hingeSide * (opening.width / 2 - 0.1)} height={opening.height} side={hingeSide} />
        {[-0.62, 0, 0.62].map((hy) => (
          <Box key={'full-hinge-' + hy} size={[0.028, 0.085, 0.028]} position={[hingeSide * (opening.width / 2 - 0.025), hy, 0.045]} color="#202426" metalness={0.56} roughness={0.3} />
        ))}
        <Box size={[opening.width, 0.035, 0.075]} position={[0, -opening.height / 2 + 0.018, -0.005]} color="#111315" metalness={0.42} roughness={0.4} />
      </group>
    )
  }

  // skrzydło drzwi: widoczna rama skrzydła wewnątrz ościeżnicy, cofnięta o kilka mm
  const sash = isDoor ? 0.055 : 0
  const glassW = Math.max(0.1, innerW - sash * 2)
  const glassH = Math.max(0.1, innerH - sash * 2)

  return (
    <group position={[opening.center, y, z]}>
      <GlassPane width={glassW} height={glassH} />
      {/* ościeżnica */}
      <Box size={[rail, opening.height, frameDepth]} position={[-opening.width / 2 + rail / 2, 0, 0.02]} {...frameMat} />
      <Box size={[rail, opening.height, frameDepth]} position={[opening.width / 2 - rail / 2, 0, 0.02]} {...frameMat} />
      <Box size={[innerW, rail, frameDepth]} position={[0, opening.height / 2 - rail / 2, 0.02]} {...frameMat} />
      <Box size={[innerW, rail, frameDepth]} position={[0, -opening.height / 2 + rail / 2, 0.02]} {...frameMat} />
      {/* skrzydło (drzwi) */}
      {isDoor && (
        <>
          <Box size={[sash, innerH, 0.06]} position={[-innerW / 2 + sash / 2, 0, 0.012]} {...frameMat} />
          <Box size={[sash, innerH, 0.06]} position={[innerW / 2 - sash / 2, 0, 0.012]} {...frameMat} />
          <Box size={[innerW - sash * 2, sash, 0.06]} position={[0, innerH / 2 - sash / 2, 0.012]} {...frameMat} />
          <Box size={[innerW - sash * 2, sash * 1.6, 0.06]} position={[0, -innerH / 2 + sash * 0.8, 0.012]} {...frameMat} />
        </>
      )}
      {opening.kind === 'door-double' && <Box size={[0.06, innerH, 0.066]} position={[0, 0, 0.024]} {...frameMat} />}
      {opening.kind === 'alu-window' && <Box size={[0.05, innerH, 0.066]} position={[opening.width * 0.18, 0, 0.024]} {...frameMat} />}
      {opening.kind === 'pvc-window' && (
        <>
          <Box size={[0.042, innerH, 0.064]} position={[0, 0, 0.024]} {...frameMat} />
          <Box size={[innerW, 0.042, 0.064]} position={[0, 0, 0.024]} {...frameMat} />
        </>
      )}
      {isDoor && (
        <>
          {opening.kind === 'door-double' ? (
            <>
              <Handle kind={handle} x={-0.08} height={opening.height} side={1} />
              <Handle kind={handle} x={0.08} height={opening.height} side={-1} />
            </>
          ) : (
            <Handle kind={handle} x={-hingeSide * (opening.width / 2 - rail - 0.09)} height={opening.height} side={hingeSide} />
          )}
          {[-0.62, 0, 0.62].map((hy) => (
            <Box
              key={'hinge-' + hy}
              size={[0.03, 0.09, 0.03]}
              position={[hingeSide * (opening.width / 2 - rail * 0.5), hy, 0.062]}
              color="#8f989d"
              metalness={0.7}
              roughness={0.24}
            />
          ))}
          <Box size={[opening.width, 0.035, 0.075]} position={[0, -opening.height / 2 + 0.018, 0.006]} color="#111315" metalness={0.45} roughness={0.38} />
        </>
      )}
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
