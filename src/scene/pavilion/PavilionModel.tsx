import { arch } from '../../render/architecture'
import { PANEL_THICKNESS_M, type PavilionConfig, type ProjectGeometry, type WallSide } from '../../types'
import type { PavilionView } from '../camera/views'
import { DampolFrameLocal, DecorLocal, FacadeCladdingFromModel, FoundationSupports, PanelProfileLocal } from '../facade/Facade'
import { facadeKindForWall } from '../facade/facadeKind'
import { envelope, makeWallShape, wallTransform } from '../geometry'
import { BOARD_KINDS, geometryOf } from '../../components'
import { Box, RoundedPiece } from '../materials/primitives'
import { renderMetalColor } from '../materials/textures'
import { isRal9005, RAL_9010_HEX, RENDER } from '../../physical/spec'
import { flatNormalMap, profileNormalMap, ROOF_TRAPEZOIDS, surfaceProfileDef, type RoofTrapezoidDef } from '../materials/profiles'
import { OpeningFrame } from '../openings/OpeningFrame'
import { useLighting } from '../environment/lighting'
import { type ReactNode } from 'react'
import { frameDims } from '../../construction/frame'
import { System1Body } from '../../construction/render'
import { m, PHYS } from '../../physical/spec'
import { Shape } from 'three'
import { sectionJoinerySupports } from '../../construction/joinery/build'
import { isVerticalLamella } from '../../construction/facade/lamellas'

export type Props = { config: PavilionConfig; view?: PavilionView; hq?: boolean }

export function Wall({
  side,
  config,
  geometry,
  opacity,
}: {
  side: WallSide
  config: PavilionConfig
  geometry: ProjectGeometry
  opacity: number
}) {
  const transform = wallTransform(side, config)
  const openings = geometry.openings.filter((x) => x.wall === side)
  const facadeKind = facadeKindForWall(side, config, geometry)
  const legacyFacadeKinds = new Set(['cassette-black', 'cassette-square-graphite', 'cassette-rect-graphite', 'cassette-white'])
  // deska na ścianie z kasetonami poziomymi = kasetony z dekorem drewna (rysowane z elewacją, FacadeCladdingFromModel)
  // kaseton-deska w nowej ścieżce (tace w rendererze warstw, ComponentLayers) — tu bez pasów
  const boardTrays = arch(config).boardTrays
  // lamele pionowe w rendererze warstw (ComponentLayers) — tu tylko ukośne, „wąż”, ornament
  const lamellaParts = arch(config).lamellaParts
  const decor = geometry.decor.filter((x) => x.wall === side && !(facadeKind !== 'none' && legacyFacadeKinds.has(x.kind)) && !(facadeKind === 'cassette-horizontal' && BOARD_KINDS.has(x.kind)) && !(boardTrays && BOARD_KINDS.has(x.kind)) && !(lamellaParts && isVerticalLamella(x.kind)))
  const lights = geometry.exteriorLights?.filter((x) => x.wall === side) ?? []
  const lampK = useLighting().lampIntensity
  const { floorT } = envelope(config)
  const depth = PANEL_THICKNESS_M[config.wallPanel]
  const shape = makeWallShape(side, config, transform.span, openings)
  const hasCladding = facadeKind !== 'none'
  // System 1: płyty, rama i obróbki rysuje model produkcyjny (System1Body); tu tylko stolarka, elewacja i oświetlenie
  const system1 = frameDims(config).system1
  // przetłoczenie okładziny płyty: normal mapa z fizycznego profilu [mm] (pitch/głębokość producenta)
  const profileDef = hasCladding ? null : surfaceProfileDef(config.panelManufacturer, config.wallProfile)

  return (
    <group position={transform.position} rotation={transform.rotation}>
      {!system1 && <mesh position={[0, 0, -depth / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth, bevelEnabled: false, steps: 1 }]} />
        <meshStandardMaterial
          color={hasCladding ? (config.project === 'GALERIA/03' ? '#070a0d' : '#202528') : renderMetalColor(config.exteriorColor)}
          metalness={hasCladding ? 0.20 : 0.38}
          roughness={hasCladding ? 0.68 : isRal9005(config.exteriorColor) ? RENDER.blackMattRoughness.value : RENDER.panelSemiMattRoughness.value}
          normalMap={profileDef ? profileNormalMap(profileDef) : flatNormalMap()}
          envMapIntensity={hasCladding ? 0.55 : 1.05}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>}

      {!hasCladding && !system1 && (
        <PanelProfileLocal
          side={side}
          span={transform.span}
          config={config}
          openings={openings}
          wallDepth={depth}
        />
      )}

      {!hasCladding && !system1 && <DampolFrameLocal side={side} span={transform.span} config={config} wallDepth={depth} />}

      <DecorLocal
        decor={decor}
        openings={openings}
        wallDepth={depth}
        floorOffset={floorT}
      />

      {/* `sectionJoinery` (System 1): stolarka z przekrojów jest częścią modelu Systemu 1 (warstwa JOINERY w System1Body);
          tu tylko otwory spoza biblioteki przekrojów albo konstrukcje poza Systemem 1 */}
      {openings.filter((o) => !(system1 && arch(config).sectionJoinery && sectionJoinerySupports(o))).map((opening) => {
        // sąsiadujące elementy stolarki (przylegające ramy) — wspólny słupek, jak na zdjęciach 11/207
        const adj = (dir: -1 | 1) => openings.some((o) => o !== opening && Math.abs((o.center - dir * o.width / 2) - (opening.center + dir * opening.width / 2)) < 0.012)
        return (
          <OpeningFrame
            key={opening.id}
            opening={opening}
            floorOffset={floorT}
            depth={depth}
            // ościeże do lica kasetonu (taca 25 mm przykręcona do płyty)
            revealDepth={hasCladding ? m(PHYS.cassette.thickness) : 0}
            revealColor={renderMetalColor(config.flashingColor)}
            joinLeft={adj(-1)}
            joinRight={adj(1)}
          />
        )
      })}

      {lights.map((lamp, i) => (
        <group key={'light-' + i} position={[lamp.center, lamp.y, depth / 2 + 0.105]}>
          <RoundedPiece size={[0.13, 0.22, 0.07]} position={[0, 0, 0]} color="#202426" metalness={0.34} roughness={0.40} radius={0.012} />
          <mesh position={[0, 0, 0.044]}>
            <boxGeometry args={[0.074, 0.125, 0.018]} />
            <meshStandardMaterial color="#ffe8ad" emissive="#f2c96b" emissiveIntensity={0.6 + lampK * 1.4} roughness={0.24} />
          </mesh>
          <pointLight position={[0, -0.03, 0.10]} color="#ffd58a" intensity={lampK * 0.9} distance={lampK > 1 ? 3.2 : 1.6} decay={2} />
        </group>
      ))}
    </group>
  )
}

