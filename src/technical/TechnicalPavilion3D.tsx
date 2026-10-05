import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Edges,
  Grid,
  Html,
  Line,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  SoftShadows,
} from '@react-three/drei'
import {
  Color,
  Euler,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Plane,
  Quaternion,
  Shape,
  Vector3,
} from 'three'
import { createContext, memo, useContext, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import type { ComponentCategory, ComponentModel, ModelComponent, Vec3 } from '../components'
import { CATEGORY_COLORS, geometryOf } from '../components'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildRunGeometry } from '../construction/geometry'
import { joineryPartsByOpening } from '../construction/joinery/cutlist'
import type { Part } from '../construction/types'
import { m, PHYS } from '../physical/spec'
import type { PavilionConfig } from '../types'
import { envelope } from '../scene/geometry'

/**
 * Warstwa DOM na etykiety <Html> (wymiary, numery pozycji) — własna, poza płótnem. Domyślnie drei dokleja etykiety
 * do kontenera płótna, który przy wyjściu z trybu technicznego znika wcześniej niż etykiety → wyjątek removeChild.
 */
const LabelLayerContext = createContext<RefObject<HTMLDivElement> | undefined>(undefined)
const useLabelLayer = () => useContext(LabelLayerContext)

export type TechnicalView =
  | 'axon'
  | 'front'
  | 'side'
  | 'top'
  | 'perspective'
  | 'detail-a'
  | 'detail-b'
  | 'detail-c'
  | 'detail-d'

export type ClipAxis = 'none' | 'x' | 'y' | 'z'

export type TechnicalProps = {
  config: PavilionConfig
  model: ComponentModel
  exploded: number
  assemblyStage: number
  categoryVisibility: Record<ComponentCategory, boolean>
  selectedId?: string
  hoveredId?: string
  isolatedId?: string
  view: TechnicalView
  showDimensions: boolean
  showBalloons: boolean
  clipAxis: ClipAxis
  clipOffset: number
  onSelect: (id?: string) => void
  onHover: (id?: string) => void
}

const CATEGORY_ORDER: ComponentCategory[] = [
  'floor-frame',
  'structure',
  'corner-posts',
  'roof-beams',
  'floor-panels',
  'wall-panels',
  'roof-panels',
  'flashings',
  'joinery',
  'decor',
  'seals',
  'installations',
  'interior',
  'fasteners',
]

function explodeScale(category: ComponentCategory) {
  const idx = CATEGORY_ORDER.indexOf(category)
  return 0.55 + Math.max(0, idx) * 0.12
}

function clippingPlanes(axis: ClipAxis, offset: number) {
  if (axis === 'none') return [] as Plane[]
  const normal =
    axis === 'x' ? new Vector3(-1, 0, 0) :
    axis === 'y' ? new Vector3(0, -1, 0) :
    new Vector3(0, 0, -1)
  return [new Plane(normal, offset)]
}

function dimsForBox(c: ModelComponent): [number, number, number] {
  const l = c.dimensions.lengthMm / 1000
  const w = c.dimensions.widthMm / 1000
  const t = Math.max(0.001, c.dimensions.thicknessMm / 1000)
  if (c.category === 'wall-panels' || c.category === 'joinery' || c.category === 'decor') return [w, l, t]
  if (c.category === 'floor-panels' || c.category === 'roof-panels' || c.category === 'interior') return [w, t, l]
  if (c.category === 'seals') return [l, Math.max(0.003, w), Math.max(0.002, t)]
  if (c.category === 'floor-frame' || c.category === 'structure' || c.category === 'corner-posts' || c.category === 'roof-beams') {
    const outer = Math.max(0.03, w)
    return [l, outer, outer]
  }
  return [Math.max(0.03, l), Math.max(0.03, w), Math.max(0.02, t)]
}

function opacityFor(c: ModelComponent, selectedId?: string, hoveredId?: string, isolatedId?: string) {
  if (isolatedId && c.id !== isolatedId) return 0.10
  if (selectedId === c.id || hoveredId === c.id) return 1
  return 1
}

function normalizedExplodeDirection(direction: Vec3): Vec3 {
  const length = Math.hypot(direction[0], direction[1], direction[2])
  if (length < 0.0001) return [0, 1, 0]
  return [direction[0] / length, direction[1] / length, direction[2] / length]
}

