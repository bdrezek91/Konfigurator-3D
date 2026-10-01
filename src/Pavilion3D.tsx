import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { ReactNode } from 'react'
import type { PavilionConfig } from './types'

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
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function PanelSeams({ config }: Props) {
  const lines: ReactNode[] = []
  const frontZ = config.width / 2 + 0.064
  const backZ = -config.width / 2 - 0.064
  const h = (config.frontHeight + config.backHeight) / 2
  for (let x = -config.length / 2 + 1; x < config.length / 2; x += 1) {
    lines.push(<group key={'f'+x}>
      <Box size={[0.014, h - 0.16, 0.018]} position={[x, h / 2, frontZ]} color="#252a2e" />
      <Box size={[0.014, h - 0.16, 0.018]} position={[x, h / 2, backZ]} color="#252a2e" />
    </group>)
  }
  return <>{lines}</>
}

function FacadeAccents({ config }: Props) {
  const z = config.width / 2 + 0.13
  const h = config.frontHeight
  if (config.facade === 'plain') return null

  const cassetteColor = config.facade === 'cassette-black' ? '#151719' : '#343a3f'
  const showCassette = ['cassette-graphite', 'cassette-black', 'cassette-lamella'].includes(config.facade)
  const showLamella = ['lamella-winchester', 'lamella-black', 'cassette-lamella'].includes(config.facade)

  return (
    <group>
      {showCassette && Array.from({ length: Math.max(1, Math.floor(config.length / 0.72)) }, (_, i) => {
        const x = -config.length / 2 + 0.38 + i * 0.72
        return <Box key={'c'+i} size={[0.64, 0.42, 0.07]} position={[x, h - 0.28, z]} color={cassetteColor} roughness={0.55} />
      })}
      {showLamella && Array.from({ length: 12 }, (_, i) => {
        const x = config.length / 2 - 1.35 + i * 0.095
        const color = config.facade === 'lamella-black' ? '#1b1d1f' : '#8a6040'
        return <Box key={'l'+i} size={[0.045, h - 0.32, 0.08]} position={[x, h / 2, z + 0.015]} color={color} roughness={0.8} />
      })}
      {config.facade === 'silver-rectangle' && Array.from({ length: 8 }, (_, i) => (
        <Box key={'s'+i} size={[0.055, h - 0.32, 0.08]} position={[-config.length / 2 + 0.4 + i * 0.11, h / 2, z]} color="#a5a5a3" metalness={0.3} />
      ))}
    </group>
  )
}

function GlassPanel({ width, height, position, frame = '#171a1d' }: {
  width: number
  height: number
  position: [number, number, number]
  frame?: string
}) {
  return (
    <group position={position}>
      <Box size={[width + 0.08, height + 0.08, 0.075]} position={[0, 0, 0]} color={frame} />
      <mesh position={[0, 0, 0.052]} castShadow>
        <boxGeometry args={[width, height, 0.045]} />
        <meshPhysicalMaterial color="#86aabb" transparent opacity={0.56} roughness={0.12} metalness={0.08} transmission={0.12} />
      </mesh>
    </group>
  )
}

function Openings({ config }: Props) {
  const z = config.width / 2 + 0.10
  const items: Array<{ kind: 'door' | 'glass' | 'alu'; width: number; height: number }> = []
  for (let i = 0; i < config.fixedGlazingCount; i++) items.push({ kind: 'glass', width: config.fixedGlazingWidth, height: config.fixedGlazingHeight })
  for (let i = 0; i < config.aluDoorCount; i++) items.push({ kind: 'door', width: config.aluDoorWidth, height: config.aluDoorHeight })
  for (let i = 0; i < config.aluWindowCount; i++) items.push({ kind: 'alu', width: config.aluWindowWidth, height: config.aluWindowHeight })

  const totalWidth = items.reduce((sum, item) => sum + item.width, 0) + Math.max(0, items.length - 1) * 0.12
  let cursor = -Math.min(totalWidth, config.length - 0.5) / 2

  return (
    <>
      {items.map((item, index) => {
        const x = cursor + item.width / 2
        cursor += item.width + 0.12
        if (item.kind === 'door') {
          return (
            <group key={index} position={[x, item.height / 2 + 0.08, z]}>
              <Box size={[item.width + 0.09, item.height + 0.09, 0.08]} position={[0, 0, 0]} color="#171a1d" />
              <Box size={[item.width - 0.08, item.height - 0.08, 0.095]} position={[0, 0, 0.015]} color="#647078" roughness={0.35} opacity={0.82} />
              <Box size={[0.04, 0.04, 0.09]} position={[item.width * 0.28, 0, 0.08]} color="#d1d1cc" metalness={0.7} />
            </group>
          )
        }
        return <GlassPanel key={index} width={item.width} height={item.height} position={[x, item.height / 2 + 0.08, z]} />
      })}
      {config.pvcWindowCount > 0 && (
        <group>
          {Array.from({ length: config.pvcWindowCount }, (_, i) => (
            <GlassPanel
              key={'pvc'+i}
              width={config.pvcWindowWidth}
              height={config.pvcWindowHeight}
              position={[-config.length / 2 - 0.10, 1.45, -0.45 + i * 0.75]}
              frame="#292d30"
            />
          ))}
        </group>
      )}
      {config.rollers && Array.from({ length: Math.min(config.rollerCount, items.length) }, (_, i) => {
        const spacing = Math.min(1.4, config.length / Math.max(config.rollerCount + 1, 2))
        return <Box key={'r'+i} size={[1.05, 0.15, 0.12]} position={[(i - (config.rollerCount - 1) / 2) * spacing, config.frontHeight - 0.22, z + 0.05]} color="#202428" />
      })}
    </>
  )
}

