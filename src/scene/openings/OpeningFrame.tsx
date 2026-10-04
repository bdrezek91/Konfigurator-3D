import type { OpeningHandle, OpeningPlacement, OpeningProfile } from '../../types'
import { defaultHandle, defaultProfile } from './openingDefaults'
import { openingSill } from '../geometry'
import { Box, RoundedPiece } from '../materials/primitives'
import { m, PHYS } from '../../physical/spec'
import { DEFAULT_FRAME_COLOR } from '../../components'

/** Widoczna szerokość ramy [m] dla systemu profili. */
const PROFILE_FACE: Record<OpeningProfile, number> = {
  'alu-slim': 0.05,
  // zdjęcie 11: widoczna rama FIX 55–75 mm
  'alu-standard': m(PHYS.joinery.fixFrameFace),
  pvc: 0.075,
}

const STEEL = { color: '#c3c7c8', metalness: 0.88, roughness: 0.2 }

/**
 * Szyba zespolona (2 tafle 4 mm + ramka): szkło przezroczyste z odbiciem Fresnela — na wprost widać jasne wnętrze
 * (białe ściany 9010, podłoga), pod ostrym kątem odbija niebo i otoczenie (zdjęcie 163 i większość realizacji).
 * Wcześniej: metaliczne „lustro” z ciemną płytą za szybą — nierealistyczne przy jasnym wnętrzu.
 */
