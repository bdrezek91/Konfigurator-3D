import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import { Path, Shape } from 'three'
import type { ReactNode } from 'react'
import {
  PANEL_THICKNESS_M,
  type DecorPlacement,
  type OpeningPlacement,
  type PavilionConfig,
  type ProjectGeometry,
  type WallSide,
} from './types'

export type PavilionView = 'perspective' | 'front' | 'left' | 'right' | 'back'
type Props = { config: PavilionConfig; view?: PavilionView }

function Box({
  size,
  position,
  rotation = [0, 0, 0],
  color,
  metalness = 0.08,
  roughness = 0.72,
  opacity = 1,
}: {
  size: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  metalness?: number
  roughness?: number
  opacity?: number
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
      />
    </mesh>
  )
}

function envelope(config: PavilionConfig) {
  const floorT = PANEL_THICKNESS_M[config.floorPanel]
  const roofT = PANEL_THICKNESS_M[config.roofPanel]
  const outerFront = floorT + config.frontHeight + roofT
  const outerBack = floorT + config.backHeight + roofT
  const slope = Math.atan2(outerFront - outerBack, config.width)
  const roofDepth = Math.hypot(config.width, outerFront - outerBack)
  return { floorT, roofT, outerFront, outerBack, slope, roofDepth }
}

function wallTransform(side: WallSide, config: PavilionConfig): {
  span: number
  position: [number, number, number]
  rotation: [number, number, number]
} {
  if (side === 'front') return { span: config.length, position: [0, 0, config.width / 2], rotation: [0, 0, 0] }
  if (side === 'back') return { span: config.length, position: [0, 0, -config.width / 2], rotation: [0, Math.PI, 0] }
  if (side === 'left') return { span: config.width, position: [-config.length / 2, 0, 0], rotation: [0, -Math.PI / 2, 0] }
  return { span: config.width, position: [config.length / 2, 0, 0], rotation: [0, Math.PI / 2, 0] }
}

function wallTopHeights(side: WallSide, config: PavilionConfig): [number, number] {
  const { outerFront, outerBack } = envelope(config)
  if (side === 'front') return [outerFront, outerFront]
  if (side === 'back') return [outerBack, outerBack]
  if (side === 'left') return [outerBack, outerFront]
  return [outerFront, outerBack]
}

function wallTopAt(side: WallSide, localX: number, span: number, config: PavilionConfig) {
  const [left, right] = wallTopHeights(side, config)
  const t = Math.max(0, Math.min(1, (localX + span / 2) / Math.max(span, 0.001)))
  return left + (right - left) * t
}

function openingSill(opening: OpeningPlacement) {
  if (opening.sill != null) return opening.sill
  return opening.kind.startsWith('door-') ? 0 : 0.08
}