function Interior({ config }: Props) {
  if (!config.showInterior) return null
  const x0 = -config.length / 2 + 0.7
  return (
    <group>
      {config.partitionWall && <Box size={[0.08, 2.35, Math.min(2.1, config.width - 0.3)]} position={[x0 + 1.25, 1.18, -0.25]} color="#e8e6df" opacity={0.82} />}
      {config.kitchen && (
        <group position={[config.length / 2 - Math.max(0.8, config.kitchenLength / 2) - 0.15, 0, -config.width / 2 + 0.32]}>
          <Box size={[config.kitchenLength, 0.88, 0.55]} position={[0, 0.44, 0]} color="#e8e3d8" />
          <Box size={[config.kitchenLength, 0.05, 0.60]} position={[0, 0.91, 0]} color="#55585a" />
          {config.fridge && <Box size={[0.52, 1.75, 0.58]} position={[config.kitchenLength / 2 + 0.34, 0.88, 0]} color="#d4d7d8" metalness={0.25} />}
        </group>
      )}
      {config.toiletCompact && <Box size={[0.45, 0.42, 0.65]} position={[x0, 0.21, -config.width / 2 + 0.55]} color="#f4f4f0" />}
      {config.washbasin && <Box size={[0.55, 0.82, 0.42]} position={[x0 + 0.65, 0.41, -config.width / 2 + 0.28]} color="#f4f4f0" />}
      {config.shower && <Box size={[0.82, 0.08, 0.82]} position={[x0 + 0.4, 0.04, config.width / 2 - 0.52]} color="#d7e0e4" opacity={0.7} />}
      {config.airConditioning && <Box size={[0.86, 0.28, 0.22]} position={[0, 2.15, -config.width / 2 + 0.15]} color={config.hvacColor === 'white' ? '#ecece7' : config.hvacColor === 'black' ? '#17191b' : '#596168'} />}
      {config.ledCeiling > 0 && Array.from({ length: Math.min(config.ledCeiling, 6) }, (_, i) => (
        <Box key={'led'+i} size={[0.38, 0.03, 0.18]} position={[-config.length / 2 + (i + 1) * config.length / (Math.min(config.ledCeiling, 6) + 1), 2.38, 0]} color="#f5f0cf" />
      ))}
    </group>
  )
}

function PavilionModel({ config }: Props) {
  const hFront = config.frontHeight
  const hBack = config.backHeight
  const avgH = (hFront + hBack) / 2
  const slope = Math.atan2(hFront - hBack, config.width)
  const roofLength = Math.hypot(config.width, hFront - hBack)
  const structureSize = config.construction === 'angle50' ? 0.07 : 0.10
  const frame = config.construction === 'full100' || config.construction === 'static100' ? '#111315' : '#24282b'
  const wallOpacity = config.showInterior ? 0.34 : 1

  return (
    <group position={[0, 0.08, 0]}>
      <Box size={[config.length, 0.16, config.width]} position={[0, 0.08, 0]} color="#4b4e50" />
      <Box size={[config.length, hFront, 0.12]} position={[0, hFront / 2, config.width / 2]} color={config.exteriorColor} opacity={wallOpacity} />
      <Box size={[config.length, hBack, 0.12]} position={[0, hBack / 2, -config.width / 2]} color={config.exteriorColor} opacity={wallOpacity} />
      <Box size={[0.12, avgH, config.width]} position={[config.length / 2, avgH / 2, 0]} color={config.exteriorColor} opacity={wallOpacity} />
      <Box size={[0.12, avgH, config.width]} position={[-config.length / 2, avgH / 2, 0]} color={config.exteriorColor} opacity={wallOpacity} />
      <Box
        size={[config.length + 0.10, 0.13, roofLength + 0.08]}
        position={[0, avgH + 0.07, 0]}
        rotation={[-slope, 0, 0]}
        color={config.flashingColor}
        metalness={0.18}
      />

      {config.showStructure && (
        <>
          {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
            <Box
              key={sx+':'+sz}
              size={[structureSize, avgH + 0.12, structureSize]}
              position={[sx * (config.length / 2 + 0.03), avgH / 2, sz * (config.width / 2 + 0.03)]}
              color={frame}
              metalness={0.35}
            />
          )))}
          <Box size={[config.length + 0.08, structureSize, structureSize]} position={[0, 0.16, config.width / 2 + 0.03]} color={frame} metalness={0.35} />
          <Box size={[config.length + 0.08, structureSize, structureSize]} position={[0, 0.16, -config.width / 2 - 0.03]} color={frame} metalness={0.35} />
        </>
      )}

      <PanelSeams config={config} />
      <FacadeAccents config={config} />
      <Openings config={config} />
      <Interior config={config} />
    </group>
  )
}

export default function Pavilion3D({ config }: Props) {
  const cameraDistance = Math.max(8.5, config.length * 1.15)
  return (
    <Canvas shadows camera={{ position: [cameraDistance * 0.72, 5.2, cameraDistance], fov: 38 }}>
      <color attach="background" args={['#e9ecef']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[8, 12, 9]} intensity={2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <PavilionModel config={config} />
      <ContactShadows position={[0, 0.05, 0]} opacity={0.36} scale={24} blur={2.8} far={10} />
      <Environment preset="city" />
      <OrbitControls
        makeDefault
        target={[0, ((config.frontHeight + config.backHeight) / 2) * 0.48, 0]}
        minDistance={4.5}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2.03}
      />
      <gridHelper args={[30, 30, '#a8adb1', '#d0d4d7']} position={[0, 0.01, 0]} />
    </Canvas>
  )
}
