import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox, SoftShadows } from '@react-three/drei'
import { ACESFilmicToneMapping, CanvasTexture, Path, RepeatWrapping, Shape, SRGBColorSpace, type Texture } from 'three'
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
  map,
  normalMap,
  envMapIntensity = 1,
}: {
  size: [number, number, number]
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  metalness?: number
  roughness?: number
  opacity?: number
  map?: Texture
  normalMap?: Texture
  envMapIntensity?: number
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
        map={map}
        normalMap={normalMap}
        normalScale={[0.22, 0.22]}
        envMapIntensity={envMapIntensity}
      />
    </mesh>
  )
}

const textureCache = new Map<string, CanvasTexture>()

function panelNormalTexture(profile: PavilionConfig['wallProfile']) {
  if (profile === 'smooth') return undefined
  const key = 'panel-normal-' + profile
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 256, 256)
  const spacing =
    profile === 'microrib' ? 9 :
    profile === 'microline' ? 14 :
    profile === 'carbon' ? 12 :
    profile === 'microwave' ? 22 : 36
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
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(5, 1)
  textureCache.set(key, texture)
  return texture
}

function woodTexture(kind: 'winchester' | 'palisander' | 'natural') {
  const key = 'wood-' + kind
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  const palette =
    kind === 'palisander'
      ? ['#473126', '#5b3c2b', '#38261f', '#6a4932']
      : kind === 'natural'
        ? ['#8b684b', '#a77c55', '#79593f', '#b1845a']
        : ['#8f633f', '#aa7547', '#775035', '#bd8751']
  const grad = ctx.createLinearGradient(0, 0, 128, 0)
  palette.forEach((c, i) => grad.addColorStop(i / (palette.length - 1), c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 512)
  for (let y = 0; y < 512; y += 14) {
    ctx.strokeStyle = y % 28 === 0 ? 'rgba(45,25,14,.24)' : 'rgba(255,225,180,.13)'
    ctx.lineWidth = 1 + (y % 3) * 0.35
    ctx.beginPath()
    ctx.moveTo(0, y + Math.sin(y * 0.12) * 3)
    ctx.bezierCurveTo(32, y - 4, 86, y + 6, 128, y + Math.sin(y * 0.08) * 4)
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1, 1.5)
  textureCache.set(key, texture)
  return texture
}

function RoundedPiece({
  size,
  position,
  color,
  map,
  metalness = 0.10,
  roughness = 0.55,
  radius = 0.006,
}: {
  size: [number, number, number]
  position: [number, number, number]
  color: string
  map?: Texture
  metalness?: number
  roughness?: number
  radius?: number
}) {
  return (
    <RoundedBox args={size} position={position} radius={Math.min(radius, size[0] / 5, size[1] / 5)} smoothness={2} castShadow receiveShadow>
      <meshStandardMaterial color={color} map={map} metalness={metalness} roughness={roughness} envMapIntensity={1.15} />
    </RoundedBox>
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
  const frame = opening.frameColor ?? '#17191b'
  const isDoor = opening.kind.startsWith('door-')
  const rail = Math.min(0.068, Math.max(0.052, opening.width * 0.055))
  const innerW = Math.max(0.12, opening.width - rail * 2)
  const innerH = Math.max(0.12, opening.height - rail * 2)
  const z = depth / 2 + 0.018

  if (opening.kind === 'door-full') {
    return (
      <group position={[opening.center, y, z]}>
        <RoundedPiece size={[opening.width, opening.height, 0.058]} position={[0, 0, 0]} color={frame} metalness={0.34} roughness={0.46} radius={0.004} />
        <Box size={[0.018, 0.54, 0.018]} position={[opening.width * 0.30, 0, 0.040]} color="#bfc3c4" metalness={0.82} roughness={0.18} />
        <Box size={[opening.width, 0.035, 0.075]} position={[0, -opening.height / 2 + 0.018, -0.005]} color="#111315" metalness={0.42} roughness={0.40} />
      </group>
    )
  }

  return (
    <group position={[opening.center, y, z]}>
      <mesh position={[0, 0, -0.002]} castShadow receiveShadow>
        <boxGeometry args={[innerW, innerH, 0.016]} />
        <meshPhysicalMaterial
          color="#48606b"
          transparent
          opacity={0.48}
          roughness={0.10}
          metalness={0.02}
          transmission={0.36}
          ior={1.46}
          thickness={0.014}
          clearcoat={0.42}
          clearcoatRoughness={0.08}
          envMapIntensity={1.35}
        />
      </mesh>
      <Box size={[rail, opening.height, 0.060]} position={[-opening.width / 2 + rail / 2, 0, 0.020]} color={frame} metalness={0.42} roughness={0.44} />
      <Box size={[rail, opening.height, 0.060]} position={[opening.width / 2 - rail / 2, 0, 0.020]} color={frame} metalness={0.42} roughness={0.44} />
      <Box size={[innerW, rail, 0.060]} position={[0, opening.height / 2 - rail / 2, 0.020]} color={frame} metalness={0.42} roughness={0.44} />
      <Box size={[innerW, rail, 0.060]} position={[0, -opening.height / 2 + rail / 2, 0.020]} color={frame} metalness={0.42} roughness={0.44} />
      {opening.kind === 'door-double' && <Box size={[0.052, innerH, 0.064]} position={[0, 0, 0.024]} color={frame} metalness={0.42} roughness={0.44} />}
      {opening.kind === 'alu-window' && <Box size={[0.046, innerH, 0.064]} position={[opening.width * 0.18, 0, 0.024]} color={frame} metalness={0.42} roughness={0.44} />}
      {opening.kind === 'pvc-window' && (
        <>
          <Box size={[0.042, innerH, 0.064]} position={[0, 0, 0.024]} color={frame} metalness={0.30} roughness={0.48} />
          <Box size={[innerW, 0.042, 0.064]} position={[0, 0, 0.024]} color={frame} metalness={0.30} roughness={0.48} />
        </>
      )}
      {isDoor && (
        <Box size={[0.018, 0.54, 0.018]} position={[opening.width * 0.30, 0, 0.065]} color="#c3c7c8" metalness={0.85} roughness={0.16} />
      )}
      {isDoor && <Box size={[opening.width, 0.035, 0.075]} position={[0, -opening.height / 2 + 0.018, 0.006]} color="#111315" metalness={0.45} roughness={0.38} />}
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
      const slatMap =
        segment.kind === 'lamella-palisander' ? woodTexture('palisander') :
        segment.kind === 'lamella-winchester' ? woodTexture('winchester') : undefined
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
            <RoundedPiece
              key={segment.id + '-l-' + x.toFixed(2)}
              size={[slatWidth, localH, 0.052]}
              position={[x, localY, z + 0.010]}
              color={slatMap ? '#ffffff' : slatColor}
              map={slatMap}
              roughness={0.68}
              radius={0.005}
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
            <RoundedPiece
              key={segment.id + '-s-' + i}
              size={[barW, effectiveHeight, 0.058]}
              position={[x, effectiveY, z + 0.010]}
              color="#ffffff"
              map={woodTexture('winchester')}
              roughness={0.70}
              radius={0.006}
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
            <RoundedPiece
              key={segment.id + '-b-' + y.toFixed(2)}
              size={[segment.width, boardH, 0.060]}
              position={[segment.center, y, z]}
              color="#ffffff"
              map={woodTexture('natural')}
              roughness={0.72}
              radius={0.006}
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
      const gap = 0.009
      const color =
        segment.kind === 'cassette-black' ? '#151719' :
        segment.kind === 'cassette-white' ? '#e7e6df' :
        segment.kind === 'cassette-winchester' ? '#ffffff' :
        segment.kind === 'silver-rect' ? '#aeb3b5' : '#343a3f'
      const metalness =
        segment.kind === 'cassette-winchester' ? 0.02 :
        segment.kind === 'silver-rect' ? 0.42 : 0.32
      const cassetteMap = segment.kind === 'cassette-winchester' ? woodTexture('winchester') : undefined

      for (let x = x0 + cellW / 2; x < x0 + segment.width; x += cellW + gap) {
        for (let y = y0 + cellH / 2; y < y0 + effectiveHeight; y += cellH + gap) {
          const cw = Math.min(cellW, x0 + segment.width - x + cellW / 2)
          const ch = Math.min(cellH, y0 + effectiveHeight - y + cellH / 2)
          if (cw > 0.08 && ch > 0.08 && !overlapsOpening(x, y, cw, ch, openings, floorOffset)) {
            out.push(
              <RoundedPiece
                key={segment.id + '-c-' + x.toFixed(2) + '-' + y.toFixed(2)}
                size={[Math.max(0.02, cw - gap), Math.max(0.02, ch - gap), 0.050]}
                position={[x, y, z]}
                color={color}
                map={cassetteMap}
                metalness={metalness}
                roughness={segment.kind === 'cassette-winchester' ? 0.68 : 0.46}
                radius={0.006}
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
  const topBand = Math.max(0.22, roofT + 0.13)
  const bottomBand = Math.max(0.105, floorT + 0.012)
  const sidePost = side === 'front' ? 0.105 : 0.095
  const z = wallDepth / 2 + 0.018
  const delta = topRight - topLeft
  const angle = Math.atan2(delta, span)
  const railLength = Math.hypot(span, delta)
  const railY = (topLeft + topRight) / 2 - topBand / 2
  const metalness = 0.42
  const roughness = 0.46

  return (
    <group>
      <Box
        size={[railLength, topBand, 0.052]}
        position={[0, railY, z]}
        rotation={[0, 0, angle]}
        color={config.flashingColor}
        metalness={metalness}
        roughness={roughness}
        envMapIntensity={1.1}
      />
      <Box
        size={[railLength + 0.035, 0.024, 0.105]}
        position={[0, railY - topBand / 2 + 0.012, z + 0.012]}
        rotation={[0, 0, angle]}
        color={config.flashingColor}
        metalness={metalness}
        roughness={0.40}
      />
      <Box
        size={[span, bottomBand, 0.052]}
        position={[0, bottomBand / 2, z]}
        color="#15181a"
        metalness={0.38}
        roughness={0.46}
      />
      <Box
        size={[sidePost, topLeft, 0.052]}
        position={[-span / 2 + sidePost / 2, topLeft / 2, z]}
        color={config.flashingColor}
        metalness={metalness}
        roughness={roughness}
      />
      <Box
        size={[0.030, topLeft, 0.112]}
        position={[-span / 2 + 0.015, topLeft / 2, z - 0.025]}
        color={config.flashingColor}
        metalness={metalness}
        roughness={roughness}
      />
      <Box
        size={[sidePost, topRight, 0.052]}
        position={[span / 2 - sidePost / 2, topRight / 2, z]}
        color={config.flashingColor}
        metalness={metalness}
        roughness={roughness}
      />
      <Box
        size={[0.030, topRight, 0.112]}
        position={[span / 2 - 0.015, topRight / 2, z - 0.025]}
        color={config.flashingColor}
        metalness={metalness}
        roughness={roughness}
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
          metalness={0.38}
          roughness={0.50}
          normalMap={panelNormalTexture(config.wallProfile)}
          normalScale={[0.18, 0.18]}
          envMapIntensity={1.05}
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
  const cameraDistance = Math.max(9.0, config.length * 1.28)
  const { outerFront, outerBack } = envelope(config)
  const targetHeight = Math.min(1.34, (outerFront + outerBack) * 0.245)
  const cameraHeight = 1.68
  const cameraPosition: [number, number, number] =
    view === 'front' ? [0, cameraHeight, cameraDistance] :
    view === 'back' ? [0, cameraHeight, -cameraDistance] :
    view === 'left' ? [-cameraDistance, cameraHeight, 0] :
    view === 'right' ? [cameraDistance, cameraHeight, 0] :
    [cameraDistance * 0.52, 1.78, cameraDistance * 0.94]

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: cameraPosition, fov: 32 }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping
        gl.toneMappingExposure = 1.04
        gl.outputColorSpace = SRGBColorSpace
      }}
    >
      <SoftShadows size={24} samples={10} focus={0.55} />
      <color attach="background" args={['#dfe2e2']} />
      <hemisphereLight color="#eef4f7" groundColor="#9a958a" intensity={0.54} />
      <ambientLight intensity={0.34} />
      <directionalLight
        position={[8, 10, 7]}
        intensity={2.35}
        color="#fff7ea"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.00018}
      />
      <directionalLight position={[-8, 5, -3]} intensity={0.26} color="#c9d9ea" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0]} receiveShadow>
        <planeGeometry args={[44, 44]} />
        <meshStandardMaterial color="#d5d2cb" roughness={0.96} metalness={0.02} />
      </mesh>

      <ProjectPavilion config={config} />

      <ContactShadows
        position={[0, 0.004, 0]}
        opacity={0.38}
        scale={26}
        blur={2.6}
        far={10}
      />
      <Environment resolution={128}>
        <Lightformer form="rect" intensity={1.8} color="#eef5ff" position={[0, 7, -8]} scale={[12, 5, 1]} />
        <Lightformer form="rect" intensity={1.15} color="#fff3de" position={[8, 4, 5]} scale={[5, 5, 1]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={0.9} color="#d9e7f2" position={[-8, 3, 2]} scale={[5, 4, 1]} rotation={[0, Math.PI / 2, 0]} />
      </Environment>

      <OrbitControls
        makeDefault
        target={[0, targetHeight, 0]}
        minDistance={Math.max(6.3, config.length * 0.78)}
        maxDistance={Math.max(24, config.length * 2.4)}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.50}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  )
}
