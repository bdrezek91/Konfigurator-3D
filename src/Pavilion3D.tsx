import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { ReactNode } from 'react'
import type { PavilionConfig } from './types'

type Props = { config: PavilionConfig }

function Box({
  size,
  position,
  color,
  metalness = 0.08,
  roughness = 0.72,
}: {
  size: [number, number, number]
  position: [number, number, number]
  color: string
  metalness?: number
  roughness?: number
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
    </mesh>
  )
}

function PanelSeams({ config }: Props) {
  const lines: ReactNode[] = []
  const frontZ = config.width / 2 + 0.061
  const backZ = -config.width / 2 - 0.061
  for (let x = -config.length / 2 + 1; x < config.length / 2; x += 1) {
    lines.push(
      <group key={`front-${x}`}>
        <Box size={[0.018, config.height - 0.14, 0.018]} position={[x, config.height / 2, frontZ]} color="#1f2428" />
        <Box size={[0.018, config.height - 0.14, 0.018]} position={[x, config.height / 2, backZ]} color="#1f2428" />
      </group>,
    )
  }

  for (let z = -config.width / 2 + 1; z < config.width / 2; z += 1) {
    lines.push(
      <group key={`side-${z}`}>
        <Box size={[0.018, config.height - 0.14, 0.018]} position={[-config.length / 2 - 0.061, config.height / 2, z]} color="#1f2428" />
        <Box size={[0.018, config.height - 0.14, 0.018]} position={[config.length / 2 + 0.061, config.height / 2, z]} color="#1f2428" />
      </group>,
    )
  }

  return <>{lines}</>
}

function FrontOpenings({ config }: Props) {
  const frontZ = config.width / 2 + 0.085
  const windowWidth = Math.min(1.2, Math.max(0.75, config.length / 7))
  const spacing = Math.min(1.7, config.length / Math.max(config.windows + 1.5, 3))
  const windowXs = Array.from({ length: config.windows }, (_, index) =>
    (index - (config.windows - 1) / 2) * spacing + (config.door ? 0.45 : 0),
  )
  return (
    <>
      {config.door && (
        <group position={[-config.length / 2 + 0.72, 1.05, frontZ]}>
          <Box size={[0.98, 2.1, 0.08]} position={[0, 0, 0]} color="#171a1d" />
          <Box size={[0.86, 1.98, 0.095]} position={[0, 0, 0.012]} color="#5c6267" roughness={0.45} />
          <Box size={[0.045, 0.045, 0.09]} position={[0.27, 0, 0.08]} color="#d0d0ca" metalness={0.7} />
        </group>
      )}

      {windowXs.map((x, index) => (
        <group key={index} position={[x, 1.55, frontZ]}>
          <Box size={[windowWidth + 0.11, 1.11, 0.075]} position={[0, 0, 0]} color="#171a1d" />
          <mesh position={[0, 0, 0.05]} castShadow>
            <boxGeometry args={[windowWidth, 1, 0.055]} />
            <meshStandardMaterial color="#8fb4c7" transparent opacity={0.68} roughness={0.18} metalness={0.18} />
          </mesh>
          <Box size={[0.035, 1, 0.075]} position={[0, 0, 0.085]} color="#24282b" />
        </group>
      ))}
    </>
  )
}
function LamellaAccent({ config }: Props) {
  if (!config.lamella) return null
  const z = config.width / 2 + 0.125
  const start = config.length / 2 - 1.05

  return (
    <group>
      {Array.from({ length: 7 }, (_, index) => (
        <Box
          key={index}
          size={[0.055, config.height - 0.22, 0.08]}
          position={[start + index * 0.115, config.height / 2, z]}
          color="#8b6544"
          roughness={0.78}
        />
      ))}
    </group>
  )
}

function PavilionModel({ config }: Props) {
  const frame = '#202428'
  return (
    <group position={[0, 0.1, 0]}>
      <Box size={[config.length, 0.16, config.width]} position={[0, 0.08, 0]} color="#4c4f50" />
      <Box size={[config.length, config.height, 0.12]} position={[0, config.height / 2, config.width / 2]} color={config.color} />
      <Box size={[config.length, config.height, 0.12]} position={[0, config.height / 2, -config.width / 2]} color={config.color} />
      <Box size={[0.12, config.height, config.width]} position={[config.length / 2, config.height / 2, 0]} color={config.color} />
      <Box size={[0.12, config.height, config.width]} position={[-config.length / 2, config.height / 2, 0]} color={config.color} />
      <Box size={[config.length + 0.1, 0.14, config.width + 0.1]} position={[0, config.height + 0.07, 0]} color="#505457" />

      {config.showStructure && (
        <>
          <Box size={[0.09, config.height + 0.08, 0.09]} position={[-config.length / 2 - 0.035, config.height / 2, config.width / 2 + 0.035]} color={frame} metalness={0.35} />
          <Box size={[0.09, config.height + 0.08, 0.09]} position={[config.length / 2 + 0.035, config.height / 2, config.width / 2 + 0.035]} color={frame} metalness={0.35} />
          <Box size={[0.09, config.height + 0.08, 0.09]} position={[-config.length / 2 - 0.035, config.height / 2, -config.width / 2 - 0.035]} color={frame} metalness={0.35} />
          <Box size={[0.09, config.height + 0.08, 0.09]} position={[config.length / 2 + 0.035, config.height / 2, -config.width / 2 - 0.035]} color={frame} metalness={0.35} />
        </>
      )}

      <PanelSeams config={config} />
      <FrontOpenings config={config} />
      <LamellaAccent config={config} />
    </group>
  )
}

export default function Pavilion3D({ config }: Props) {
  const cameraDistance = Math.max(8.5, config.length * 1.18)
  return (
    <Canvas shadows camera={{ position: [cameraDistance * 0.72, 5.2, cameraDistance], fov: 38 }}>
      <color attach="background" args={['#e9ecef']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 12, 9]} intensity={2.2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <PavilionModel config={config} />
      <ContactShadows position={[0, 0.08, 0]} opacity={0.38} scale={24} blur={2.8} far={9} />
      <Environment preset="city" />
      <OrbitControls
        makeDefault
        target={[0, config.height * 0.48, 0]}
        minDistance={5}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2.05}
      />
      <gridHelper args={[30, 30, '#a8adb1', '#d0d4d7']} position={[0, 0.01, 0]} />
    </Canvas>
  )
}
