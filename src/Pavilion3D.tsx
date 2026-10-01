import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { ReactNode } from 'react'
import type {
  DecorPlacement,
  OpeningPlacement,
  PavilionConfig,
  ProjectGeometry,
  WallSide,
} from './types'

type Props = { config: PavilionConfig }

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

function OpeningFrame({ opening, depth = 0.13 }: { opening: OpeningPlacement; depth?: number }) {
  const sill = opening.sill ?? 0.08
  const y = sill + opening.height / 2
  const frame = opening.frameColor ?? '#17191b'
  const isDoor = opening.kind.startsWith('door-')

  if (opening.kind === 'door-full') {
    return (
      <group position={[opening.center, y, depth / 2 + 0.015]}>
        <Box size={[opening.width + 0.07, opening.height + 0.07, 0.08]} position={[0, 0, 0]} color={frame} />
        <Box size={[opening.width - 0.07, opening.height - 0.07, 0.055]} position={[0, 0, 0.05]} color={frame} roughness={0.38} />
      </group>
    )
  }

  return (
    <group position={[opening.center, y, depth / 2 - 0.015]}>
      <Box size={[opening.width + 0.075, opening.height + 0.075, 0.07]} position={[0, 0, 0]} color={frame} metalness={0.18} />
      <mesh position={[0, 0, 0.035]} castShadow>
        <boxGeometry args={[opening.width, opening.height, 0.045]} />
        <meshPhysicalMaterial
          color="#526a74"
          transparent
          opacity={0.36}
          roughness={0.08}
          metalness={0.06}
          transmission={0.36}
        />
      </mesh>
      {opening.kind === 'door-double' && <Box size={[0.035, opening.height, 0.075]} position={[0, 0, 0.075]} color={frame} />}
      {opening.kind === 'alu-window' && <Box size={[0.028, opening.height, 0.07]} position={[opening.width * 0.18, 0, 0.075]} color={frame} />}
      {opening.kind === 'pvc-window' && <Box size={[0.025, opening.height, 0.07]} position={[0, 0, 0.075]} color={frame} />}
      {isDoor && opening.kind !== 'door-double' && (
        <Box size={[0.035, 0.035, 0.085]} position={[opening.width * 0.30, 0, 0.085]} color="#d6d4cb" metalness={0.75} />
      )}
    </group>
  )
}

function wallPieces(span: number, height: number, depth: number, openings: OpeningPlacement[], color: string, opacity: number) {
  const pieces: ReactNode[] = []
  const sorted = [...openings]
    .map((x) => ({
      ...x,
      start: Math.max(-span / 2, x.center - x.width / 2),
      end: Math.min(span / 2, x.center + x.width / 2),
    }))
    .filter((x) => x.end > -span / 2 && x.start < span / 2)
    .sort((a, b) => a.start - b.start)

  let cursor = -span / 2
  sorted.forEach((opening, index) => {
    if (opening.start > cursor) {
      const width = opening.start - cursor
      pieces.push(
        <Box key={'solid-' + index} size={[width, height, depth]} position={[cursor + width / 2, height / 2, 0]} color={color} opacity={opacity} />,
      )
    }
    const sill = Math.max(0, opening.sill ?? 0.08)
    if (sill > 0.01) {
      pieces.push(
        <Box key={'bottom-' + index} size={[opening.end - opening.start, sill, depth]} position={[(opening.start + opening.end) / 2, sill / 2, 0]} color={color} opacity={opacity} />,
      )
    }
    const topStart = sill + opening.height
    if (topStart < height) {
      pieces.push(
        <Box key={'top-' + index} size={[opening.end - opening.start, height - topStart, depth]} position={[(opening.start + opening.end) / 2, topStart + (height - topStart) / 2, 0]} color={color} opacity={opacity} />,
      )
    }
    cursor = Math.max(cursor, opening.end)
  })
  if (cursor < span / 2) {
    const width = span / 2 - cursor
    pieces.push(
      <Box key="solid-end" size={[width, height, depth]} position={[cursor + width / 2, height / 2, 0]} color={color} opacity={opacity} />,
    )
  }
  return pieces
}

