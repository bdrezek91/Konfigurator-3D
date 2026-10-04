import type { ReactNode } from 'react'
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

const STEEL = { color: '#aeb3b5', metalness: 0.85, roughness: 0.28 }

/**
 * Szyba zespolona 4/16/4 low-E jako jedna tafla z transmisją (dwie tafle z transmisją w rasteryzacji dawały mleczny obraz).
 * Odbicie: pakiet ma 4 powierzchnie szkło–powietrze (≈ 4 % każda) i powłokę low-E → na wprost ≈ 12–15 % (ASSUMPTION,
 * typowo 11–16 % wg kart pakietów), przy jednej powierzchni modelu F0 = 4 % — stąd specularIntensity 3,4 (F0 ≈ 0,14),
 * Fresnel dalej rośnie ku krawędzi kadru. Na zdjęciach (11, 12, 163, 207) szyba odbija grunt, niebo i otoczenie,
 * a wnętrze widać za odbiciem — nie jest mleczna ani niewidoczna.
 * Transmisja: LT pakietu ≈ 0,78; wnętrze w rasteryzacji dostaje pełne światło HDRI (bez zasłonięcia przez dach i ściany),
 * więc przez szybę wyglądało jak oświetlone na zewnątrz — szare, płaskie. Tłumienie ≈ 0,5 (liniowo) oddaje jasność wnętrza
 * względem elewacji ze zdjęć (strojenie wizualne, nie wielkość fizyczna szkła).
 */