function technicalColor(c: ModelComponent, selectedId?: string, hoveredId?: string) {
  if (selectedId === c.id) return '#ff3b30'
  if (hoveredId === c.id) return '#ffd54f'
  return CATEGORY_COLORS[c.category]
}

type ItemProps = {
  component: ModelComponent
  /** P10: stolarka z przekrojów (te same części co widok 3D) zamiast bryły zastępczej; prześwit — model Systemu 1 ma go w y */
  joineryParts?: Part[]
  gap?: number
  exploded: number
  assemblyStage: number
  visible: boolean
  selectedId?: string
  hoveredId?: string
  isolatedId?: string
  planes: Plane[]
  sectionLayers: boolean
  onSelect: (id?: string) => void
  onHover: (id?: string) => void
}

function useExplodedGroup(
  component: ModelComponent,
  exploded: number,
  assemblyStage: number,
  visible: boolean,
) {
  const ref = useRef<Group>(null)
  useFrame((_, delta) => {
    const g = ref.current
    if (!g) return
    g.visible = visible && component.assemblyStage <= assemblyStage
    const scale = explodeScale(component.category) * exploded
    const direction = normalizedExplodeDirection(component.explodeDirection)
    const target = new Vector3(
      component.position[0] + direction[0] * scale,
      component.position[1] + direction[1] * scale,
      component.position[2] + direction[2] * scale,
    )
    const k = 1 - Math.exp(-delta * 10)
    g.position.lerp(target, k)
    g.rotation.set(component.rotation[0], component.rotation[1], component.rotation[2])
  })
  return ref
}

function PanelLayers({
  component,
  color,
  opacity,
  planes,
  sectionLayers,
}: {
  component: ModelComponent
  color: string
  opacity: number
  planes: Plane[]
  sectionLayers: boolean
}) {
  const size = dimsForBox(component)
  const wall = component.category === 'wall-panels'
  const roofOrFloor = component.category === 'roof-panels' || component.category === 'floor-panels'
  const skin = 0.0008

  if (!sectionLayers || (!wall && !roofOrFloor)) {
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          roughness={0.62}
          metalness={component.category === 'wall-panels' || component.category === 'roof-panels' ? 0.28 : 0.08}
          transparent={opacity < 0.99}
          opacity={opacity}
          clippingPlanes={planes}
          clipShadows
        />
        <Edges threshold={18} color="#111315" />
      </mesh>
    )
  }

  const coreColor = component.material.includes('EPS') ? '#f0f0e8' : '#e8d77c'
  if (wall) {
    const core = Math.max(0.002, size[2] - skin * 2)
    return (
      <group>
        <mesh position={[0, 0, -size[2] / 2 + skin / 2]}>
          <boxGeometry args={[size[0], size[1], skin]} />
          <meshStandardMaterial color="#b9c0c4" metalness={0.35} roughness={0.48} clippingPlanes={planes} />
        </mesh>
        <mesh>
          <boxGeometry args={[size[0], size[1], core]} />
          <meshStandardMaterial color={coreColor} roughness={0.92} clippingPlanes={planes} />
          <Edges threshold={18} color="#111315" />
        </mesh>
        <mesh position={[0, 0, size[2] / 2 - skin / 2]}>
          <boxGeometry args={[size[0], size[1], skin]} />
          <meshStandardMaterial color="#b9c0c4" metalness={0.35} roughness={0.48} clippingPlanes={planes} />
        </mesh>
      </group>
    )
  }

  const core = Math.max(0.002, size[1] - skin * 2)
  return (
    <group>
      <mesh position={[0, -size[1] / 2 + skin / 2, 0]}>
        <boxGeometry args={[size[0], skin, size[2]]} />
        <meshStandardMaterial color="#b9c0c4" metalness={0.35} roughness={0.48} clippingPlanes={planes} />
      </mesh>
      <mesh>
        <boxGeometry args={[size[0], core, size[2]]} />
        <meshStandardMaterial color={coreColor} roughness={0.92} clippingPlanes={planes} />
        <Edges threshold={18} color="#111315" />
      </mesh>
      <mesh position={[0, size[1] / 2 - skin / 2, 0]}>
        <boxGeometry args={[size[0], skin, size[2]]} />
        <meshStandardMaterial color="#b9c0c4" metalness={0.35} roughness={0.48} clippingPlanes={planes} />
      </mesh>
    </group>
  )
}