function overlapsOpening(x: number, y: number, w: number, h: number, openings: OpeningPlacement[]) {
  return openings.some((o) => {
    const sill = o.sill ?? 0.08
    return Math.abs(x - o.center) < (w + o.width) / 2 && Math.abs(y - (sill + o.height / 2)) < (h + o.height) / 2
  })
}

function DecorLocal({ decor, openings, wallDepth }: {
  decor: DecorPlacement[]
  openings: OpeningPlacement[]
  wallDepth: number
}) {
  const out: ReactNode[] = []

  decor.forEach((segment) => {
    const z = wallDepth / 2 + 0.05
    const x0 = segment.center - segment.width / 2
    const y0 = segment.yCenter - segment.height / 2

    if (segment.kind.startsWith('lamella-')) {
      const color = segment.kind === 'lamella-black' ? '#17191b' : segment.kind === 'lamella-palisander' ? '#5f3f2b' : '#a57245'
      const step = 0.072
      const slatWidth = 0.032
      out.push(
        <Box
          key={segment.id + '-base'}
          size={[segment.width, segment.height, 0.045]}
          position={[segment.center, segment.yCenter, z - 0.015]}
          color="#111315"
          roughness={0.62}
        />,
      )
      for (let x = x0 + slatWidth / 2; x <= x0 + segment.width; x += step) {
        if (!overlapsOpening(x, segment.yCenter, slatWidth, segment.height, openings)) {
          out.push(<Box key={segment.id + '-l-' + x.toFixed(2)} size={[slatWidth, segment.height, 0.055]} position={[x, segment.yCenter, z + 0.012]} color={color} roughness={0.78} />)
        }
      }
      return
    }

    if (segment.kind === 'board-natural') {
      const boardH = 0.16
      for (let y = y0 + boardH / 2; y < y0 + segment.height; y += boardH + 0.018) {
        if (!overlapsOpening(segment.center, y, segment.width, boardH, openings)) {
          out.push(<Box key={segment.id + '-b-' + y.toFixed(2)} size={[segment.width, boardH, 0.065]} position={[segment.center, y, z]} color="#9a704e" roughness={0.82} />)
        }
      }
      return
    }

    const tile = segment.kind === 'cassette-black' ? 0.68 : segment.kind === 'cassette-square-graphite' ? 0.62 : 0
    if (tile > 0) {
      const color = segment.kind === 'cassette-black' ? '#17191b' : '#343a3f'
      for (let x = x0 + tile / 2; x < x0 + segment.width; x += tile + 0.025) {
        for (let y = y0 + tile / 2; y < y0 + segment.height; y += tile + 0.025) {
          if (!overlapsOpening(x, y, tile, tile, openings)) {
            out.push(<Box key={segment.id + '-c-' + x.toFixed(2) + '-' + y.toFixed(2)} size={[Math.min(tile, x0 + segment.width - x + tile / 2), Math.min(tile, y0 + segment.height - y + tile / 2), 0.065]} position={[x, y, z]} color={color} roughness={0.48} />)
          }
        }
      }
      return
    }

    const color =
      segment.kind === 'silver-rect' ? '#aeb3b5' :
      segment.kind === 'cassette-white' ? '#e8e8e1' :
      segment.kind === 'steel-plate' ? '#23272a' : '#3b4145'

    if (!overlapsOpening(segment.center, segment.yCenter, segment.width, segment.height, openings)) {
      out.push(<Box key={segment.id} size={[segment.width, segment.height, 0.065]} position={[segment.center, segment.yCenter, z]} color={color} metalness={segment.kind === 'silver-rect' ? 0.35 : 0.08} roughness={0.55} />)
    }
  })

  return <>{out}</>
}