function GlassPane({ width, height }: { width: number; height: number }) {
  return (
    <>
      <mesh position={[0, 0, -0.012]}>
        <boxGeometry args={[width, height, 0.006]} />
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0}
          roughness={0}
          transmission={1}
          thickness={0.024}
          ior={1.52}
          specularIntensity={3.4}
          // lekko zielonkawy jak szkło float (krawędź tafli), tłumienie = attenuationColor^(grubość / dystans)
          attenuationColor="#9fb0a8"
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
        {/* szyld wąski z wkładką (zdjęcia 11, 163): ~28 × 200 mm, klamka ~120 mm */}
        <Box size={[0.026, 0.2, 0.008]} position={[x, -0.03, 0.06]} {...STEEL} />
        <Box size={[0.016, 0.016, 0.03]} position={[x, 0.03, 0.074]} {...STEEL} />
        <Box size={[0.12, 0.016, 0.016]} position={[x - side * 0.052, 0.03, 0.093]} {...STEEL} />
        <Box size={[0.014, 0.03, 0.004]} position={[x, -0.09, 0.066]} color="#2a2d2f" metalness={0.6} roughness={0.35} />
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

/** Obróbka ościeża: wykończenie głębokości otworu od ramy do lica okładziny. Przy wspólnym słupku (sąsiedni element
 *  stolarki) bez ościeża po tej stronie — wcześniej pas 8 mm sterczał przed słupkiem między drzwiami a FIX. */
function Reveal({ width, height, depth, z, color, sill, left, right }: {
  width: number; height: number; depth: number; z: number; color: string; sill: boolean; left: boolean; right: boolean
}) {
  if (depth <= 0.004) return null
  const t = 0.008
  // wąskie ścianki prawie równoległe do słońca: bez odbierania cienia (trądzik cieni w kropkowane pasy)
  const mat = { color, metalness: 0.3, roughness: 0.5, receiveShadow: false }
  return (
    <>
      {left && <Box size={[t, height + t * 2, depth]} position={[-width / 2 - t / 2, 0, z + depth / 2]} {...mat} />}
      {right && <Box size={[t, height + t * 2, depth]} position={[width / 2 + t / 2, 0, z + depth / 2]} {...mat} />}
      <Box size={[width + (left ? 0 : t) + (right ? 0 : t), t, depth]} position={[((right ? 0 : t) - (left ? 0 : t)) / 2, height / 2 + t / 2, z + depth / 2]} {...mat} />
      {sill && <Box size={[width + 0.04, t, depth + 0.03]} position={[0, -height / 2 - t / 2, z + (depth + 0.03) / 2]} {...mat} />}
    </>
  )
}

type FrameMat = { color: string; metalness: number; roughness: number }

/**
 * Rama z profili aluminiowych (zdjęcia 11, 12, 163): każdy profil = część zewnętrzna (pełna głębokość) + część wewnętrzna
 * cofnięta o 8 mm (stopień), listwa przyszybowa cofnięta o 12 mm i czarna uszczelka przy szybie. Bez detali
 * niewidocznych z normalnej odległości (komory, przekładki termiczne).
 */
function ProfileRing({ w, h, faces, depth, zFront, mat, glazed = true }: {
  w: number; h: number; faces: { l: number; r: number; t: number; b: number }; depth: number; zFront: number; mat: FrameMat
  /** false: ościeżnica drzwi — szybę trzyma skrzydło, listwa i uszczelka tylko w skrzydle */
  glazed?: boolean
}) {
  const step = 0.008
  const bead = 0.014
  const out: ReactNode[] = []
  const zc = zFront - depth / 2
  const zcIn = zFront - step - (depth - step) / 2
  const iw = w - faces.l - faces.r
  const ih = h - faces.t - faces.b
  // pion: część zewnętrzna 60 % szerokości, wewnętrzna 40 % cofnięta
  for (const [side, f] of [[-1, faces.l], [1, faces.r]] as const) {
    const xo = side * (w / 2 - f * 0.3)
    const xi = side * (w / 2 - f * 0.8)
    out.push(<Box key={'vo' + side} size={[f * 0.6, h, depth]} position={[xo, 0, zc]} {...mat} />)
    out.push(<Box key={'vi' + side} size={[f * 0.4, h - 0.002, depth - step]} position={[xi, 0, zcIn]} {...mat} />)
    if (glazed) out.push(<Box key={'vb' + side} size={[bead, ih, 0.014]} position={[side * (iw / 2 - bead / 2), (faces.b - faces.t) / 2, zFront - 0.019]} {...mat} />)
    if (glazed) out.push(<Box key={'vg' + side} size={[0.003, ih - 2 * bead, 0.006]} position={[side * (iw / 2 - bead - 0.0015), (faces.b - faces.t) / 2, zFront - 0.026]} color="#0c0d0e" metalness={0} roughness={0.8} />)
  }
  for (const [side, f] of [[1, faces.t], [-1, faces.b]] as const) {
    const yo = side * (h / 2 - f * 0.3)
    const yi = side * (h / 2 - f * 0.8)
    const xMid = (faces.l - faces.r) / 2
    out.push(<Box key={'ho' + side} size={[iw, f * 0.6, depth]} position={[xMid, yo, zc]} {...mat} />)
    out.push(<Box key={'hi' + side} size={[iw, f * 0.4, depth - step]} position={[xMid, yi, zcIn]} {...mat} />)
    const yb = side > 0 ? h / 2 - faces.t - bead / 2 : -h / 2 + faces.b + bead / 2
    if (glazed) out.push(<Box key={'hb' + side} size={[iw - 2 * bead, bead, 0.014]} position={[xMid, yb, zFront - 0.019]} {...mat} />)
    if (glazed) out.push(<Box key={'hg' + side} size={[iw - 2 * bead, 0.003, 0.006]} position={[xMid, yb - side * (bead / 2 + 0.0015), zFront - 0.026]} color="#0c0d0e" metalness={0} roughness={0.8} />)
  }
  return <>{out}</>
}

export function OpeningFrame({
  opening,
  floorOffset,
  depth = 0.10,
  revealDepth = 0,
  revealColor = DEFAULT_FRAME_COLOR,
  joinLeft = false,
  joinRight = false,
}: {
  opening: OpeningPlacement
  floorOffset: number
  depth?: number
  /** sąsiedni element stolarki przylega z lewej/prawej — wspólny słupek (2 × 0,6 profilu), nie podwójna rama */
  joinLeft?: boolean
  joinRight?: boolean
  /** Głębokość ościeża przed ramą (np. grubość okładziny kasetonowej). */
  revealDepth?: number
  revealColor?: string
}) {
  const sill = openingSill(opening)
  const y = floorOffset + sill + opening.height / 2
  const frame = opening.frameColor ?? DEFAULT_FRAME_COLOR
  const isDoor = opening.kind.startsWith('door-')
  const double = opening.kind === 'door-double'
  const profile = defaultProfile(opening)
  const rail = PROFILE_FACE[profile]
  const frameDepth = m(PHYS.joinery.frameDepth)
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

  // skrzydło drzwi: wewnątrz ościeżnicy, wysunięte 6 mm (stopień — zdjęcia 11, 163); cokół skrzydła 1,8 × szerokości
  const sash = isDoor ? m(PHYS.joinery.doorSashFace) : 0
  const faces = { l: joinLeft ? rail * 0.6 : rail, r: joinRight ? rail * 0.6 : rail, t: rail, b: isDoor ? rail * 0.55 : rail }
  const innerW2 = opening.width - faces.l - faces.r
  const innerH2 = opening.height - faces.t - faces.b
  const frameFront = 0.046
  const sashFront = 0.052
  const glassW = Math.max(0.1, innerW2 - sash * 2 + 0.024)
  const glassH = Math.max(0.1, innerH2 - sash * 2.8 + 0.024)
  const glassY = isDoor ? (faces.b - faces.t) / 2 + sash * 0.4 : (faces.b - faces.t) / 2

  return (
    <group position={[opening.center, y, z]}>
      <Reveal width={opening.width} height={opening.height} depth={revealDepth} z={frameFace} color={revealColor} sill={!isDoor} left={!joinLeft} right={!joinRight} />
      {double ? (
        [-1, 1].map((k) => (
          <group key={'g' + k} position={[(faces.l - faces.r) / 2 + k * innerW2 / 4, glassY, sashFront - 0.038]}>
            <GlassPane width={Math.max(0.1, innerW2 / 2 - sash * 2 + 0.024)} height={glassH} />
          </group>
        ))
      ) : (
        <group position={[(faces.l - faces.r) / 2, glassY, (isDoor ? sashFront : frameFront) - 0.038]}>
          <GlassPane width={glassW} height={glassH} />
        </group>
      )}
      {/* ościeżnica z profilu (stopień, listwa przyszybowa, uszczelka) */}
      <ProfileRing w={opening.width} h={opening.height} faces={faces} depth={frameDepth} zFront={frameFront} mat={frameMat} glazed={!isDoor} />
      {/* skrzydło drzwi */}
      {isDoor && (
        <group position={[(faces.l - faces.r) / 2, (faces.b - faces.t) / 2, 0]}>
          {(double ? [-1, 1] : [0]).map((k) => (
            <group key={'s' + k} position={[k * innerW2 / 4, 0, 0]}>
              <ProfileRing w={double ? innerW2 / 2 : innerW2} h={innerH2} faces={{ l: sash, r: sash, t: sash, b: sash * 1.8 }} depth={m(PHYS.joinery.sashDepthPE52)} zFront={sashFront} mat={frameMat} />
            </group>
          ))}
        </group>
      )}
      {/* słupki / ślemiona w głębokości ramy (wcześniej wystawały 11 mm przed lico ościeżnicy) */}
      {opening.kind === 'alu-window' && <Box size={[0.05, innerH2, frameDepth]} position={[opening.width * 0.18, (faces.b - faces.t) / 2, frameFront - frameDepth / 2]} {...frameMat} />}
      {opening.kind === 'pvc-window' && (
        <>
          <Box size={[0.042, innerH2, frameDepth]} position={[0, 0, frameFront - frameDepth / 2]} {...frameMat} />
          <Box size={[innerW2, 0.042, frameDepth]} position={[0, 0, frameFront - frameDepth / 2]} {...frameMat} />
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
          {/* zawiasy nawierzchniowe (3 szt., zdjęcia 11/12): małe, srebrne, na styku ościeżnicy i skrzydła */}
          {[-0.75, 0.05, 0.75].map((hy) => (
            <Box
              key={'hinge-' + hy}
              size={[0.018, 0.07, 0.016]}
              position={[hingeSide * (opening.width / 2 - (hingeSide > 0 ? faces.r : faces.l)), hy, 0.056]}
              color="#a3a9ac"
              metalness={0.75}
              roughness={0.3}
            />
          ))}
          {/* próg aluminiowy niski (20 mm), w kolorze ramy */}
          <Box size={[innerW2, 0.02, 0.07]} position={[(faces.l - faces.r) / 2, -opening.height / 2 + 0.01, 0.012]} {...frameMat} />
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