function FlashingGeometry({ component }: { component: ModelComponent }) {
  return useMemo(() => {
    if (!component.profile2Dmm || component.profile2Dmm.length < 3) return null
    const shape = new Shape()
    component.profile2Dmm.forEach(([x, y], i) => {
      const px = x / 1000
      const py = y / 1000
      if (i === 0) shape.moveTo(px, py)
      else shape.lineTo(px, py)
    })
    const depth = Math.max(0.02, component.dimensions.lengthMm / 1000)
    const geom = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
    geom.computeBoundingBox()
    if (geom.boundingBox) {
      const center = new Vector3()
      geom.boundingBox.getCenter(center)
      geom.translate(-center.x, -center.y, -center.z)
    }
    geom.rotateY(Math.PI / 2)
    return geom
  }, [component])
}

/**
 * Stolarka z części modelu (przekroje — ościeżnice, skrzydła, listwy, uszczelki, szyby, okucia) w układzie elementu BOM:
 * geometria modelu Systemu 1 (świat, z prześwitem) → odjęty prześwit → odwrotność pozy elementu (grupa explode go ustawia).
 */
function JoineryFromParts({ component, parts, gap, color, opacity, planes }: {
  component: ModelComponent; parts: Part[]; gap: number; color: string; opacity: number; planes: Plane[]
}) {
  const geos = useMemo(() => {
    const inv = new Matrix4().compose(new Vector3(...component.position), new Quaternion().setFromEuler(new Euler(...component.rotation)), new Vector3(1, 1, 1)).invert()
    const down = new Matrix4().makeTranslation(0, -gap, 0)
    const group = (pred: (p: Part) => boolean) => {
      const list = parts.filter(pred).map((p) => {
        const g = buildRunGeometry(p.geometry)
        g.deleteAttribute('color')
        return g.applyMatrix4(down).applyMatrix4(inv)
      })
      return list.length ? mergeGeometries(list, false) : null
    }
    return {
      frame: group((p) => p.material !== 'glass' && p.material !== 'gasket' && p.material !== 'hardware'),
      gasket: group((p) => p.material === 'gasket'),
      hardware: group((p) => p.material === 'hardware'),
      glass: group((p) => p.material === 'glass'),
    }
  }, [component, parts, gap])
  useEffect(() => () => Object.values(geos).forEach((g) => g?.dispose()), [geos])
  return (
    <>
      {geos.frame && (
        <mesh geometry={geos.frame} castShadow receiveShadow>
          <meshStandardMaterial color={color} roughness={0.48} metalness={0.3} transparent={opacity < 0.99} opacity={opacity} clippingPlanes={planes} />
          <Edges threshold={30} color="#111315" />
        </mesh>
      )}
      {geos.gasket && <mesh geometry={geos.gasket}><meshStandardMaterial color="#15181a" roughness={0.8} clippingPlanes={planes} transparent={opacity < 0.99} opacity={opacity} /></mesh>}
      {geos.hardware && <mesh geometry={geos.hardware}><meshStandardMaterial color="#b9bec0" roughness={0.3} metalness={0.7} clippingPlanes={planes} transparent={opacity < 0.99} opacity={opacity} /></mesh>}
      {geos.glass && (
        <mesh geometry={geos.glass}>
          <meshStandardMaterial color="#88a6b4" roughness={0.18} metalness={0.08} transparent opacity={Math.max(0.18, opacity * 0.52)} clippingPlanes={planes} />
        </mesh>
      )}
    </>
  )
}