function Wall({ side, config, geometry, opacity }: {
  side: WallSide
  config: PavilionConfig
  geometry: ProjectGeometry
  opacity: number
}) {
  const transform = wallTransform(side, config)
  const openings = geometry.openings.filter((x) => x.wall === side)
  const decor = geometry.decor.filter((x) => x.wall === side)
  const lights = geometry.exteriorLights?.filter((x) => x.wall === side) ?? []
  const depth = 0.10
  const wallColor = config.exteriorColor

  const useRibs =
    config.facade === 'plain' &&
    (config.exteriorColor === '#121315' || config.exteriorColor === '#3a3f43') &&
    decor.length === 0

  return (
    <group position={transform.position} rotation={transform.rotation}>
      {wallPieces(transform.span, geometry.externalHeight, depth, openings, wallColor, opacity)}
      {useRibs && <RibbedSkinLocal span={transform.span} height={geometry.externalHeight} openings={openings} wallDepth={depth} />}
      {openings.map((opening) => <OpeningFrame key={opening.id} opening={opening} depth={depth} />)}
      <DecorLocal decor={decor} openings={openings} wallDepth={depth} />
      <DampolFrameLocal
        span={transform.span}
        height={geometry.externalHeight}
        side={side}
        wallDepth={depth}
        color={config.flashingColor === '#f2f0e7' ? '#24282b' : config.flashingColor}
      />
      {lights.map((lamp, i) => (
        <group key={'light-' + i} position={[lamp.center, lamp.y, depth / 2 + 0.12]}>
          <Box size={[0.16, 0.24, 0.08]} position={[0, 0, 0]} color="#222629" />
          <Box size={[0.08, 0.13, 0.025]} position={[0, 0, 0.055]} color="#f4e8a9" roughness={0.3} />
        </group>
      ))}
    </group>
  )
}

function Structure({ config, height }: { config: PavilionConfig; height: number }) {
  const size = config.construction === 'angle50' ? 0.05 : config.construction === 'truss' ? 0.06 : 0.10
  const color = config.project === '81/08/26' ? '#e8e8e2' : '#16191b'
  const x = config.length / 2 - 0.055
  const z = config.width / 2 - 0.055
  const topY = height - 0.10
  return (
    <group>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <Box key={'p'+sx+sz} size={[size, height - 0.18, size]} position={[sx * x, height / 2, sz * z]} color={color} metalness={0.35} />
      )))}
      <Box size={[config.length - 0.12, size, size]} position={[0, 0.13, z]} color={color} metalness={0.35} />
      <Box size={[config.length - 0.12, size, size]} position={[0, 0.13, -z]} color={color} metalness={0.35} />
      <Box size={[size, size, config.width - 0.12]} position={[x, 0.13, 0]} color={color} metalness={0.35} />
      <Box size={[size, size, config.width - 0.12]} position={[-x, 0.13, 0]} color={color} metalness={0.35} />
      <Box size={[config.length - 0.12, size, size]} position={[0, topY, z]} color={color} metalness={0.35} />
      <Box size={[config.length - 0.12, size, size]} position={[0, topY, -z]} color={color} metalness={0.35} />
      <Box size={[size, size, config.width - 0.12]} position={[x, topY, 0]} color={color} metalness={0.35} />
      <Box size={[size, size, config.width - 0.12]} position={[-x, topY, 0]} color={color} metalness={0.35} />
    </group>
  )
}

function SlopedCeiling({ config }: Props) {
  const delta = config.frontHeight - config.backHeight
  const angle = Math.atan2(delta, config.width)
  const depth = Math.hypot(config.width, delta)
  const y = (config.frontHeight + config.backHeight) / 2
  return (
    <Box
      size={[config.length - 0.18, 0.045, depth - 0.15]}
      position={[0, y, 0]}
      rotation={[-angle, 0, 0]}
      color={config.interiorFinish === 'black' ? '#292c2e' : config.interiorFinish === 'concrete' ? '#b7b4ad' : '#ecebe5'}
      roughness={0.88}
      opacity={0.88}
    />
  )
}