export function RoofRib({
  x,
  depth,
  y,
  color,
  trapezoid,
}: {
  x: number
  depth: number
  y: number
  color: string
  trapezoid: RoofTrapezoidDef
}) {
  // przekrój żebra wg katalogu producenta [mm → m]
  const b = trapezoid.baseMm / 2000
  const t = trapezoid.topMm / 2000
  const h = trapezoid.heightMm / 1000
  const shape = new Shape()
  shape.moveTo(-b, 0)
  shape.lineTo(-t, h)
  shape.lineTo(t, h)
  shape.lineTo(b, 0)
  shape.closePath()

  return (
    <mesh position={[x, y, -depth / 2]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false, steps: 1 }]} />
      <meshStandardMaterial color={color} metalness={0.34} roughness={0.44} envMapIntensity={1.05} />
    </mesh>
  )
}

export function RoofSystem({ config }: Props) {
  const { roofT, outerFront, outerBack, slope, roofDepth } = envelope(config)
  const centerY = (outerFront + outerBack) / 2 - roofT / 2
  const roofColor = renderMetalColor(config.flashingColor)
  const trapezoid = ROOF_TRAPEZOIDS[config.panelManufacturer]
  const ribSpacing = trapezoid.pitchMm / 1000
  const ribs: ReactNode[] = []
  for (let x = -config.length / 2 + 0.18; x < config.length / 2; x += ribSpacing) {
    ribs.push(<RoofRib key={'roof-rib-' + x.toFixed(2)} x={x} depth={roofDepth + 0.04} y={roofT / 2} color={roofColor} trapezoid={trapezoid} />)
  }

  const joints: ReactNode[] = []
  for (let x = -config.length / 2 + 1.05; x < config.length / 2; x += 1.05) {
    joints.push(
      <Box
        key={'roof-joint-' + x.toFixed(2)}
        size={[0.010, 0.010, roofDepth + 0.05]}
        position={[x, roofT / 2 + 0.006, 0]}
        color="#181b1d"
        roughness={0.45}
      />,
    )
  }

  return (
    <>
      <group position={[0, centerY, 0]} rotation={[-slope, 0, 0]}>
        <Box
          size={[config.length + 0.08, roofT, roofDepth + 0.08]}
          position={[0, 0, 0]}
          color={roofColor}
          metalness={0.34}
          roughness={0.48}
          envMapIntensity={1.05}
        />
        {config.roofProfile === 'trapezoid' && ribs}
        {joints}
        <Box
          size={[config.length + 0.12, 0.034, 0.070]}
          position={[0, roofT / 2 + 0.014, roofDepth / 2 + 0.028]}
          color={roofColor}
          metalness={0.42}
          roughness={0.40}
        />
        <Box
          size={[config.length + 0.12, 0.034, 0.070]}
          position={[0, roofT / 2 + 0.014, -roofDepth / 2 - 0.028]}
          color={roofColor}
          metalness={0.42}
          roughness={0.40}
        />
        {config.gutter && (
          <mesh position={[0, -roofT / 2 - 0.015, -roofDepth / 2 - 0.045]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, config.length + 0.10, 14]} />
            <meshStandardMaterial color="#24282a" metalness={0.42} roughness={0.42} />
          </mesh>
        )}
      </group>
      {config.gutter && (
        <group position={[config.length / 2 - 0.08, outerBack / 2 - 0.10, -config.width / 2 - 0.045]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.030, 0.030, Math.max(0.5, outerBack - 0.22), 14]} />
            <meshStandardMaterial color="#24282a" metalness={0.42} roughness={0.42} />
          </mesh>
          <mesh position={[0, -(outerBack - 0.22) / 2 - 0.05, 0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.055, 0.028, 10, 20, Math.PI / 2]} />
            <meshStandardMaterial color="#24282a" metalness={0.42} roughness={0.42} />
          </mesh>
        </group>
      )}
    </>
  )
}