const TechnicalItem = memo(function TechnicalItem(props: ItemProps) {
  const {
    component,
    joineryParts,
    gap = 0,
    exploded,
    assemblyStage,
    visible,
    selectedId,
    hoveredId,
    isolatedId,
    planes,
    sectionLayers,
    onSelect,
    onHover,
  } = props
  const ref = useExplodedGroup(component, exploded, assemblyStage, visible)
  const opacity = opacityFor(component, selectedId, hoveredId, isolatedId)
  const color = technicalColor(component, selectedId, hoveredId)
  const flashingGeom = FlashingGeometry({ component })
  const size = dimsForBox(component)

  const pointerProps = {
    onClick: (event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      onSelect(component.id)
    },
    onPointerOver: (event: { stopPropagation: () => void }) => {
      event.stopPropagation()
      onHover(component.id)
    },
    onPointerOut: () => onHover(undefined),
  }

  return (
    <group ref={ref}>
      {component.primitive === 'flashing' && flashingGeom ? (
        <mesh geometry={flashingGeom} castShadow receiveShadow {...pointerProps}>
          <meshStandardMaterial
            color={color}
            roughness={0.52}
            metalness={0.36}
            side={2}
            transparent={opacity < 0.99}
            opacity={opacity}
            clippingPlanes={planes}
            clipShadows
          />
          <Edges threshold={16} color="#111315" />
        </mesh>
      ) : component.primitive === 'joinery' && joineryParts?.length ? (
        <group {...pointerProps}>
          <JoineryFromParts component={component} parts={joineryParts} gap={gap} color={color} opacity={opacity} planes={planes} />
        </group>
      ) : component.primitive === 'joinery' ? (
        <group {...pointerProps}>
          <mesh>
            <boxGeometry args={size} />
            <meshStandardMaterial color={color} roughness={0.48} metalness={0.30} transparent opacity={opacity} clippingPlanes={planes} />
            <Edges threshold={16} color="#111315" />
          </mesh>
          {component.opening && component.opening.kind !== 'door-full' && (
            <mesh position={[0, 0, size[2] / 2 + 0.002]}>
              <boxGeometry args={[Math.max(0.05, size[0] - 0.11), Math.max(0.05, size[1] - 0.11), 0.008]} />
              <meshStandardMaterial color="#88a6b4" roughness={0.18} metalness={0.08} transparent opacity={Math.max(0.18, opacity * 0.52)} clippingPlanes={planes} />
            </mesh>
          )}
        </group>
      ) : component.category === 'wall-panels' || component.category === 'roof-panels' || component.category === 'floor-panels' ? (
        <group {...pointerProps}>
          <PanelLayers component={component} color={color} opacity={opacity} planes={planes} sectionLayers={sectionLayers} />
        </group>
      ) : (
        <mesh castShadow receiveShadow {...pointerProps}>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={color}
            roughness={component.category === 'decor' ? 0.66 : 0.58}
            metalness={component.category === 'floor-frame' || component.category === 'corner-posts' || component.category === 'roof-beams' ? 0.34 : 0.12}
            transparent={opacity < 0.99}
            opacity={opacity}
            clippingPlanes={planes}
            clipShadows
          />
          <Edges threshold={18} color="#111315" />
        </mesh>
      )}
    </group>
  )
})