function Interior({ config }: Props) {
  if (!config.showInterior) return null
  const x0 = -config.length / 2 + 0.75
  return (
    <group>
      <SlopedCeiling config={config} />
      {config.partitionWall && <Box size={[0.08, 2.35, Math.min(2.15, config.width - 0.3)]} position={[x0 + 1.25, 1.18, -0.22]} color="#e8e6df" opacity={0.92} />}
      {config.kitchen && (
        <group position={[config.length / 2 - Math.max(0.8, config.kitchenLength / 2) - 0.18, 0, -config.width / 2 + 0.34]}>
          <Box size={[config.kitchenLength, 0.88, 0.55]} position={[0, 0.44, 0]} color="#e7e2d8" />
          <Box size={[config.kitchenLength, 0.05, 0.60]} position={[0, 0.91, 0]} color="#55585a" />
          {config.fridge && <Box size={[0.52, 1.75, 0.58]} position={[config.kitchenLength / 2 + 0.34, 0.88, 0]} color="#d4d7d8" metalness={0.25} />}
        </group>
      )}
      {config.toiletCompact && <Box size={[0.45, 0.42, 0.65]} position={[x0, 0.21, -config.width / 2 + 0.56]} color="#f4f4f0" />}
      {config.washbasin && <Box size={[0.55, 0.82, 0.42]} position={[x0 + 0.65, 0.41, -config.width / 2 + 0.30]} color="#f4f4f0" />}
      {config.shower && <Box size={[0.82, 0.08, 0.82]} position={[x0 + 0.40, 0.04, config.width / 2 - 0.52]} color="#d7e0e4" opacity={0.74} />}
      {config.airConditioning && <Box size={[0.86, 0.28, 0.22]} position={[0, 2.16, -config.width / 2 + 0.15]} color={config.hvacColor === 'white' ? '#ecece7' : config.hvacColor === 'black' ? '#17191b' : '#596168'} />}
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
  let cursor = -total / 2

  for (let i = 0; i < config.fixedGlazingCount; i++) {
    const center = cursor + config.fixedGlazingWidth / 2
    openings.push({ id:'fg'+i, wall:'front', center, width:config.fixedGlazingWidth, height:config.fixedGlazingHeight, sill:0.08, kind:'fixed-glass', glazing:config.glazing, roller: config.rollers && i < config.rollerCount })
    cursor += config.fixedGlazingWidth + 0.10
  }
  for (let i = 0; i < config.aluDoorCount; i++) {
    const center = cursor + config.aluDoorWidth / 2
    openings.push({ id:'ad'+i, wall:'front', center, width:config.aluDoorWidth, height:config.aluDoorHeight, sill:0.08, kind:'door-glazed', glazing:config.glazing, roller: config.rollers && config.fixedGlazingCount + i < config.rollerCount })
    cursor += config.aluDoorWidth + 0.10
  }
  for (let i = 0; i < config.aluWindowCount; i++) {
    const center = cursor + config.aluWindowWidth / 2
    openings.push({ id:'aw'+i, wall:'front', center, width:config.aluWindowWidth, height:config.aluWindowHeight, sill:0.08, kind:'alu-window', glazing:config.glazing })
    cursor += config.aluWindowWidth + 0.10
  }
  for (let i = 0; i < config.pvcWindowCount; i++) {
    openings.push({ id:'pvc'+i, wall:'left', center:(i - (config.pvcWindowCount - 1) / 2) * 0.75, width:config.pvcWindowWidth, height:config.pvcWindowHeight, sill:1.35, kind:'pvc-window', glazing:config.glazing })
  }

  const decor: DecorPlacement[] = []
  const fieldHeight = 2.36
  const fieldY = 1.38
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

  return { externalHeight: 3.0, openings, decor }
}

function ProjectPavilion({ config }: Props) {
  const geometry = config.geometry ?? fallbackGeometry(config)
  const transparent = config.showInterior || config.showStructure
  const opacity = transparent ? 0.22 : 1

  return (
    <group position={[0, 0.07, 0]}>
      <Box size={[config.length, 0.16, config.width]} position={[0, 0.08, 0]} color="#505356" />
      <Wall side="front" config={config} geometry={geometry} opacity={opacity} />
      <Wall side="back" config={config} geometry={geometry} opacity={opacity} />
      <Wall side="left" config={config} geometry={geometry} opacity={opacity} />
      <Wall side="right" config={config} geometry={geometry} opacity={opacity} />
      <Box
        size={[config.length + 0.10, 0.13, config.width + 0.10]}
        position={[0, geometry.externalHeight + 0.065, 0]}
        color={config.flashingColor}
        metalness={0.18}
        roughness={0.62}
      />
      {config.showStructure && <Structure config={config} height={geometry.externalHeight} />}
      <Interior config={config} />
    </group>
  )
}

export default function Pavilion3D({ config }: Props) {
  const cameraDistance = Math.max(8.5, config.length * 1.15)
  const targetHeight = (config.geometry?.externalHeight ?? 3.0) * 0.45
  return (
    <Canvas shadows camera={{ position: [cameraDistance * 0.72, 5.2, cameraDistance], fov: 38 }}>
      <color attach="background" args={['#e9ecef']} />
      <ambientLight intensity={0.92} />
      <directionalLight position={[8, 12, 9]} intensity={2.15} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <ProjectPavilion config={config} />
      <ContactShadows position={[0, 0.05, 0]} opacity={0.36} scale={24} blur={2.8} far={10} />
      <Environment preset="city" />
      <OrbitControls
        makeDefault
        target={[0, targetHeight, 0]}
        minDistance={4.5}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2.03}
      />
      <gridHelper args={[30, 30, '#a8adb1', '#d0d4d7']} position={[0, 0.01, 0]} />
    </Canvas>
  )
}

