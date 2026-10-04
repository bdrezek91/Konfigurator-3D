import { Environment, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useCallback, useMemo } from 'react'
import { ACESFilmicToneMapping, Material, MeshPhysicalMaterial, MeshStandardMaterial, Shape, SRGBColorSpace } from 'three'
import { buildOpeningJoinery, type OpeningJoinerySpec, type WallPlane } from '../construction/joinery/build'
import type { Part } from '../construction/types'
import { LayerRenderer } from '../render/LayerRenderer'
import type { PartLook } from '../render/layers'

/**
 * Stanowisko stolarki z przekrojów (?lab=joinery&cam=px,py,pz,tx,ty,tz,fov): ten sam generator i renderer warstw co
 * galeria-163, na próbnej ścianie — FIX ze słupkiem i ślemieniem (galeria-163 nie ma słupka) oraz drzwi.
 */
const WALL = { length: 3.2, height: 2.6, thickness: 0.1 }
const COLOR = '#383E42'
const OPENINGS: OpeningJoinerySpec[] = [
  { id: 'LAB-FIX', kind: 'fixed', a: 0.3, b: 1.9, y0: 0.1, y1: 2.05, inset: { l: 0.0008, r: 0.0008, t: 0.0008, b: 0.0008 }, color: COLOR, mullions: [1.1], transoms: [1.65] },
  { id: 'LAB-DOOR', kind: 'door', a: 2.05, b: 3.05, y0: 0, y1: 2.05, inset: { l: 0.0008, r: 0.0008, t: 0.0008, b: 0 }, color: COLOR, hinge: 'left', handle: 'lever' },
]

function WallSlab() {
  const shape = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0); s.lineTo(WALL.length, 0); s.lineTo(WALL.length, WALL.height); s.lineTo(0, WALL.height); s.closePath()
    for (const o of OPENINGS) {
      const h = new Shape()
      h.moveTo(o.a, o.y0); h.lineTo(o.b, o.y0); h.lineTo(o.b, o.y1); h.lineTo(o.a, o.y1); h.closePath()
      s.holes.push(h)
    }
    return s
  }, [])
  return (
    <mesh position={[0, 0, -WALL.thickness]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: WALL.thickness, bevelEnabled: false }]} />
      <meshStandardMaterial color="#3a4044" roughness={0.55} metalness={0.04} />
    </mesh>
  )
}

export default function JoineryLab() {
  const q = new URLSearchParams(window.location.search)
  const camQ = q.get('cam')?.split(',').map(Number)
  const cam = camQ && camQ.length === 7 ? camQ : [1.6, 1.3, 3.6, 1.6, 1.1, 0, 40]
  const parts = useMemo<Part[]>(() => {
    const plane: WallPlane = { origin: [0, 0, 0], u: [1, 0, 0], up: [0, 1, 0], out: [0, 0, 1], stage: 6, explode: [0, 0, 1] }
    return OPENINGS.flatMap((o) => buildOpeningJoinery(o, plane))
  }, [])
  const mats = useMemo(() => ({
    frame: new MeshStandardMaterial({ color: COLOR, metalness: 0.12, roughness: 0.42 }),
    gasket: new MeshStandardMaterial({ color: '#0c0d0e', roughness: 0.8 }),
    hw: new MeshStandardMaterial({ color: '#aeb3b5', metalness: 0.85, roughness: 0.28 }),
    glass: new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0, transmission: 1, thickness: 0.024, ior: 1.52, specularIntensity: 3.4, attenuationColor: '#9fb0a8', attenuationDistance: 0.024 }),
  }), [])
  const lookOf = useCallback((p: Part): PartLook => {
    const m: Material = p.material === 'glass' ? mats.glass : p.material === 'gasket' ? mats.gasket : p.material === 'hardware' ? mats.hw : mats.frame
    return { material: m, castShadow: p.material !== 'glass' }
  }, [mats])
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#dfe3e5' }}>
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [cam[0], cam[1], cam[2]], fov: cam[6], near: 0.01, far: 100 }}
        onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace }}>
        <color attach="background" args={['#dfe3e5']} />
        <Suspense fallback={null}>
          <Environment files="./hdri/kloofendal_43d_clear_2k.hdr" environmentIntensity={1.2} environmentRotation={[0, Math.PI, 0]} />
        </Suspense>
        <directionalLight position={[-4, 5, 6]} intensity={2} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0002} shadow-normalBias={0.02} />
        <WallSlab />
        <LayerRenderer parts={parts} lookOf={lookOf} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1.6, -0.001, 0.5]} receiveShadow>
          <planeGeometry args={[6, 3]} />
          <meshStandardMaterial color="#9a9c98" roughness={0.9} />
        </mesh>
        <OrbitControls target={[cam[3], cam[4], cam[5]]} makeDefault />
      </Canvas>
      <div style={{ position: 'absolute', left: 12, top: 10, font: '600 13px Inter, system-ui', color: '#1d2124' }}>
        Stolarka z przekrojów — generic-aluminium-52 (ASSUMPTION) · FIX ze słupkiem i ślemieniem · drzwi
      </div>
    </div>
  )
}