function FastenerInstances({
  components,
  exploded,
  assemblyStage,
  visible,
  selectedId,
  hoveredId,
  isolatedId,
  planes,
  onSelect,
  onHover,
}: {
  components: ModelComponent[]
  exploded: number
  assemblyStage: number
  visible: boolean
  selectedId?: string
  hoveredId?: string
  isolatedId?: string
  planes: Plane[]
  onSelect: (id?: string) => void
  onHover: (id?: string) => void
}) {
  const meshRef = useRef<Mesh>(null)
  const instanceRef = useRef<InstancedMesh>(null)
  const washerRef = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const up = useMemo(() => new Vector3(0, 1, 0), [])
  const matrix = useMemo(() => new Matrix4(), [])
  const q = useMemo(() => new Quaternion(), [])

  useFrame(() => {
    const mesh = instanceRef.current
    const washers = washerRef.current
    if (!mesh || !washers) return
    const active = visible
    mesh.visible = active
    washers.visible = active
    const scale = explodeScale('fasteners') * exploded

    components.forEach((c, i) => {
      const shown = active && c.assemblyStage <= assemblyStage
      const direction = normalizedExplodeDirection(c.explodeDirection)
      const pos = new Vector3(
        c.position[0] + direction[0] * scale,
        c.position[1] + direction[1] * scale,
        c.position[2] + direction[2] * scale,
      )
      const dir = new Vector3(direction[0], direction[1], direction[2]).normalize()
      if (dir.lengthSq() < 0.01) dir.set(0, 1, 0)
      q.setFromUnitVectors(up, dir)
      dummy.position.copy(pos)
      dummy.quaternion.copy(q)
      const ghost = isolatedId && c.id !== isolatedId
      const highlight = selectedId === c.id || hoveredId === c.id
      const s = shown ? (highlight ? 1.8 : ghost ? 0.35 : 1) : 0.0001
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      washers.setMatrixAt(i, dummy.matrix)
      const col = highlight ? new Color('#ff3b30') : new Color(ghost ? '#777777' : CATEGORY_COLORS.fasteners)
      mesh.setColorAt(i, col)
      washers.setColorAt(i, col)
    })
    mesh.instanceMatrix.needsUpdate = true
    washers.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    if (washers.instanceColor) washers.instanceColor.needsUpdate = true
    matrix.identity()
  })

  return (
    <group>
      <instancedMesh
        ref={instanceRef}
        args={[undefined, undefined, components.length]}
        onClick={(e) => {
          e.stopPropagation()
          if (e.instanceId != null) onSelect(components[e.instanceId]?.id)
        }}
        onPointerMove={(e) => {
          e.stopPropagation()
          if (e.instanceId != null) onHover(components[e.instanceId]?.id)
        }}
        onPointerOut={() => onHover(undefined)}
      >
        <cylinderGeometry args={[0.006, 0.006, 0.085, 8]} />
        <meshStandardMaterial vertexColors color="#b0bec5" metalness={0.56} roughness={0.38} clippingPlanes={planes} />
      </instancedMesh>
      <instancedMesh ref={washerRef} args={[undefined, undefined, components.length]}>
        <cylinderGeometry args={[0.015, 0.015, 0.004, 12]} />
        <meshStandardMaterial vertexColors color="#b0bec5" metalness={0.46} roughness={0.40} clippingPlanes={planes} />
      </instancedMesh>
      <mesh ref={meshRef} visible={false} />
    </group>
  )
}

function DimensionLine({
  from,
  to,
  label,
}: {
  from: Vec3
  to: Vec3
  label: string
}) {
  const mid: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
  const dir = new Vector3(to[0] - from[0], to[1] - from[1], to[2] - from[2]).normalize()
  const q1 = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir)
  const q2 = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.clone().multiplyScalar(-1))
  const layer = useLabelLayer()
  return (
    <group>
      <Line points={[from, to]} color="#202326" lineWidth={1.6} />
      <mesh position={from} quaternion={q1}>
        <coneGeometry args={[0.035, 0.12, 10]} />
        <meshBasicMaterial color="#202326" />
      </mesh>
      <mesh position={to} quaternion={q2}>
        <coneGeometry args={[0.035, 0.12, 10]} />
        <meshBasicMaterial color="#202326" />
      </mesh>
      <Html portal={layer} position={mid} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span className="dimension-label">{label}</span>
      </Html>
    </group>
  )
}

function OverallDimensions({ config }: { config: PavilionConfig }) {
  // wysokość zewnętrzna z bryły (System 1: kątownik + podłoga + ściana + dach + żebro + górna rama) — jak w panelu Wymiary
  const env = envelope(config)
  const h = Math.max(env.outerFront, env.outerBack)
  const x = config.length / 2 + 0.45
  const z = config.width / 2 + 0.42
  return (
    <group>
      <DimensionLine from={[-config.length / 2, -0.12, z]} to={[config.length / 2, -0.12, z]} label={Math.round(config.length * 1000) + ' mm'} />
      <DimensionLine from={[x, -0.12, -config.width / 2]} to={[x, -0.12, config.width / 2]} label={Math.round(config.width * 1000) + ' mm'} />
      <DimensionLine from={[-config.length / 2 - 0.35, 0, config.width / 2]} to={[-config.length / 2 - 0.35, h, config.width / 2]} label={Math.round(h * 1000) + ' mm'} />
    </group>
  )
}

