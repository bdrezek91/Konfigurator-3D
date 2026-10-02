import { Environment } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { ACESFilmicToneMapping, BufferAttribute, CanvasTexture, PlaneGeometry, RepeatWrapping, Shape, SRGBColorSpace } from 'three'
import { profileHeight, profileNormalMap, SURFACE_PROFILES, type SurfaceProfileDef } from '../scene/materials/profiles'
import type { PanelManufacturer, SurfaceProfile } from '../types'

/**
 * Stanowisko kalibracji profili blach (?lab=profiles&m=paneltech&p=microwave&light=side|front).
 * A — dotychczasowa metoda, B — normal mapa z fizycznego profilu [mm], C — pełna geometria (wzorzec).
 * Każda próbka: płyta 1200 × 300 mm, linijka 1000 mm z podziałką co 100 mm.
 */

const W = 1.2
const H = 0.3
const COLOR = '#383e42'

/** Kopia dawnego generatora (tylko do testu A/B). */
function legacyNormal(profile: SurfaceProfile) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 256, 256)
  const spacing = profile === 'microrib' ? 9 : profile === 'microline' ? 14 : profile === 'carbon' ? 12 : profile === 'microwave' ? 22 : 36
  const strength = profile === 'microrib' || profile === 'microline' ? 5 : 9
  for (let x = 0; x < 256; x += spacing) {
    const grad = ctx.createLinearGradient(x - 3, 0, x + 3, 0)
    grad.addColorStop(0, 'rgb(128,128,255)')
    grad.addColorStop(0.35, 'rgb(' + (128 - strength) + ',128,255)')
    grad.addColorStop(0.65, 'rgb(' + (128 + strength) + ',128,255)')
    grad.addColorStop(1, 'rgb(128,128,255)')
    ctx.fillStyle = grad
    ctx.fillRect(x - 3, 0, 6, 256)
  }
  const t = new CanvasTexture(canvas)
  t.wrapS = RepeatWrapping
  t.wrapT = RepeatWrapping
  t.repeat.set(5, 1)
  return t
}

const LEGACY_BOXES: Partial<Record<SurfaceProfile, { step: number; width: number; depth: number; color: string }>> = {
  linear: { step: 0.18, width: 0.006, depth: 0.0012, color: '#2a2f32' },
  ribbed: { step: 0.18, width: 0.006, depth: 0.0012, color: '#2a2f32' },
  microline: { step: 0.055, width: 0.003, depth: 0.0009, color: '#353a3d' },
  microrib: { step: 0.035, width: 0.0025, depth: 0.0008, color: '#3b4043' },
  microwave: { step: 0.070, width: 0.008, depth: 0.0012, color: '#34393c' },
  carbon: { step: 0.045, width: 0.004, depth: 0.0010, color: '#303538' },
}

function panelShape() {
  const s = new Shape()
  s.moveTo(0, 0)
  s.lineTo(W, 0)
  s.lineTo(W, H)
  s.lineTo(0, H)
  s.closePath()
  return s
}