export function FloorSystem({ config }: Props) {
  const { floorT } = envelope(config)
  const finishColor =
    config.floorFinish === 'concrete' ? '#9f9c95' :
    config.floorFinish === 'wood' ? '#8a6b4c' : '#666b6d'

  return (
    <group>
      <Box
        size={[config.length, floorT, config.width]}
        position={[0, floorT / 2, 0]}
        color="#34383b"
        metalness={0.08}
        roughness={0.68}
      />
      <Box
        size={[config.length - 0.10, 0.014, config.width - 0.10]}
        position={[0, floorT + 0.007, 0]}
        color={finishColor}
        roughness={config.floorFinish === 'wood' ? 0.78 : 0.88}
      />
    </group>
  )
}

export function Structure({ config }: Props) {
  const { outerFront, outerBack, slope, roofDepth } = envelope(config)
  const size = config.construction === 'angle50' ? 0.05 : config.construction === 'truss' ? 0.06 : 0.10
  const color = config.project === '81/08/26' ? '#e7e7e1' : '#141719'
  const x = config.length / 2 - 0.055
  const z = config.width / 2 - 0.055
  const avgTop = (outerFront + outerBack) / 2

  return (
    <group>
      <Box size={[size, outerFront, size]} position={[-x, outerFront / 2, z]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[size, outerFront, size]} position={[x, outerFront / 2, z]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[size, outerBack, size]} position={[-x, outerBack / 2, -z]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[size, outerBack, size]} position={[x, outerBack / 2, -z]} color={color} metalness={0.36} roughness={0.42} />

      <Box size={[config.length - 0.10, size, size]} position={[0, 0.09, z]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[config.length - 0.10, size, size]} position={[0, 0.09, -z]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[size, size, config.width - 0.10]} position={[x, 0.09, 0]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[size, size, config.width - 0.10]} position={[-x, 0.09, 0]} color={color} metalness={0.36} roughness={0.42} />

      <Box size={[config.length - 0.10, size, size]} position={[0, outerFront - 0.06, z]} color={color} metalness={0.36} roughness={0.42} />
      <Box size={[config.length - 0.10, size, size]} position={[0, outerBack - 0.06, -z]} color={color} metalness={0.36} roughness={0.42} />
      <Box
        size={[size, size, roofDepth - 0.10]}
        position={[x, avgTop - 0.06, 0]}
        rotation={[-slope, 0, 0]}
        color={color}
        metalness={0.36}
        roughness={0.42}
      />
      <Box
        size={[size, size, roofDepth - 0.10]}
        position={[-x, avgTop - 0.06, 0]}
        rotation={[-slope, 0, 0]}
        color={color}
        metalness={0.36}
        roughness={0.42}
      />
    </group>
  )
}