function OpeningFrame({
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
  const frame = opening.frameColor ?? '#15181a'
  const isDoor = opening.kind.startsWith('door-')

  if (opening.kind === 'door-full') {
    return (
      <group position={[opening.center, y, depth / 2 + 0.035]}>
        <Box size={[opening.width + 0.075, opening.height + 0.075, 0.075]} position={[0, 0, 0]} color={frame} metalness={0.16} roughness={0.40} />
        <Box size={[opening.width - 0.06, opening.height - 0.06, 0.055]} position={[0, 0, 0.045]} color={frame} metalness={0.10} roughness={0.36} />
        <Box size={[0.024, 0.58, 0.035]} position={[opening.width * 0.30, 0, 0.085]} color="#c4c7c7" metalness={0.75} roughness={0.20} />
      </group>
    )
  }

  return (
    <group position={[opening.center, y, depth / 2 + 0.025]}>
      <Box size={[opening.width + 0.075, opening.height + 0.075, 0.070]} position={[0, 0, 0]} color={frame} metalness={0.18} roughness={0.35} />
      <mesh position={[0, 0, 0.048]} castShadow>
        <boxGeometry args={[opening.width, opening.height, 0.032]} />
        <meshPhysicalMaterial
          color="#6f8791"
          transparent
          opacity={0.34}
          roughness={0.08}
          metalness={0.02}
          transmission={0.52}
          ior={1.45}
          thickness={0.018}
          clearcoat={0.28}
          clearcoatRoughness={0.10}
        />
      </mesh>
      {opening.kind === 'door-double' && <Box size={[0.032, opening.height, 0.078]} position={[0, 0, 0.075]} color={frame} />}
      {opening.kind === 'alu-window' && <Box size={[0.026, opening.height, 0.072]} position={[opening.width * 0.18, 0, 0.075]} color={frame} />}
      {opening.kind === 'pvc-window' && (
        <>
          <Box size={[0.026, opening.height, 0.072]} position={[0, 0, 0.075]} color={frame} />
          <Box size={[opening.width, 0.026, 0.072]} position={[0, 0, 0.075]} color={frame} />
        </>
      )}
      {isDoor && opening.kind !== 'door-double' && (
        <Box size={[0.024, 0.58, 0.035]} position={[opening.width * 0.30, 0, 0.090]} color="#c4c7c7" metalness={0.78} roughness={0.18} />
      )}
      {opening.roller && (
        <Box
          size={[opening.width + 0.10, 0.13, 0.13]}
          position={[0, opening.height / 2 + 0.085, 0.02]}
          color="#1a1d1f"
          metalness={0.18}
          roughness={0.45}
        />
      )}
    </group>
  )
}

function makeWallShape(
  side: WallSide,
  config: PavilionConfig,
  span: number,
  openings: OpeningPlacement[],
) {
  const { floorT } = envelope(config)
  const [topLeft, topRight] = wallTopHeights(side, config)
  const shape = new Shape()
  shape.moveTo(-span / 2, 0)
  shape.lineTo(span / 2, 0)
  shape.lineTo(span / 2, topRight)
  shape.lineTo(-span / 2, topLeft)
  shape.closePath()

  for (const opening of openings) {
    const x1 = Math.max(-span / 2 + 0.001, opening.center - opening.width / 2)
    const x2 = Math.min(span / 2 - 0.001, opening.center + opening.width / 2)
    const y1 = floorT + openingSill(opening)
    const y2 = y1 + opening.height
    if (x2 <= x1 || y2 <= y1) continue
    const hole = new Path()
    hole.moveTo(x1, y1)
    hole.lineTo(x1, y2)
    hole.lineTo(x2, y2)
    hole.lineTo(x2, y1)
    hole.closePath()
    shape.holes.push(hole)
  }
  return shape
}

function overlapsOpening(
  x: number,
  y: number,
  w: number,
  h: number,
  openings: OpeningPlacement[],
  floorOffset: number,
) {
  return openings.some((o) => {
    const sill = floorOffset + openingSill(o)
    return Math.abs(x - o.center) < (w + o.width) / 2 && Math.abs(y - (sill + o.height / 2)) < (h + o.height) / 2
  })
}

function PanelProfileLocal({
  side,
  span,
  config,
  openings,
  wallDepth,
}: {
  side: WallSide
  span: number
  config: PavilionConfig
  openings: OpeningPlacement[]
  wallDepth: number
}) {
  const out: ReactNode[] = []
  const { floorT } = envelope(config)
  const z = wallDepth / 2 + 0.008
  const isLight = config.exteriorColor === '#f2f0e7' || config.exteriorColor === '#a5a5a3'
  const jointColor = isLight ? '#d7d5ce' : '#202427'
  const profileColor = isLight ? '#d9d7d0' : '#303538'

  // Widoczne zamki/podziały płyt ~1 m.
  const moduleWidth = 1.0
  for (let x = -span / 2 + moduleWidth; x < span / 2 - 0.02; x += moduleWidth) {
    const top = wallTopAt(side, x, span, config)
    const h = Math.max(0.2, top - 0.08)
    if (!overlapsOpening(x, h / 2, 0.012, h, openings, floorT)) {
      out.push(
        <Box
          key={'joint-' + x.toFixed(2)}
          size={[0.010, h, 0.010]}
          position={[x, h / 2, z]}
          color={jointColor}
          roughness={0.58}
        />,
      )
    }
  }

  if (config.wallProfile === 'smooth') return <>{out}</>

  const profile =
    config.wallProfile === 'linear' || config.wallProfile === 'ribbed'
      ? { step: 0.18, width: 0.006, depth: 0.0012, color: '#2a2f32' }
      : config.wallProfile === 'microline'
        ? { step: 0.055, width: 0.003, depth: 0.0009, color: '#353a3d' }
        : config.wallProfile === 'microrib'
          ? { step: 0.035, width: 0.0025, depth: 0.0008, color: '#3b4043' }
          : config.wallProfile === 'microwave'
            ? { step: 0.070, width: 0.008, depth: 0.0012, color: '#34393c' }
            : config.wallProfile === 'carbon'
              ? { step: 0.045, width: 0.004, depth: 0.0010, color: '#303538' }
              : null

  if (!profile) return <>{out}</>

  for (let x = -span / 2 + profile.step; x < span / 2; x += profile.step) {
    const top = wallTopAt(side, x, span, config)
    const h = Math.max(0.15, top - 0.10)
    if (!overlapsOpening(x, h / 2, profile.width, h, openings, floorT)) {
      out.push(
        <Box
          key={'profile-' + x.toFixed(3)}
          size={[profile.width, h, profile.depth]}
          position={[x, h / 2, z + 0.008]}
          color={isLight ? profileColor : profile.color}
          roughness={0.64}
        />,
      )
    }
  }

  return <>{out}</>
}

function DecorLocal({
  decor,
  openings,
  wallDepth,
  floorOffset,
}: {
  decor: DecorPlacement[]
  openings: OpeningPlacement[]
  wallDepth: number
  floorOffset: number
}) {
  const out: ReactNode[] = []

  decor.forEach((segment) => {
    const fullWallCassette = segment.kind === 'cassette-black' && segment.height >= 2.8
    const isBody = !fullWallCassette && segment.height > 1.0 && segment.yCenter < 2.2
    const effectiveHeight = fullWallCassette ? 2.76 : isBody ? Math.min(segment.height, 2.26) : segment.height
    const effectiveY = fullWallCassette ? 1.39 : isBody ? 1.31 : Math.min(segment.yCenter, 2.82 - effectiveHeight / 2)
    const z = wallDepth / 2 + 0.070
    const x0 = segment.center - segment.width / 2
    const y0 = effectiveY - effectiveHeight / 2

    if (segment.kind.startsWith('lamella-')) {
      const color =
        segment.kind === 'lamella-black' ? '#141618' :
        segment.kind === 'lamella-graphite' ? '#34393d' :
        segment.kind === 'lamella-palisander' ? '#5f3f2b' : '#a57245'
      const step = 0.072
      const slatWidth = 0.032
      const woodPalette =
        segment.kind === 'lamella-palisander'
          ? ['#5a3a28', '#694630', '#4f3324', '#74503a']
          : ['#9a693f', '#b27a49', '#8f603a', '#a97044']
      let slatIndex = 0

      if (!segment.shape || segment.shape === 'rect') {
        out.push(
          <Box
            key={segment.id + '-base'}
            size={[segment.width, effectiveHeight, 0.040]}
            position={[segment.center, effectiveY, z - 0.015]}
            color="#111315"
            roughness={0.62}
          />,
        )
      }

      for (let x = x0 + slatWidth / 2; x <= x0 + segment.width; x += step) {
        const t = Math.max(0, Math.min(1, (x - x0) / Math.max(segment.width, 0.001)))
        const fraction =
          segment.shape === 'wedge-left' ? Math.max(0.04, 1 - t) :
          segment.shape === 'wedge-right' ? Math.max(0.04, t) : 1
        const localH = effectiveHeight * fraction
        const localY = y0 + localH / 2
        if (!overlapsOpening(x, localY, slatWidth, localH, openings, floorOffset)) {
          const slatColor =
            segment.kind === 'lamella-black' || segment.kind === 'lamella-graphite'
              ? color
              : woodPalette[slatIndex % woodPalette.length]
          out.push(
            <Box
              key={segment.id + '-l-' + x.toFixed(2)}
              size={[slatWidth, localH, 0.052]}
              position={[x, localY, z + 0.010]}
              color={slatColor}
              roughness={0.80}
            />,
          )
          slatIndex++
        }
      }
      return
    }

    if (segment.kind === 'snake-winchester') {
      out.push(
        <Box
          key={segment.id + '-base'}
          size={[segment.width, effectiveHeight, 0.040]}
          position={[segment.center, effectiveY, z - 0.015]}
          color="#17191b"
          roughness={0.58}
        />,
      )
      const barW = segment.width < 0.8 ? 0.072 : 0.115
      const gap = segment.width < 0.8 ? 0.035 : 0.055
      let i = 0
      for (let x = x0 + barW / 2; x <= x0 + segment.width; x += barW + gap) {
        if (!overlapsOpening(x, effectiveY, barW, effectiveHeight, openings, floorOffset)) {
          out.push(
            <Box
              key={segment.id + '-s-' + i}
              size={[barW, effectiveHeight, 0.058]}
              position={[x, effectiveY, z + 0.010]}
              color="#a36f45"
              roughness={0.80}
            />,
          )
        }
        i++
      }
      return
    }

    if (segment.kind === 'board-natural') {
      const boardH = 0.16
      for (let y = y0 + boardH / 2; y < y0 + effectiveHeight; y += boardH + 0.018) {
        if (!overlapsOpening(segment.center, y, segment.width, boardH, openings, floorOffset)) {
          out.push(
            <Box
              key={segment.id + '-b-' + y.toFixed(2)}
              size={[segment.width, boardH, 0.060]}
              position={[segment.center, y, z]}
              color="#9a704e"
              roughness={0.82}
            />,
          )
        }
      }
      return
    }

    const cassette = [
      'cassette-black',
      'cassette-square-graphite',
      'cassette-rect-graphite',
      'cassette-white',
      'cassette-winchester',
      'silver-rect',
    ].includes(segment.kind)

    if (cassette) {
      const isSquare = segment.kind === 'cassette-black' || segment.kind === 'cassette-square-graphite'
      const cellW = isSquare ? 0.66 : segment.kind === 'cassette-winchester' ? 0.72 : 0.70
      const cellH = isSquare ? 0.66 : Math.min(0.40, effectiveHeight - 0.02)
      const color =
        segment.kind === 'cassette-black' ? '#17191b' :
        segment.kind === 'cassette-white' ? '#e8e8e1' :
        segment.kind === 'cassette-winchester' ? '#9c7049' :
        segment.kind === 'silver-rect' ? '#aeb3b5' : '#343a3f'
      const metalness = segment.kind === 'silver-rect' ? 0.32 : 0.10

      for (let x = x0 + cellW / 2; x < x0 + segment.width; x += cellW + 0.025) {
        for (let y = y0 + cellH / 2; y < y0 + effectiveHeight; y += cellH + 0.025) {
          const cw = Math.min(cellW, x0 + segment.width - x + cellW / 2)
          const ch = Math.min(cellH, y0 + effectiveHeight - y + cellH / 2)
          if (cw > 0.08 && ch > 0.08 && !overlapsOpening(x, y, cw, ch, openings, floorOffset)) {
            out.push(
              <Box
                key={segment.id + '-c-' + x.toFixed(2) + '-' + y.toFixed(2)}
                size={[cw, ch, 0.066]}
                position={[x, y, z]}
                color={color}
                metalness={metalness}
                roughness={segment.kind === 'cassette-winchester' ? 0.78 : 0.48}
              />,
            )
          }
        }
      }
      return
    }

    if (segment.kind === 'led-strip') {
      out.push(
        <Box
          key={segment.id}
          size={[segment.width, 0.028, 0.030]}
          position={[segment.center, effectiveY, z + 0.030]}
          color="#ffe29a"
          roughness={0.16}
        />,
      )
      return
    }

    const color = segment.kind === 'steel-plate' ? '#23272a' : '#3b4145'
    if (!overlapsOpening(segment.center, effectiveY, segment.width, effectiveHeight, openings, floorOffset)) {
      out.push(
        <Box
          key={segment.id}
          size={[segment.width, effectiveHeight, 0.060]}
          position={[segment.center, effectiveY, z]}
          color={color}
          metalness={0.08}
          roughness={0.55}
        />,
      )
    }
  })

  return <>{out}</>
}

function DampolFrameLocal({
  side,
  span,
  config,
  wallDepth,
}: {
  side: WallSide
  span: number
  config: PavilionConfig
  wallDepth: number
}) {
  const { roofT, floorT } = envelope(config)
  const [topLeft, topRight] = wallTopHeights(side, config)
  const topBand = Math.max(0.20, roofT + 0.15)
  const bottomBand = Math.max(0.13, floorT + 0.035)
  const sidePost = side === 'front' ? 0.14 : 0.12
  const z = wallDepth / 2 + 0.030
  const delta = topRight - topLeft
  const angle = Math.atan2(delta, span)
  const railLength = Math.hypot(span, delta)
  const railY = (topLeft + topRight) / 2 - topBand / 2

  return (
    <group>
      <Box
        size={[railLength, topBand, 0.075]}
        position={[0, railY, z]}
        rotation={[0, 0, angle]}
        color={config.flashingColor}
        metalness={0.18}
        roughness={0.46}
      />
      <Box
        size={[span, bottomBand, 0.075]}
        position={[0, bottomBand / 2, z]}
        color="#15181a"
        metalness={0.18}
        roughness={0.45}
      />
      <Box
        size={[sidePost, topLeft, 0.075]}
        position={[-span / 2 + sidePost / 2, topLeft / 2, z]}
        color={config.flashingColor}
        metalness={0.18}
        roughness={0.46}
      />
      <Box
        size={[sidePost, topRight, 0.075]}
        position={[span / 2 - sidePost / 2, topRight / 2, z]}
        color={config.flashingColor}
        metalness={0.18}
        roughness={0.46}
      />
    </group>
  )
}

function Wall({
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
  const decor = geometry.decor.filter((x) => x.wall === side)
  const lights = geometry.exteriorLights?.filter((x) => x.wall === side) ?? []
  const { floorT } = envelope(config)
  const depth = PANEL_THICKNESS_M[config.wallPanel]
  const shape = makeWallShape(side, config, transform.span, openings)

  return (
    <group position={transform.position} rotation={transform.rotation}>
      <mesh position={[0, 0, -depth / 2]} castShadow receiveShadow>
        <extrudeGeometry args={[shape, { depth, bevelEnabled: false, steps: 1 }]} />
        <meshStandardMaterial
          color={config.exteriorColor}
          metalness={0.06}
          roughness={0.63}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      <PanelProfileLocal
        side={side}
        span={transform.span}
        config={config}
        openings={openings}
        wallDepth={depth}
      />

      <DampolFrameLocal side={side} span={transform.span} config={config} wallDepth={depth} />

      <DecorLocal
        decor={decor}
        openings={openings}
        wallDepth={depth}
        floorOffset={floorT}
      />

      {openings.map((opening) => (
        <OpeningFrame
          key={opening.id}
          opening={opening}
          floorOffset={floorT}
          depth={depth}
        />
      ))}

      {lights.map((lamp, i) => (
        <group key={'light-' + i} position={[lamp.center, lamp.y, depth / 2 + 0.12]}>
          <Box size={[0.16, 0.24, 0.08]} position={[0, 0, 0]} color="#202426" metalness={0.12} roughness={0.42} />
          <Box size={[0.08, 0.13, 0.025]} position={[0, 0, 0.055]} color="#f4e6a8" roughness={0.24} />
        </group>
      ))}
    </group>
  )
}

function RoofRib({
  x,
  depth,
  y,
}: {
  x: number
  depth: number
  y: number
}) {
  const shape = new Shape()
  shape.moveTo(-0.060, 0)
  shape.lineTo(-0.032, 0.045)
  shape.lineTo(0.032, 0.045)
  shape.lineTo(0.060, 0)
  shape.closePath()

  return (
    <mesh position={[x, y, -depth / 2]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false, steps: 1 }]} />
      <meshStandardMaterial color="#373c40" metalness={0.14} roughness={0.48} />
    </mesh>
  )
}

