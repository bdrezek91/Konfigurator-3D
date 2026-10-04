import { buildComponentModel } from '../../components'
import { type DecorPlacement, type OpeningPlacement, type PavilionConfig, type ProjectGeometry, type WallSide } from '../../types'
import { envelope, openingSill, overlapsOpening, wallTopAt, wallTopHeights } from '../geometry'
import { Path, Shape, type Texture } from 'three'
import { Box, RoundedPiece } from '../materials/primitives'
import { renderMetalColor, woodTexture } from '../materials/textures'
import { type ReactNode, useMemo } from 'react'
import { m, PHYS, RENDER } from '../../physical/spec'

/** Przyciemnienie koloru (mnożnik jasności) — parametr renderingu, nie fizyczny kolor. */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v * k).toString(16).padStart(2, '0')
  return '#' + ch((n >> 16) & 255) + ch((n >> 8) & 255) + ch(n & 255)
}

export function PanelProfileLocal({
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
  const isLight = config.exteriorColor === '#f1ece1' || config.exteriorColor === '#a5a5a3'
  const jointColor = isLight ? '#d7d5ce' : '#202427'

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

  // Przetłoczenie okładziny (mikrofala, linie, rowki) jest w normal mapie materiału ściany
  // generowanej z fizycznego profilu [mm] — patrz materials/profiles.ts.
  return <>{out}</>
}

export function FacadeCladdingFromModel({ config }: { config: PavilionConfig }) {
  const model = useMemo(() => buildComponentModel(config), [config])
  const pieces = model.components.filter((item) =>
    item.category === 'decor' &&
    (item.id.startsWith('facade-cassette-') || item.id.startsWith('corner-cassette-') || item.id.startsWith('facade-ribbed-'))
  )

  return (
    <>
      {pieces.map((item) => {
        const h = item.dimensions.lengthMm / 1000
        const w = item.dimensions.widthMm / 1000
        const depth = item.dimensions.thicknessMm / 1000
        const color = renderMetalColor(item.color)

        if (item.id.startsWith('corner-cassette-')) {
          const left = item.id.includes('-fl-') || item.id.includes('-bl-')
          const front = item.id.includes('-fl-') || item.id.includes('-fr-')
          const sx = left ? 1 : -1
          const sz = front ? -1 : 1
          return (
            <group key={item.id} position={item.position}>
              <RoundedPiece
                size={[0.15, h, depth]}
                position={[sx * 0.075, 0, front ? 0.010 : -0.010]}
                color={color}
                metalness={0.38}
                roughness={0.48}
                radius={0.003}
              />
              <RoundedPiece
                size={[depth, h, 0.15]}
                position={[left ? -0.010 : 0.010, 0, sz * 0.075]}
                color={color}
                metalness={0.38}
                roughness={0.48}
                radius={0.003}
              />
            </group>
          )
        }

        if (item.id.startsWith('facade-ribbed-')) {
          const ribs: ReactNode[] = []
          for (let x = -w / 2 + 0.06; x < w / 2; x += 0.12) {
            ribs.push(
              <Box key={item.id + '-rib-' + x.toFixed(3)} size={[0.018, h, 0.055]} position={[x, 0, 0.020]} color={color} metalness={0.36} roughness={0.50} />,
            )
          }
          return (
            <group key={item.id} position={item.position} rotation={item.rotation}>
              <Box size={[w, h, 0.018]} position={[0, 0, 0]} color={color} metalness={0.34} roughness={0.52} />
              {ribs}
            </group>
          )
        }

        return (
          <group key={item.id} position={item.position} rotation={item.rotation}>
            {/* kaseton: blacha stalowa 0,5 mm, RAL 7016 mat (produkcja Dampol) */}
            <RoundedPiece
              size={[w, h, depth]}
              position={[0, 0, 0]}
              color={color}
              metalness={RENDER.flashingMattMetalness.value}
              roughness={RENDER.flashingMattRoughness.value}
              radius={0.002}
            />
          </group>
        )
      })}
    </>
  )
}

export function FoundationSupports({ config, geometry }: { config: PavilionConfig; geometry: ProjectGeometry }) {
  // prześwit pod ramą wg zdjęć realizacji (03/11 ≈ 30 mm, film WA0019 50–100 mm) — podkłady mają wysokość prześwitu
  const gap = geometry.foundationGap ?? m(PHYS.base.groundGap)
  if (gap < 0.015) return null
  const xs = [-config.length / 2 + 0.45, 0, config.length / 2 - 0.45]
  return (
    <>
      {[-config.width / 2 + 0.28, config.width / 2 - 0.28].flatMap((z) =>
        xs.map((x, i) => (
          <RoundedPiece
            key={'foundation-' + z + '-' + i}
            size={[0.40, gap, 0.20]}
            position={[x, gap / 2, z]}
            color="#888983"
            roughness={0.92}
            radius={Math.min(0.012, gap / 4)}
          />
        )),
      )}
    </>
  )
}

/**
 * Płyta podkładowa okładziny (pod lamelami) z wycięciami na otwory —
 * stolarka osadzona w otworze musi być widoczna przez okładzinę, tak jak na budowie.
 */
function BaseBoard({
  id, center, yCenter, width, height, z, depth, color, openings, floorOffset, map,
}: {
  id: string; center: number; yCenter: number; width: number; height: number; z: number; depth: number; color: string
  openings: OpeningPlacement[]; floorOffset: number; map?: Texture
}) {
  const shape = useMemo(() => {
    const x0 = center - width / 2
    const x1 = center + width / 2
    const y0 = yCenter - height / 2
    const y1 = yCenter + height / 2
    const sh = new Shape()
    sh.moveTo(x0, y0)
    sh.lineTo(x1, y0)
    sh.lineTo(x1, y1)
    sh.lineTo(x0, y1)
    sh.closePath()
    const m = 0.003
    for (const o of openings) {
      const oy0 = floorOffset + openingSill(o)
      const hx0 = Math.max(x0 + m, o.center - o.width / 2)
      const hx1 = Math.min(x1 - m, o.center + o.width / 2)
      const hy0 = Math.max(y0 + m, oy0)
      const hy1 = Math.min(y1 - m, oy0 + o.height)
      if (hx1 - hx0 < 0.02 || hy1 - hy0 < 0.02) continue
      const hole = new Path()
      hole.moveTo(hx0, hy0)
      hole.lineTo(hx0, hy1)
      hole.lineTo(hx1, hy1)
      hole.lineTo(hx1, hy0)
      hole.closePath()
      sh.holes.push(hole)
    }
    return sh
  }, [center, yCenter, width, height, openings, floorOffset])
  return (
    <mesh key={id} position={[0, 0, z - depth / 2]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth, bevelEnabled: false, steps: 1 }]} />
      <meshStandardMaterial color={color} map={map} roughness={0.62} metalness={0.08} />
    </mesh>
  )
}