export function SlopedCeiling({ config }: Props) {
  const { floorT, slope, roofDepth } = envelope(config)
  const y = floorT + (config.frontHeight + config.backHeight) / 2
  const color =
    config.interiorFinish === 'black' ? '#292c2e' :
    config.interiorFinish === 'concrete' ? '#b7b4ad' :
    config.interiorFinish === 'oak' ? '#9b7651' :
    config.interiorFinish === 'walnut' ? '#654936' : RAL_9010_HEX

  return (
    <Box
      size={[config.length - 0.18, 0.028, roofDepth - 0.15]}
      position={[0, y, 0]}
      rotation={[-slope, 0, 0]}
      color={color}
      roughness={0.88}
      opacity={0.92}
    />
  )
}

export function ExteriorHVAC({ config }: Props) {
  if (!config.airConditioning) return null
  const color = config.hvacColor === 'white' ? '#e8e8e3' : config.hvacColor === 'black' ? '#1b1d1f' : '#5d656b'
  const blades = Array.from({ length: 12 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 12
    return (
      <Box
        key={'fan-' + i}
        size={[0.015, 0.13, 0.012]}
        position={[Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0.145]}
        rotation={[0, 0, a]}
        color="#313538"
        metalness={0.28}
        roughness={0.38}
      />
    )
  })
  return (
    <group position={[config.length / 2 + 0.20, 0.58, -config.width / 2 + 0.58]} rotation={[0, Math.PI / 2, 0]}>
      <RoundedPiece size={[0.70, 0.50, 0.22]} position={[0, 0, 0]} color={color} metalness={0.20} roughness={0.48} radius={0.035} />
      <mesh position={[0, 0, 0.133]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.175, 0.012, 10, 36]} />
        <meshStandardMaterial color="#3a3e41" metalness={0.28} roughness={0.42} />
      </mesh>
      {blades}
      <Box size={[0.48, 0.018, 0.012]} position={[0, -0.20, 0.135]} color="#b8bcbd" metalness={0.45} roughness={0.34} />
      <Box size={[0.08, 0.06, 0.016]} position={[0.26, 0.16, 0.136]} color="#aeb3b5" metalness={0.18} roughness={0.50} />
      <Box size={[0.62, 0.035, 0.08]} position={[0, -0.30, -0.045]} color="#33373a" metalness={0.44} roughness={0.42} />
    </group>
  )
}