function Balloons({
  components,
  exploded,
  onSelect,
}: {
  components: ModelComponent[]
  exploded: number
  onSelect: (id?: string) => void
}) {
  const layer = useLabelLayer()
  const candidates = components
    .filter((c) => c.category !== 'fasteners' && c.category !== 'seals')
    .filter((_, i) => i % 2 === 0)
    .slice(0, 70)

  return (
    <>
      {candidates.map((c) => {
        const scale = explodeScale(c.category) * exploded
        const direction = normalizedExplodeDirection(c.explodeDirection)
        const p: Vec3 = [
          c.position[0] + direction[0] * scale,
          c.position[1] + direction[1] * scale + 0.15,
          c.position[2] + direction[2] * scale,
        ]
        const label: Vec3 = [
          p[0] + direction[0] * 0.35,
          p[1] + 0.20,
          p[2] + direction[2] * 0.35,
        ]
        return (
          <group key={'balloon-' + c.id}>
            <Line points={[p, label]} color="#30363a" lineWidth={1} />
            <Html portal={layer} position={label} center distanceFactor={11} style={{ pointerEvents: 'auto' }}>
              <button className="tech-balloon" onClick={(e) => { e.stopPropagation(); onSelect(c.id) }}>{c.positionNo}</button>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function TechnicalScene(props: TechnicalProps) {
  const {
    config,
    model,
    exploded,
    assemblyStage,
    categoryVisibility,
    selectedId,
    hoveredId,
    isolatedId,
    showDimensions,
    showBalloons,
    clipAxis,
    clipOffset,
    onSelect,
    onHover,
  } = props
  const planes = useMemo(() => clippingPlanes(clipAxis, clipOffset), [clipAxis, clipOffset])
  const sectionLayers = clipAxis !== 'none'
  const normalComponents = useMemo(() => model.components.filter((c) => c.category !== 'fasteners'), [model])
  const fasteners = useMemo(() => model.components.filter((c) => c.category === 'fasteners'), [model])
  const joinery = useMemo(() => joineryPartsByOpening(config), [config])
  const gap = geometryOf(config).foundationGap ?? m(PHYS.base.groundGap)

  return (
    <>
      <SoftShadows size={18} samples={8} focus={0.6} />
      <color attach="background" args={['#f3f5f6']} />
      <ambientLight intensity={0.82} />
      <directionalLight position={[7, 10, 6]} intensity={1.35} castShadow />
      <directionalLight position={[-6, 4, -4]} intensity={0.36} />
      <Grid
        args={[40, 40]}
        cellSize={0.25}
        cellThickness={0.4}
        cellColor="#c9ced2"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#aeb5ba"
        fadeDistance={30}
        position={[0, -0.02, 0]}
      />

      {normalComponents.map((component) => (
        <TechnicalItem
          key={component.id}
          component={component}
          joineryParts={component.opening ? joinery.get(component.opening.id) : undefined}
          gap={gap}
          exploded={exploded}
          assemblyStage={assemblyStage}
          visible={categoryVisibility[component.category]}
          selectedId={selectedId}
          hoveredId={hoveredId}
          isolatedId={isolatedId}
          planes={planes}
          sectionLayers={sectionLayers}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}

      <FastenerInstances
        components={fasteners}
        exploded={exploded}
        assemblyStage={assemblyStage}
        visible={categoryVisibility.fasteners}
        selectedId={selectedId}
        hoveredId={hoveredId}
        isolatedId={isolatedId}
        planes={planes}
        onSelect={onSelect}
        onHover={onHover}
      />

      {showDimensions && <OverallDimensions config={config} />}
      {showBalloons && <Balloons components={model.components} exploded={exploded} onSelect={onSelect} />}
    </>
  )
}

function cameraFor(view: TechnicalView, config: PavilionConfig) {
  const d = Math.max(8, config.length * 1.15)
  const h = Math.max(config.frontHeight, config.backHeight) + 1.1
  switch (view) {
    case 'front': return { pos: [0, h * 0.55, d] as Vec3, target: [0, h * 0.42, 0] as Vec3, ortho: true }
    case 'side': return { pos: [d, h * 0.55, 0] as Vec3, target: [0, h * 0.42, 0] as Vec3, ortho: true }
    case 'top': return { pos: [0, d, 0.001] as Vec3, target: [0, 0, 0] as Vec3, ortho: true }
    case 'axon': return { pos: [d * 0.75, d * 0.62, d * 0.75] as Vec3, target: [0, h * 0.35, 0] as Vec3, ortho: true }
    case 'detail-a': return { pos: [config.length / 2 + 1.5, h + 0.7, config.width / 2 + 1.5] as Vec3, target: [config.length / 2, h - 0.35, config.width / 2] as Vec3, ortho: false }
    case 'detail-b': return { pos: [0, 1.4, config.width / 2 + 3.2] as Vec3, target: [0, 1.15, config.width / 2] as Vec3, ortho: false }
    case 'detail-c': return { pos: [-config.length / 2 + 1.0, 0.55, config.width / 2 + 2.0] as Vec3, target: [-config.length / 2 + 1.0, 0.22, config.width / 2] as Vec3, ortho: false }
    case 'detail-d': return { pos: [-config.length / 2 + 1.2, h + 1.4, config.width / 2 + 2.0] as Vec3, target: [-config.length / 2 + 1.2, h - 0.18, config.width / 2] as Vec3, ortho: false }
    default: return { pos: [d * 0.60, h * 0.72, d] as Vec3, target: [0, h * 0.38, 0] as Vec3, ortho: false }
  }
}

function ExportBridge() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  useEffect(() => {
    const root = window as typeof window & { __DAMPOL3D_CAPTURE__?: () => string }
    root.__DAMPOL3D_CAPTURE__ = () => {
      gl.render(scene, camera)
      return gl.domElement.toDataURL('image/png')
    }
    return () => {
      delete root.__DAMPOL3D_CAPTURE__
    }
  }, [gl, scene, camera])
  return null
}

function CameraAim({ target }: { target: Vec3 }) {
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    camera.lookAt(target[0], target[1], target[2])
    camera.updateProjectionMatrix()
  }, [camera, target])
  return null
}

/**
 * Zoom kamery ortograficznej dopasowany do płótna: pawilon mieści się w kadrze przy każdej szerokości panelu
 * i długości (wcześniej stały zoom — 9–10 m przy wąskim widoku wychodziło poza kadr).
 */
function FitOrtho({ config, view }: { config: TechnicalProps['config']; view: TechnicalProps['view'] }) {
  const get = useThree((state) => state.get)
  const size = useThree((state) => state.size)
  useLayoutEffect(() => {
    const ortho = get().camera as unknown as { isOrthographicCamera?: boolean; zoom: number; updateProjectionMatrix: () => void }
    if (!ortho.isOrthographicCamera) return
    const H = Math.max(config.frontHeight, config.backHeight) + 0.5
    // rzut aksonometryczny: szerokość ≈ przekątna rzutu, wysokość ≈ wysokość + skrót głębokości
    const extX = view === 'front' ? config.length + 1 : view === 'side' ? config.width + 1 : Math.hypot(config.length, config.width) + 1
    const extY = view === 'top' ? config.width + 1 : H + (view === 'axon' ? (config.length + config.width) * 0.3 : 0.6)
    ortho.zoom = Math.max(12, Math.min(140, Math.min(size.width / (extX * 1.08), size.height / (extY * 1.12))))
    ortho.updateProjectionMatrix()
  }, [get, size.width, size.height, config.length, config.width, config.frontHeight, config.backHeight, view])
  return null
}

export default function TechnicalPavilion3D(props: TechnicalProps) {
  const labelLayer = useRef<HTMLDivElement>(null)
  const camera = cameraFor(props.view, props.config)
  const zoom = Math.max(54, 80 - props.config.length * 2.4)

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <LabelLayerContext.Provider value={labelLayer as RefObject<HTMLDivElement>}>
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl, camera: activeCamera, scene }) => {
        gl.localClippingEnabled = true
        gl.setClearColor('#f3f5f6', 1)
        scene.background = new Color('#f3f5f6')
        activeCamera.lookAt(camera.target[0], camera.target[1], camera.target[2])
        activeCamera.updateProjectionMatrix()
      }}
      onPointerMissed={() => props.onSelect(undefined)}
    >
      {camera.ortho ? (
        <OrthographicCamera makeDefault position={camera.pos} zoom={zoom} near={0.01} far={200} />
      ) : (
        <PerspectiveCamera makeDefault position={camera.pos} fov={32} near={0.01} far={200} />
      )}
      <CameraAim target={camera.target} />
      <FitOrtho config={props.config} view={props.view} />
      <ExportBridge />
      <TechnicalScene {...props} />
      <OrbitControls makeDefault target={camera.target} enableDamping dampingFactor={0.08} />
    </Canvas>
    </LabelLayerContext.Provider>
    <div ref={labelLayer} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} />
    </div>
  )
}