export function DecorLocal({
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
    // pole okładziny jest już uzgodnione z obróbkami i attyką (geometryOf) — bez dawnego ograniczenia do 2,82 m,
    // które przy wyższym pawilonie przesuwało okładzinę w dół, poniżej ściany
    const effectiveHeight = segment.height
    const effectiveY = segment.yCenter
    const gallery03Lamella = segment.id === 'gallery03-lamella'
    // lamele (produkcja Dampol): blacha 0,4 mm, profil „kapelusz” _|‾|_ (czoło 30 mm od ściany) na przemian z U (dno na ścianie)
    const isLamella = segment.kind.startsWith('lamella-')
    const z = isLamella ? wallDepth / 2 : wallDepth / 2 + 0.070
    const x0 = segment.center - segment.width / 2
    const y0 = effectiveY - effectiveHeight / 2

    if (segment.kind.startsWith('lamella-')) {
      const color =
        segment.kind === 'lamella-black' ? '#1d2022' :
        segment.kind === 'lamella-graphite' ? '#3d4448' :
        segment.kind === 'lamella-palisander' ? '#5f3f2b' : '#a57245'
      // rozstaw i czoło lameli ze zdjęć 03 (28 lameli co 82 mm) i 11 (aluminiowe, 80,6 mm)
      const step = m(PHYS.lamella.pitch)
      const slatWidth = m(PHYS.lamella.face)
      const slatDepth = m(PHYS.lamella.depth)
      const diagonal = segment.kind === 'lamella-diagonal-winchester'
      const woodPalette =
        segment.kind === 'lamella-palisander'
          ? ['#5a3a28', '#694630', '#4f3324', '#74503a']
          : ['#9a693f', '#b27a49', '#8f603a', '#a97044']
      const slatMap =
        segment.kind === 'lamella-palisander' ? woodTexture('palisander') :
        segment.kind === 'lamella-winchester' || diagonal ? woodTexture('winchester') : undefined
      let slatIndex = 0

      if (!segment.shape || segment.shape === 'rect') {
        out.push(
          <BaseBoard
            key={segment.id + '-base'}
            id={segment.id + '-base'}
            center={segment.center}
            yCenter={effectiveY}
            width={segment.width}
            height={effectiveHeight}
            z={z + 0.001}
            depth={0.002}
            color={shade(gallery03Lamella ? '#826f66' : (slatMap ? '#ffffff' : color), RENDER.lamellaGrooveShade.value)}
            map={gallery03Lamella ? undefined : slatMap}
            openings={openings}
            floorOffset={floorOffset}
          />,
        )
      }

      if (diagonal) {
        // lamele ukośne: oś lameli x(y) = xb + (y − y0)·k, przycięta do pola okładziny i wokół otworów — nic nie wystaje poza pole
        const theta = 0.35
        const k = Math.tan(theta)
        const x1 = x0 + segment.width
        const y1 = y0 + effectiveHeight
        const half = slatWidth / 2 / Math.cos(theta) // pół szerokości lameli w poziomie
        const endTrim = (slatWidth / 2) * Math.tan(theta) // końce cięte prostopadle — cofnięte, żeby narożnik nie wystawał
        const pitchX = step / Math.cos(theta)
        let idx = 0
        for (let xb = x0 - effectiveHeight * k; xb < x1; xb += pitchX) {
          // zakres y, w którym cała szerokość lameli mieści się w [x0, x1]
          let ya = Math.max(y0, y0 + (x0 + half - xb) / k)
          let yb = Math.min(y1, y0 + (x1 - half - xb) / k)
          ya += endTrim
          yb -= endTrim
          if (yb - ya < 0.04) continue
          // otwory: wytnij przedziały y, w których lamela przechodzi przez otwór (z marginesem szerokości)
          let spans: Array<[number, number]> = [[ya, yb]]
          for (const o of openings) {
            const ox0 = o.center - o.width / 2 - half
            const ox1 = o.center + o.width / 2 + half
            const oy0 = floorOffset + openingSill(o) - endTrim
            const oy1 = floorOffset + openingSill(o) + o.height + endTrim
            const ca = Math.max(oy0, y0 + (ox0 - xb) / k)
            const cb = Math.min(oy1, y0 + (ox1 - xb) / k)
            if (cb <= ca) continue
            spans = spans.flatMap(([a, b]) => {
              const out2: Array<[number, number]> = []
              if (ca - a > 0.04) out2.push([a, Math.min(b, ca)])
              if (b - cb > 0.04) out2.push([Math.max(a, cb), b])
              return cb <= a || ca >= b ? [[a, b] as [number, number]] : out2
            })
          }
          for (const [sa, sb] of spans) {
            const len = (sb - sa) / Math.cos(theta)
            const ym = (sa + sb) / 2
            const xm = xb + (ym - y0) * k
            out.push(
              <RoundedPiece
                key={segment.id + '-d-' + idx + '-' + sa.toFixed(3)}
                size={[slatWidth, len, slatDepth]}
                position={[xm, ym, z + slatDepth / 2]}
                rotation={[0, 0, -theta]}
                color={slatMap ? '#ffffff' : woodPalette[idx % woodPalette.length]}
                map={slatMap}
                roughness={0.68}
                radius={0.005}
              />,
            )
          }
          idx++
        }
        return
      }

      const slatCount = Math.floor((segment.width - slatWidth / 2) / step) + 1
      for (let i = 0; i < slatCount; i++) {
        const x = x0 + slatWidth / 2 + i * step
        const t = Math.max(0, Math.min(1, (x - x0) / Math.max(segment.width, 0.001)))
        const fraction =
          segment.shape === 'wedge-left' ? Math.max(0.04, 1 - t) :
          segment.shape === 'wedge-right' ? Math.max(0.04, t) : 1
        const localH = effectiveHeight * fraction
        // lamela docinana wokół otworów (pionowe odcinki poza otworem), a nie pomijana w całości
        const spans: Array<[number, number]> = []
        if (diagonal) {
          if (!overlapsOpening(x, y0 + localH / 2, slatWidth, localH, openings, floorOffset)) spans.push([y0, y0 + localH])
        } else {
          const cuts = openings
            .filter((o) => Math.abs(x - o.center) < (slatWidth + o.width) / 2)
            .map((o) => [floorOffset + openingSill(o), floorOffset + openingSill(o) + o.height] as [number, number])
            .sort((p, q) => p[0] - q[0])
          let cursor = y0
          for (const [c0, c1] of cuts) {
            if (c0 - cursor > 0.02) spans.push([cursor, Math.min(c0, y0 + localH)])
            cursor = Math.max(cursor, c1)
          }
          if (y0 + localH - cursor > 0.02) spans.push([cursor, y0 + localH])
        }
        const slatColor =
          segment.kind === 'lamella-black' || segment.kind === 'lamella-graphite'
            ? color
            : woodPalette[slatIndex % woodPalette.length]
        for (const [sa, sb] of spans) {
          out.push(
            <RoundedPiece
              key={segment.id + '-l-' + x.toFixed(3) + '-' + sa.toFixed(2)}
              size={[slatWidth, sb - sa, slatDepth]}
              position={[x, (sa + sb) / 2, z + slatDepth / 2]}
              rotation={[0, 0, diagonal ? -0.35 : 0]}
              color={gallery03Lamella ? '#826f66' : (slatMap ? '#ffffff' : slatColor)}
              map={gallery03Lamella ? undefined : slatMap}
              roughness={0.68}
              radius={0.005}
            />,
          )
        }
        if (spans.length) slatIndex++
      }
      return
    }

    if (segment.kind === 'snake-winchester') {
      out.push(
        <BaseBoard
          key={segment.id + '-base'}
          id={segment.id + '-base'}
          center={segment.center}
          yCenter={effectiveY}
          width={segment.width}
          height={effectiveHeight}
          z={z - 0.015}
          depth={0.040}
          color="#17191b"
          openings={openings}
          floorOffset={floorOffset}
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

    if (segment.kind === 'board-natural' || segment.kind === 'board-horizontal-winchester') {
      // deska drewnopodobna wg nagrania WA0016
      const boardH = m(PHYS.board.height)
      for (let y = y0 + boardH / 2; y < y0 + effectiveHeight; y += boardH + m(PHYS.board.gap)) {
        if (!overlapsOpening(segment.center, y, segment.width, boardH, openings, floorOffset)) {
          out.push(
            <RoundedPiece
              key={segment.id + '-b-' + y.toFixed(2)}
              size={[segment.width, boardH, 0.024]}
              position={[segment.center, y, z]}
              color="#ffffff"
              map={woodTexture(segment.kind === 'board-horizontal-winchester' ? 'winchester' : 'natural')}
              roughness={0.72}
              radius={0.006}
            />,
          )
        }
      }
      return
    }

    if (segment.kind === 'ornament-panel') {
      const border = 0.032
      const pattern: ReactNode[] = []
      pattern.push(
        <Box key={segment.id + '-top'} size={[segment.width, border, 0.055]} position={[segment.center, y0 + effectiveHeight - border / 2, z]} color="#22272a" metalness={0.34} roughness={0.46} />,
        <Box key={segment.id + '-bottom'} size={[segment.width, border, 0.055]} position={[segment.center, y0 + border / 2, z]} color="#22272a" metalness={0.34} roughness={0.46} />,
        <Box key={segment.id + '-left'} size={[border, effectiveHeight, 0.055]} position={[x0 + border / 2, effectiveY, z]} color="#22272a" metalness={0.34} roughness={0.46} />,
        <Box key={segment.id + '-right'} size={[border, effectiveHeight, 0.055]} position={[x0 + segment.width - border / 2, effectiveY, z]} color="#22272a" metalness={0.34} roughness={0.46} />,
      )
      // motyw: dwie listwy pod kątem ±0,62 rad; zasięg pary od x − 0,15 do x + 0,27, w pionie ±0,19 — cały motyw w ramce
      for (let x = x0 + border + 0.15; x + 0.27 < x0 + segment.width - border; x += 0.34) {
        for (let y = y0 + border + 0.19; y + 0.19 < y0 + effectiveHeight - border; y += 0.42) {
          if (overlapsOpening(x + 0.06, y, 0.46, 0.40, openings, floorOffset)) continue
          pattern.push(
            <RoundedPiece
              key={segment.id + '-orn-a-' + x.toFixed(2) + '-' + y.toFixed(2)}
              size={[0.034, 0.42, 0.052]}
              position={[x, y, z + 0.008]}
              rotation={[0, 0, 0.62]}
              color="#22272a"
              metalness={0.30}
              roughness={0.48}
              radius={0.006}
            />,
            <RoundedPiece
              key={segment.id + '-orn-b-' + x.toFixed(2) + '-' + y.toFixed(2)}
              size={[0.034, 0.42, 0.052]}
              position={[x + 0.12, y, z + 0.008]}
              rotation={[0, 0, -0.62]}
              color="#22272a"
              metalness={0.30}
              roughness={0.48}
              radius={0.006}
            />,
          )
        }
      }
      out.push(<group key={segment.id + '-ornament'}>{pattern}</group>)
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
      // kasetony (produkcja Dampol): fuga 20 mm, przykręcane przez obrzeże do płyty — lico = głębokość tacy
      const gap = m(PHYS.cassette.gap)
      const tray = m(PHYS.cassette.thickness)
      const zc = wallDepth / 2 + tray / 2
      const color =
        segment.kind === 'cassette-black' ? '#232629' :
        segment.kind === 'cassette-white' ? '#e7e6df' :
        segment.kind === 'cassette-winchester' ? '#ffffff' :
        segment.kind === 'silver-rect' ? '#aeb3b5' : '#3f474c'
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
                size={[Math.max(0.02, cw - gap), Math.max(0.02, ch - gap), tray]}
                position={[x, y, zc]}
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

export function DampolFrameLocal({
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
  // Widoczna rama wg nagrań z produkcji (WA0016/WA0017/WA0019): korona i rygiel dolny — PHYS.base.
  // Szerokość słupa narożnego zależy od konstrukcji: kątownik 50 — wąski, profil 100×100/statyka — szerszy.
  const topBand = Math.max(m(PHYS.base.crownBand), roofT + 0.115)
  const bottomBand = Math.max(m(PHYS.base.bottomRail), floorT + 0.04)
  const sidePost =
    config.construction === 'angle50' ? 0.07 :
    config.construction === 'truss' ? 0.12 : 0.105
  const z = wallDepth / 2 + 0.018
  const delta = topRight - topLeft
  const angle = Math.atan2(delta, span)
  const railLength = Math.hypot(span, delta)
  const railY = (topLeft + topRight) / 2 - topBand / 2
  // obróbki 7016M — faktura mat (produkcja Dampol)
  const metalness = RENDER.flashingMattMetalness.value
  const roughness = RENDER.flashingMattRoughness.value

  return (
    <group>
      <Box
        size={[railLength, topBand, 0.052]}
        position={[0, railY, z]}
        rotation={[0, 0, angle]}
        color={renderMetalColor(config.flashingColor)}
        metalness={metalness}
        roughness={roughness}
        envMapIntensity={1.1}
      />
      <Box
        size={[railLength + 0.035, 0.024, 0.105]}
        position={[0, railY - topBand / 2 + 0.012, z + 0.012]}
        rotation={[0, 0, angle]}
        color={renderMetalColor(config.flashingColor)}
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
        color={renderMetalColor(config.flashingColor)}
        metalness={metalness}
        roughness={roughness}
      />
      <Box
        size={[0.030, topLeft, 0.112]}
        position={[-span / 2 + 0.015, topLeft / 2, z - 0.025]}
        color={renderMetalColor(config.flashingColor)}
        metalness={metalness}
        roughness={roughness}
      />
      <Box
        size={[sidePost, topRight, 0.052]}
        position={[span / 2 - sidePost / 2, topRight / 2, z]}
        color={renderMetalColor(config.flashingColor)}
        metalness={metalness}
        roughness={roughness}
      />
      <Box
        size={[0.030, topRight, 0.112]}
        position={[span / 2 - 0.015, topRight / 2, z - 0.025]}
        color={renderMetalColor(config.flashingColor)}
        metalness={metalness}
        roughness={roughness}
      />
    </group>
  )
}