function GlassPane({ width, height }: { width: number; height: number }) {
  return (
    <>
      {/* jedna tafla z transmisją (pakiet 4/16/4 jako jedno szkło o grubości 24 mm): dwie tafle z transmisją
          w rasteryzacji dawały mleczny, rozmyty obraz — na zdjęciach szyba jest przejrzysta z wyraźnym odbiciem */}
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[width, height, 0.006]} />
        <meshPhysicalMaterial
          color="#f6faf8"
          metalness={0}
          roughness={0}
          transmission={1}
          thickness={0.024}
          ior={1.52}
          specularIntensity={1}
          envMapIntensity={1.6}
          // przepuszczalność światła pakietu 4/16/4 low-E: LT ≈ 0,78 (ASSUMPTION, typowo 0,70–0,80; trzyszybowy ~0,70);
          // tłumienie = attenuationColor^(grubość / dystans) → kolor ≈ 0,78 (liniowo), lekko zielonkawy jak szkło float
          attenuationColor="#e2ebe6"
          attenuationDistance={0.024}
        />
      </mesh>
      {/* ramka dystansowa pakietu (ciemna, widoczna na obwodzie szyby) */}
      <Box size={[width, 0.012, 0.016]} position={[0, height / 2 - 0.006, -0.016]} color="#1b1d1f" metalness={0.4} roughness={0.5} />
      <Box size={[width, 0.012, 0.016]} position={[0, -height / 2 + 0.006, -0.016]} color="#1b1d1f" metalness={0.4} roughness={0.5} />
      <Box size={[0.012, height, 0.016]} position={[-width / 2 + 0.006, 0, -0.016]} color="#1b1d1f" metalness={0.4} roughness={0.5} />
      <Box size={[0.012, height, 0.016]} position={[width / 2 - 0.006, 0, -0.016]} color="#1b1d1f" metalness={0.4} roughness={0.5} />
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

/** Obróbka ościeża: wykończenie głębokości otworu od ramy do lica okładziny. */
function Reveal({ width, height, depth, z, color, sill }: { width: number; height: number; depth: number; z: number; color: string; sill: boolean }) {
  if (depth <= 0.004) return null
  const t = 0.008
  const mat = { color, metalness: 0.3, roughness: 0.5 }
  return (
    <>
      <Box size={[t, height + t * 2, depth]} position={[-width / 2 - t / 2, 0, z + depth / 2]} {...mat} />
      <Box size={[t, height + t * 2, depth]} position={[width / 2 + t / 2, 0, z + depth / 2]} {...mat} />
      <Box size={[width, t, depth]} position={[0, height / 2 + t / 2, z + depth / 2]} {...mat} />
      {sill && <Box size={[width + 0.04, t, depth + 0.03]} position={[0, -height / 2 - t / 2, z + (depth + 0.03) / 2]} {...mat} />}
    </>
  )
}

export function OpeningFrame({
  opening,
  floorOffset,
  depth = 0.10,
  revealDepth = 0,
  revealColor = DEFAULT_FRAME_COLOR,
}: {
  opening: OpeningPlacement
  floorOffset: number
  depth?: number
  /** Głębokość ościeża przed ramą (np. grubość okładziny kasetonowej). */
  revealDepth?: number
  revealColor?: string
}) {
  const sill = openingSill(opening)
  const y = floorOffset + sill + opening.height / 2
  const frame = opening.frameColor ?? DEFAULT_FRAME_COLOR
  const isDoor = opening.kind.startsWith('door-')
  const profile = defaultProfile(opening)
  const rail = PROFILE_FACE[profile]
  const frameDepth = m(PHYS.joinery.frameDepth)
  const innerW = Math.max(0.12, opening.width - rail * 2)
  const innerH = Math.max(0.12, opening.height - rail * 2)
  // rama osadzona w otworze: lico ramy ≈ lico płyty, szyba cofnięta (cień w ościeżu jak na nagraniach)
  const z = depth / 2 - 0.045
  const frameFace = 0.055
  const hingeSide: 1 | -1 = opening.hinge === 'right' ? 1 : -1
  const handle = defaultHandle(opening)
  const frameMat = { color: frame, metalness: profile === 'pvc' ? 0.05 : 0.12, roughness: profile === 'pvc' ? 0.62 : 0.42 }

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
  const sash = isDoor ? m(PHYS.joinery.doorSashFace) : 0
  const glassW = Math.max(0.1, innerW - sash * 2)
  const glassH = Math.max(0.1, innerH - sash * 2)

  return (
    <group position={[opening.center, y, z]}>
      <Reveal width={opening.width} height={opening.height} depth={revealDepth} z={frameFace} color={revealColor} sill={!isDoor} />
      <GlassPane width={glassW} height={glassH} />
      {/* ościeżnica */}
      {/* profile aluminiowe: zaokrąglone krawędzie 2 mm (refleks na krawędzi jak na zdjęciach), narożniki na styk */}
      <RoundedPiece size={[rail, opening.height, frameDepth]} position={[-opening.width / 2 + rail / 2, 0, 0.02]} {...frameMat} radius={0.002} />
      <RoundedPiece size={[rail, opening.height, frameDepth]} position={[opening.width / 2 - rail / 2, 0, 0.02]} {...frameMat} radius={0.002} />
      <RoundedPiece size={[innerW, rail, frameDepth]} position={[0, opening.height / 2 - rail / 2, 0.02]} {...frameMat} radius={0.002} />
      <RoundedPiece size={[innerW, rail, frameDepth]} position={[0, -opening.height / 2 + rail / 2, 0.02]} {...frameMat} radius={0.002} />
      {/* skrzydło (drzwi) */}
      {isDoor && (
        <>
          {/* skrzydło wysunięte 6 mm przed ościeżnicę (stopień widoczny na zdjęciu 163), cokół skrzydła 1,6 × szerokości */}
          <RoundedPiece size={[sash, innerH, 0.06]} position={[-innerW / 2 + sash / 2, 0, 0.026]} {...frameMat} radius={0.002} />
          <RoundedPiece size={[sash, innerH, 0.06]} position={[innerW / 2 - sash / 2, 0, 0.026]} {...frameMat} radius={0.002} />
          <RoundedPiece size={[innerW - sash * 2, sash, 0.06]} position={[0, innerH / 2 - sash / 2, 0.026]} {...frameMat} radius={0.002} />
          <RoundedPiece size={[innerW - sash * 2, sash * 1.6, 0.06]} position={[0, -innerH / 2 + sash * 0.8, 0.026]} {...frameMat} radius={0.002} />
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