export function Interior({ config }: Props) {
  if (!config.showInterior) return null
  const { floorT } = envelope(config)
  const x0 = -config.length / 2 + 0.75

  // Białe obróbki wewnętrzne wg nagrania WA0018: kątowniki ściana–sufit i w narożnikach pionowych (≈ 55 mm)
  const wallT = PANEL_THICKNESS_M[config.wallPanel]
  const ix = config.length / 2 - wallT
  const iz = config.width / 2 - wallT
  const yFront = floorT + config.frontHeight
  const yBack = floorT + config.backHeight
  const slope = Math.atan2(yFront - yBack, iz * 2)
  const trim = 0.055
  const trimColor = RAL_9010_HEX

  return (
    <group>
      <SlopedCeiling config={config} />
      <Box size={[ix * 2, trim, trim]} position={[0, yFront - trim / 2, iz - trim / 2]} color={trimColor} roughness={0.6} />
      <Box size={[ix * 2, trim, trim]} position={[0, yBack - trim / 2, -iz + trim / 2]} color={trimColor} roughness={0.6} />
      {[-1, 1].map((sx) => (
        <Box key={'ceil-' + sx} size={[trim, trim, iz * 2]} position={[sx * (ix - trim / 2), (yFront + yBack) / 2 - trim / 2, 0]} rotation={[slope, 0, 0]} color={trimColor} roughness={0.6} />
      ))}
      {[[-1, 1, yFront], [1, 1, yFront], [-1, -1, yBack], [1, -1, yBack]].map(([sx, sz, top]) => (
        <Box key={'corner-' + sx + sz} size={[trim, top - floorT, trim]} position={[sx * (ix - trim / 2), floorT + (top - floorT) / 2, sz * (iz - trim / 2)]} color={trimColor} roughness={0.6} />
      ))}
      {config.partitionWall && (
        <Box
          size={[0.08, 2.30, Math.min(2.15, config.width - 0.3)]}
          position={[x0 + 1.25, floorT + 1.15, -0.22]}
          color="#e8e6df"
          opacity={0.94}
        />
      )}

      {config.kitchen && (
        <group position={[config.length / 2 - Math.max(0.8, config.kitchenLength / 2) - 0.18, floorT, -config.width / 2 + 0.34]}>
          <Box size={[config.kitchenLength, 0.88, 0.55]} position={[0, 0.44, 0]} color="#e7e2d8" />
          <Box size={[config.kitchenLength, 0.05, 0.60]} position={[0, 0.91, 0]} color="#55585a" />
          {config.fridge && (
            <Box size={[0.52, 1.75, 0.58]} position={[config.kitchenLength / 2 + 0.34, 0.88, 0]} color="#d4d7d8" metalness={0.25} />
          )}
        </group>
      )}

      {config.toiletCompact && <Box size={[0.45, 0.42, 0.65]} position={[x0, floorT + 0.21, -config.width / 2 + 0.56]} color="#f4f4f0" />}
      {config.washbasin && <Box size={[0.55, 0.82, 0.42]} position={[x0 + 0.65, floorT + 0.41, -config.width / 2 + 0.30]} color="#f4f4f0" />}
      {config.shower && <Box size={[0.82, 0.08, 0.82]} position={[x0 + 0.40, floorT + 0.04, config.width / 2 - 0.52]} color="#d7e0e4" opacity={0.74} />}

      {config.airConditioning && (
        <Box
          size={[0.86, 0.28, 0.22]}
          position={[0, floorT + 2.16, -config.width / 2 + 0.15]}
          color={config.hvacColor === 'white' ? '#ecece7' : config.hvacColor === 'black' ? '#17191b' : '#596168'}
        />
      )}
    </group>
  )
}


export function ProjectPavilion({ config }: Props) {
  // geometria uzgodniona z elewacją i obróbkami (attyka, obróbka narożna) — ta sama co w BOM
  const geometry = geometryOf(config)
  const transparent = config.showInterior || config.showStructure
  const opacity = transparent ? 0.20 : 1
  const foundationGap = geometry.foundationGap ?? m(PHYS.base.groundGap)
  const system1 = frameDims(config).system1

  return (
    <group>
      <FoundationSupports config={config} geometry={geometry} />
      {/* System 1 (kątownik 50×50×4): bryła z modelu produkcyjnego — współrzędne zawierają już prześwit */}
      {system1 && <System1Body config={config} opacity={opacity} />}
      <group position={[0, foundationGap, 0]}>
        {!system1 && <FloorSystem config={config} />}
        <Wall side="front" config={config} geometry={geometry} opacity={opacity} />
        <Wall side="back" config={config} geometry={geometry} opacity={opacity} />
        <Wall side="left" config={config} geometry={geometry} opacity={opacity} />
        <Wall side="right" config={config} geometry={geometry} opacity={opacity} />
        <FacadeCladdingFromModel config={config} />
        {!system1 && config.project !== 'GALERIA/03' && <RoofSystem config={config} />}
        {config.showStructure && <Structure config={config} />}
        <Interior config={config} />
        <ExteriorHVAC config={config} />
      </group>
    </group>
  )
}