function RoofSystem({ config }: Props) {
  const { roofT, outerFront, outerBack, slope, roofDepth } = envelope(config)
  const centerY = (outerFront + outerBack) / 2 - roofT / 2
  const roofColor = config.flashingColor
  const ribSpacing = 0.35
  const ribs: ReactNode[] = []
  for (let x = -config.length / 2 + 0.18; x < config.length / 2; x += ribSpacing) {
    ribs.push(<RoofRib key={'roof-rib-' + x.toFixed(2)} x={x} depth={roofDepth + 0.04} y={roofT / 2} />)
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
    <group position={[0, centerY, 0]} rotation={[-slope, 0, 0]}>
      <Box
        size={[config.length + 0.06, roofT, roofDepth + 0.06]}
        position={[0, 0, 0]}
        color={roofColor}
        metalness={0.10}
        roughness={0.58}
      />
      {config.roofProfile === 'trapezoid' && ribs}
      {joints}
      <Box
        size={[config.length + 0.10, 0.045, 0.055]}
        position={[0, roofT / 2 + 0.020, roofDepth / 2 + 0.020]}
        color={roofColor}
        metalness={0.18}
        roughness={0.44}
      />
      <Box
        size={[config.length + 0.10, 0.045, 0.055]}
        position={[0, roofT / 2 + 0.020, -roofDepth / 2 - 0.020]}
        color={roofColor}
        metalness={0.18}
        roughness={0.44}
      />
    </group>
  )
}

