import { useCallback, useEffect, useMemo } from 'react'
import type { Material } from 'three'
import type { PavilionConfig } from '../types'
import { buildRunGeometry, finishForConfig } from './geometry'
import { buildSystem1 } from './system1/build'
import type { Part } from './types'
import { arch } from '../render/architecture'
import { useEnvironment } from '@react-three/drei'
import { useLighting } from '../scene/environment/lighting'
import { useQuality } from '../render/quality'
import { createSystem1Materials, e3GlassParams, gasketMaterial, hardwareMaterial, joineryFrameMaterial, joineryGlass, type GlassMode } from '../render/materials'
import { LayerRenderer } from '../render/LayerRenderer'
import type { PartLook } from '../render/layers'

/** E3: natężenie mapy otoczenia wnętrza (ASSUMPTION) — patrz System1Body; szkło — render/materials.ts. */
const E3_INTERIOR_ENV = 0.2

function PartMesh({ part, material }: { part: Part; material: Material }) {
  const geo = useMemo(() => buildRunGeometry(part.geometry), [part.geometry])
  useEffect(() => () => geo.dispose(), [geo])
  // cienkie blachy płyt (0,6 mm) nie rzucają cienia — cień rzuca rdzeń; inaczej powstaje „trądzik” cienia na licu
  const thinSheet = part.material === 'sheetOuter' || part.material === 'sheetInner'
  return <mesh geometry={geo} material={material} castShadow={!thinSheet} receiveShadow />
}

/**
 * Bryła pawilonu Systemu 1 w głównym konfiguratorze: rama, podłoga, ściany (z otworami), dach, górna rama, obróbki.
 * Stolarka, elewacja (kasetony/lamele) i wnętrze pozostają w dotychczasowych komponentach — ustawione na tych samych licach.
 */
export function System1Body({ config, opacity = 1 }: { config: PavilionConfig; opacity?: number }) {
  const finish = useMemo(() => finishForConfig(config), [config])
  const model = useMemo(() => buildSystem1(config, finish, { decor: false }), [config, finish])
  // stolarka z przekrojów (warstwa JOINERY) należy do modelu i renderuje się z nim; uproszczona rama modelu (warstwa ścian,
  // otwory spoza biblioteki przekrojów albo bez `sectionJoinery`) pomijana — te otwory rysuje OpeningFrame
  const features = arch(config)
  const parts = useMemo(
    () => model.parts.filter((p) => p.layer !== 'fasteners' && (p.layer === 'joinery' || (!p.id.startsWith('joinery-') && !p.id.startsWith('glass-')))),
    [model],
  )
  const materials = useMemo(() => createSystem1Materials(config, opacity),
    [config.panelManufacturer, config.wallProfile, config.exteriorColor, config.flashingColor, config.floorFinish, opacity]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => Object.values(materials).forEach((mat) => mat.dispose()), [materials])

  // E3 (presety z `lighting`): wnętrze z jawną mapą otoczenia o niskim natężeniu — przy scene.environment three ignoruje
  // envMapIntensity materiału, a IBL nie zna zasłonięcia (wnętrze oświetlone jak plener → szyba „mleczna”).
  // Natężenie ≈ udział światła dziennego przy dużym przeszkleniu (ASSUMPTION, kalibracja: łata szyby na zdjęciu 163).
  const e3 = features.lighting
  const transmission = useQuality().glassTransmission
  const lighting = useLighting()
  const env = useEnvironment({ files: lighting.hdri })
  useEffect(() => {
    if (!e3) return
    const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const k = Number(q?.get('int') ?? E3_INTERIOR_ENV)
    for (const mat of [materials.inner, materials.floorTop]) {
      mat.envMap = env
      mat.envMapRotation.set(0, lighting.rotationY, 0)
      mat.envMapIntensity = k
      mat.needsUpdate = true
    }
  }, [e3, env, lighting.rotationY, materials])

  // stolarka: wspólna biblioteka materiałów nowej ścieżki (parametry jak dotychczasowy OpeningFrame / E3 / E5)
  const glassMode: GlassMode = !transmission ? 'cheap' : e3 ? 'e3' : 'legacy'

  const materialOf = useCallback((p: Part): Material => {
    if (p.id.startsWith('wall-joint-')) return materials.joint
    if (p.material === 'steel') return materials.steel
    if (p.material === 'flashing') return materials.flashing
    if (p.material === 'pirCore') return materials.core
    if (p.layer === 'floor') return p.material === 'sheetInner' ? materials.floorTop : materials.floor
    if (p.layer === 'roof') return p.material === 'sheetInner' ? materials.roofOuter : p.material === 'sheetOuter' && p.color === '#f1ece1' ? materials.inner : materials.roofOuter
    if (p.material === 'sheetInner') return materials.inner
    if (p.layer === 'walls' && p.material === 'sheetOuter') {
      const side = p.id.split('-')[1] as keyof typeof finish
      if (finish[side] === 'cassette') return materials.wallCavity
    }
    if (p.material === 'glass') return materials.glass
    return materials.wallOuter
  }, [materials, finish])
  const lookOf = useCallback((p: Part): PartLook => {
    if (p.layer === 'joinery') {
      if (p.material === 'glass') return { material: joineryGlass(glassMode, e3GlassParams()), castShadow: false }
      if (p.material === 'gasket') return { material: gasketMaterial(), castShadow: true }
      if (p.material === 'hardware') return { material: hardwareMaterial(p.color), castShadow: true }
      return { material: joineryFrameMaterial(p.color), castShadow: true }
    }
    const thinSheet = p.material === 'sheetOuter' || p.material === 'sheetInner'
    return { material: materialOf(p), castShadow: !thinSheet }
  }, [materialOf, glassMode])

  if (features.layerRenderer) return <LayerRenderer parts={parts} lookOf={lookOf} />
  return <group>{parts.map((p) => <PartMesh key={p.id} part={p} material={materialOf(p)} />)}</group>
}