// VISUAL SHELL HELPERS - Dampol gallery proportions
function DampolFrameLocal({ span, height, side, wallDepth, color }: {
  span: number
  height: number
  side: WallSide
  wallDepth: number
  color: string
}) {
  const topBand = side === 'front' ? 0.42 : 0.34
  const bottomBand = 0.16
  const sidePost = side === 'front' ? 0.18 : 0.14
  const z = wallDepth / 2 + 0.055
  const seamCount = Math.max(1, Math.floor(span / 0.72))

  return (
    <group>
      <Box size={[span, topBand, 0.08]} position={[0, height - topBand / 2, z]} color={color} metalness={0.16} roughness={0.50} />
      <Box size={[span, bottomBand, 0.08]} position={[0, bottomBand / 2, z]} color="#17191b" metalness={0.18} roughness={0.48} />
      <Box size={[sidePost, height, 0.08]} position={[-span / 2 + sidePost / 2, height / 2, z]} color={color} metalness={0.16} roughness={0.50} />
      <Box size={[sidePost, height, 0.08]} position={[span / 2 - sidePost / 2, height / 2, z]} color={color} metalness={0.16} roughness={0.50} />
      {Array.from({ length: seamCount - 1 }, (_, i) => {
        const x = -span / 2 + ((i + 1) * span) / seamCount
        return <Box key={'fs-' + i} size={[0.018, topBand - 0.025, 0.085]} position={[x, height - topBand / 2, z + 0.008]} color="#0f1112" roughness={0.5} />
      })}
    </group>
  )
}

function RibbedSkinLocal({ span, height, openings, wallDepth }: {
  span: number
  height: number
  openings: OpeningPlacement[]
  wallDepth: number
}) {
  const ribs: ReactNode[] = []
  const step = 0.085
  const ribW = 0.018
  const z = wallDepth / 2 + 0.035
  for (let x = -span / 2 + 0.06; x < span / 2 - 0.06; x += step) {
    if (!overlapsOpening(x, height / 2, ribW, height - 0.18, openings)) {
      ribs.push(<Box key={'rib-' + x.toFixed(2)} size={[ribW, height - 0.18, 0.04]} position={[x, height / 2, z]} color="#0f1112" roughness={0.58} />)
    }
  }
  return <>{ribs}</>
}