function FloorSystem({ config }: Props) {
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

function Structure({ config }: Props) {
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

function SlopedCeiling({ config }: Props) {
  const { floorT, slope, roofDepth } = envelope(config)
  const y = floorT + (config.frontHeight + config.backHeight) / 2
  const color =
    config.interiorFinish === 'black' ? '#292c2e' :
    config.interiorFinish === 'concrete' ? '#b7b4ad' :
    config.interiorFinish === 'oak' ? '#9b7651' :
    config.interiorFinish === 'walnut' ? '#654936' : '#ecebe5'

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

function ExteriorHVAC({ config }: Props) {
  if (!config.airConditioning) return null
  const color = config.hvacColor === 'white' ? '#e7e7e3' : config.hvacColor === 'black' ? '#17191b' : '#596168'
  return (
    <group position={[config.length / 2 + 0.22, 0.58, -config.width / 2 + 0.58]} rotation={[0, Math.PI / 2, 0]}>
      <Box size={[0.72, 0.52, 0.22]} position={[0, 0, 0]} color={color} metalness={0.12} roughness={0.48} />
      <mesh position={[0, 0, 0.125]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.025, 32]} />
        <meshStandardMaterial color="#262a2d" metalness={0.18} roughness={0.42} />
      </mesh>
    </group>
  )
}

function Interior({ config }: Props) {
  if (!config.showInterior) return null
  const { floorT } = envelope(config)
  const x0 = -config.length / 2 + 0.75

  return (
    <group>
      <SlopedCeiling config={config} />
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

function fallbackGeometry(config: PavilionConfig): ProjectGeometry {
  const openings: OpeningPlacement[] = []
  const itemWidths: number[] = []
  for (let i = 0; i < config.fixedGlazingCount; i++) itemWidths.push(config.fixedGlazingWidth)
  for (let i = 0; i < config.aluDoorCount; i++) itemWidths.push(config.aluDoorWidth)
  for (let i = 0; i < config.aluWindowCount; i++) itemWidths.push(config.aluWindowWidth)

  const total = itemWidths.reduce((a, b) => a + b, 0) + Math.max(0, itemWidths.length - 1) * 0.10
  let cursor = -Math.min(total, config.length - 0.45) / 2

  for (let i = 0; i < config.fixedGlazingCount; i++) {
    const center = cursor + config.fixedGlazingWidth / 2
    openings.push({
      id: 'fg' + i,
      wall: 'front',
      center,
      width: config.fixedGlazingWidth,
      height: config.fixedGlazingHeight,
      sill: 0.08,
      kind: 'fixed-glass',
      glazing: config.glazing,
      roller: config.rollers && i < config.rollerCount,
    })
    cursor += config.fixedGlazingWidth + 0.10
  }

  for (let i = 0; i < config.aluDoorCount; i++) {
    const center = cursor + config.aluDoorWidth / 2
    openings.push({
      id: 'ad' + i,
      wall: 'front',
      center,
      width: config.aluDoorWidth,
      height: config.aluDoorHeight,
      sill: 0,
      kind: 'door-glazed',
      glazing: config.glazing,
      roller: config.rollers && config.fixedGlazingCount + i < config.rollerCount,
    })
    cursor += config.aluDoorWidth + 0.10
  }

  for (let i = 0; i < config.aluWindowCount; i++) {
    const center = cursor + config.aluWindowWidth / 2
    openings.push({
      id: 'aw' + i,
      wall: 'front',
      center,
      width: config.aluWindowWidth,
      height: config.aluWindowHeight,
      sill: 0.08,
      kind: 'alu-window',
      glazing: config.glazing,
    })
    cursor += config.aluWindowWidth + 0.10
  }

  for (let i = 0; i < config.pvcWindowCount; i++) {
    openings.push({
      id: 'pvc' + i,
      wall: 'left',
      center: (i - (config.pvcWindowCount - 1) / 2) * 0.75,
      width: config.pvcWindowWidth,
      height: config.pvcWindowHeight,
      sill: 1.35,
      kind: 'pvc-window',
      glazing: config.glazing,
    })
  }

  const decor: DecorPlacement[] = []
  const fieldHeight = 2.24
  const fieldY = 1.30
  const sideSpace = Math.max(0.45, Math.min(1.25, (config.length - Math.min(total, config.length - 0.5)) / 2 - 0.12))
  const leftCenter = -config.length / 2 + sideSpace / 2 + 0.16
  const rightCenter = config.length / 2 - sideSpace / 2 - 0.16

  if (config.facade === 'cassette-lamella' || config.facade === 'lamella-winchester') {
    decor.push(
      { id:'custom-l', wall:'front', center:leftCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'lamella-winchester' },
      { id:'custom-r', wall:'front', center:rightCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'lamella-winchester' },
    )
  } else if (config.facade === 'lamella-black') {
    decor.push(
      { id:'custom-l', wall:'front', center:leftCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'lamella-black' },
      { id:'custom-r', wall:'front', center:rightCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'lamella-black' },
    )
  } else if (config.facade === 'cassette-graphite') {
    decor.push(
      { id:'custom-l', wall:'front', center:leftCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'cassette-square-graphite' },
      { id:'custom-r', wall:'front', center:rightCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'cassette-square-graphite' },
    )
  } else if (config.facade === 'cassette-black') {
    decor.push(
      { id:'custom-l', wall:'front', center:leftCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'cassette-black' },
      { id:'custom-r', wall:'front', center:rightCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'cassette-black' },
    )
  } else if (config.facade === 'silver-rectangle') {
    decor.push(
      { id:'custom-l', wall:'front', center:leftCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'silver-rect' },
      { id:'custom-r', wall:'front', center:rightCenter, width:sideSpace, yCenter:fieldY, height:fieldHeight, kind:'silver-rect' },
    )
  }

  return { externalHeight: envelope(config).outerFront, openings, decor }
}

function ProjectPavilion({ config }: Props) {
  const geometry = config.geometry ?? fallbackGeometry(config)
  const transparent = config.showInterior || config.showStructure
  const opacity = transparent ? 0.20 : 1

  return (
    <group>
      <FloorSystem config={config} />
      <Wall side="front" config={config} geometry={geometry} opacity={opacity} />
      <Wall side="back" config={config} geometry={geometry} opacity={opacity} />
      <Wall side="left" config={config} geometry={geometry} opacity={opacity} />
      <Wall side="right" config={config} geometry={geometry} opacity={opacity} />
      <RoofSystem config={config} />
      {config.showStructure && <Structure config={config} />}
      <Interior config={config} />
      <ExteriorHVAC config={config} />
    </group>
  )
}

export default function Pavilion3D({ config, view = 'perspective' }: Props) {
  const cameraDistance = Math.max(9.5, config.length * 1.35)
  const { outerFront, outerBack } = envelope(config)
  const targetHeight = (outerFront + outerBack) * 0.24
  const cameraHeight = targetHeight + 1.25
  const cameraPosition: [number, number, number] =
    view === 'front' ? [0, cameraHeight, cameraDistance] :
    view === 'back' ? [0, cameraHeight, -cameraDistance] :
    view === 'left' ? [-cameraDistance, cameraHeight, 0] :
    view === 'right' ? [cameraDistance, cameraHeight, 0] :
    [cameraDistance * 0.62, 3.35, cameraDistance]

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: cameraPosition, fov: 27 }}
    >
      <color attach="background" args={['#e7e7e3']} />
      <ambientLight intensity={0.82} />
      <directionalLight
        position={[7, 10, 8]}
        intensity={2.15}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-7, 5, -5]} intensity={0.55} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0]} receiveShadow>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color="#e3e1dc" roughness={1} />
      </mesh>

      <ProjectPavilion config={config} />

      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.34}
        scale={26}
        blur={3.2}
        far={12}
      />
      <Environment preset="city" />

      <OrbitControls
        makeDefault
        target={[0, targetHeight, 0]}
        minDistance={Math.max(6.5, config.length * 0.82)}
        maxDistance={Math.max(24, config.length * 2.4)}
        minPolarAngle={Math.PI * 0.20}
        maxPolarAngle={Math.PI * 0.48}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