function Ruler({ y }: { y: number }) {
  return (
    <group position={[0.1, y, 0.002]}>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={i} position={[i * 0.1, i % 5 === 0 ? 0.03 : 0.018, 0]}>
          <planeGeometry args={[i % 5 === 0 ? 0.004 : 0.002, i % 5 === 0 ? 0.06 : 0.036]} />
          <meshBasicMaterial color={i === 0 || i === 10 ? '#e0201b' : '#f2f2f2'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function SampleA({ profile, y }: { profile: SurfaceProfile; y: number }) {
  const normal = useMemo(() => legacyNormal(profile), [profile])
  const shape = useMemo(() => panelShape(), [])
  const box = LEGACY_BOXES[profile]
  return (
    <group position={[0, y, 0]}>
      <mesh>
        <extrudeGeometry args={[shape, { depth: 0.02, bevelEnabled: false }]} />
        <meshStandardMaterial color={COLOR} metalness={0.38} roughness={0.5} normalMap={normal} normalScale={[0.18, 0.18]} />
      </mesh>
      {box && Array.from({ length: Math.floor(W / box.step) }, (_, i) => (
        <mesh key={i} position={[(i + 1) * box.step, H / 2, 0.02 + 0.008 + box.depth / 2]}>
          <boxGeometry args={[box.width, H, box.depth]} />
          <meshStandardMaterial color={box.color} roughness={0.64} />
        </mesh>
      ))}
    </group>
  )
}

function SampleB({ def, y }: { def: SurfaceProfileDef; y: number }) {
  const normal = useMemo(() => profileNormalMap(def), [def])
  const shape = useMemo(() => panelShape(), [])
  return (
    <mesh position={[0, y, 0]}>
      <extrudeGeometry args={[shape, { depth: 0.02, bevelEnabled: false }]} />
      <meshStandardMaterial color={COLOR} metalness={0.38} roughness={0.5} normalMap={normal} />
    </mesh>
  )
}

/** Wzorzec: rzeczywista geometria fali (≈ 16 wierzchołków na okres). */
function SampleC({ def, y }: { def: SurfaceProfileDef; y: number }) {
  const geometry = useMemo(() => {
    const segments = Math.ceil((W * 1000) / def.pitchMm) * 16
    const g = new PlaneGeometry(W, H, segments, 1)
    const pos = g.attributes.position as BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + W / 2
      pos.setZ(i, profileHeight(def, x * 1000) / 1000)
    }
    g.computeVertexNormals()
    return g
  }, [def])
  return (
    <mesh geometry={geometry} position={[W / 2, y + H / 2, 0.02]}>
      <meshStandardMaterial color={COLOR} metalness={0.38} roughness={0.5} />
    </mesh>
  )
}

export default function ProfileLab() {
  const q = new URLSearchParams(window.location.search)
  const manufacturer = (q.get('m') ?? 'paneltech') as PanelManufacturer
  const profile = (q.get('p') ?? 'microwave') as SurfaceProfile
  const light = q.get('light') === 'front' ? 'front' : 'side'
  const def = SURFACE_PROFILES[manufacturer][profile] ?? SURFACE_PROFILES.paneltech[profile]
  if (!def) return <p style={{ padding: 24 }}>Brak definicji profilu {manufacturer}/{profile}.</p>
  const rows = [0.75, 0.38, 0.01]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1b1e20' }}>
      <Canvas
        dpr={1}
        camera={{ position: [0.6, 0.53, 3.2], fov: 22 }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.outputColorSpace = SRGBColorSpace
          camera.lookAt(0.6, 0.53, 0)
        }}
      >
        <Suspense fallback={null}>
          <Environment files="./hdri/kloofendal_43d_clear_2k.hdr" environmentIntensity={0.85} environmentRotation={[0, Math.PI, 0]} />
        </Suspense>
        {/* światło boczne: niemal równoległe do lica — najsurowszy test reliefu; frontalne: od strony kamery */}
        <directionalLight position={light === 'side' ? [-6, 0.6, 1.1] : [0.6, 1.2, 6]} intensity={2.4} color="#fff1dc" />
        <SampleA profile={profile} y={rows[0]} />
        <SampleB def={def} y={rows[1]} />
        <SampleC def={def} y={rows[2]} />
        {rows.map((y) => <Ruler key={y} y={y + H + 0.005} />)}
      </Canvas>
      <div style={{ position: 'absolute', left: 16, top: 12, color: '#fff', font: '600 13px Inter, system-ui', lineHeight: 1.5 }}>
        <div>{def.label} · pitch {def.pitchMm} mm · głębokość {def.amplitudeMm} mm · światło {light === 'side' ? 'boczne' : 'frontalne'}</div>
        <div style={{ color: '#9aa0a4', fontWeight: 500 }}>Od góry: A — dotychczasowa metoda · B — normal mapa z profilu [mm] · C — pełna geometria (wzorzec). Linijka: 1000 mm, podziałka 100 mm.</div>
      </div>
    </div>
  )
}
