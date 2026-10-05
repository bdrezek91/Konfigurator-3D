import { useCallback, useEffect, useMemo } from 'react'
import { Color, FrontSide, Material, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import { isRal9005, RENDER } from '../physical/spec'
import { flatNormalMap, profileNormalMap, surfaceProfileDef } from '../scene/materials/profiles'
import { woodMaps } from '../scene/materials/textures'
import type { PavilionConfig } from '../types'
import { buildRunGeometry, finishForConfig } from './geometry'
import { buildSystem1 } from './system1/build'
import type { Part } from './types'
import { isE3Poc, isLayerPoc } from '../render/poc'
import { useEnvironment } from '@react-three/drei'
import { useLighting } from '../scene/environment/lighting'
import { CHEAP_GLASS, useQuality } from '../render/quality'
import { LayerRenderer } from '../render/LayerRenderer'
import type { PartLook } from '../render/layers'

/** E3: natężenie mapy otoczenia wnętrza (ASSUMPTION) i szkło [odbicie (specularIntensity), LT] — patrz System1Body. */
const E3_INTERIOR_ENV = 0.2
const E3_GLASS: [number, number] = [2.5, 0.78]

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
  // PoC (galeria-163): stolarka z przekrojów należy do modelu i renderuje się z nim (warstwa JOINERY);
  // pozostałe presety: uproszczona rama modelu pomijana — stolarkę rysuje OpeningFrame
  const poc = isLayerPoc(config)
  const parts = useMemo(
    () => model.parts.filter((p) => p.layer !== 'fasteners' && (poc || (!p.id.startsWith('joinery-') && !p.id.startsWith('glass-')))),
    [model, poc],
  )
  const transparent = opacity < 1
  const materials = useMemo(() => {
    const profile = surfaceProfileDef(config.panelManufacturer, config.wallProfile)
    const black = isRal9005(config.exteriorColor)
    const common = { side: FrontSide, transparent, opacity }
    return {
      // blacha powlekana poliestrem 25 µm = lakier (dielektryk), półmat: metalness ≈ 0, połysk z chropowatości;
      // metaliczny materiał dawał czarny bok w cieniu (zdjęcie 163: bok 85/87/91, front 91/97/111 przy RAL 7016).
      // envMapIntensity materiału nie działa przy scene.environment (three ≥ r163: używa scene.environmentIntensity)
      wallOuter: new MeshStandardMaterial({
        ...common, color: config.exteriorColor, metalness: 0.04,
        roughness: black ? RENDER.blackMattRoughness.value : RENDER.panelSemiMattRoughness.value,
        normalMap: profile ? profileNormalMap(profile) : flatNormalMap(),
      }),
      // lico płyty pod kasetonami — widoczne tylko w fugach 20 mm między kasetonami o głębokości 25 mm, w głębokim cieniu
      // (zdjęcia 110, 155: fuga = ciemna linia). Cień słońca nie wchodzi w tak wąską szczelinę (normalBias cienia ~ fuga),
      // więc zacienienie wnęki jest w materiale: kolor płyty × 0,3
      wallCavity: new MeshStandardMaterial({ ...common, color: new Color(config.exteriorColor).multiplyScalar(0.3), metalness: 0, roughness: 0.9 }),
      roofOuter: new MeshStandardMaterial({ ...common, color: config.flashingColor, metalness: 0.34, roughness: 0.48, envMapIntensity: 1.05 }),
      // okładzina wewnętrzna 9010 gładka
      inner: new MeshStandardMaterial({ ...common, color: '#f1ece1', metalness: 0.05, roughness: 0.4 }),
      // rdzeń odsunięty w buforze głębokości: lico rdzenia leży 0,6 mm za blachą — bez offsetu przy 16-bitowej głębi
      // (render programowy, część telefonów) rdzeń przebijał na krawędziach trójkątów jako żółte kreski
      core: new MeshStandardMaterial({ ...common, color: '#e3cf8f', roughness: 0.92, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 }),
      steel: new MeshStandardMaterial({ side: FrontSide, color: config.flashingColor, metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value }),
      flashing: new MeshStandardMaterial({ side: FrontSide, color: config.flashingColor, metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value }),
      floor: new MeshStandardMaterial({ side: FrontSide, color: '#9aa0a3', roughness: 0.6 }),
      // wierzch podłogi: MFP 12 + wykładzina Tarkett Activia Latur 3 (deska brązowa — kolor przybliżony)
      floorTop: config.floorFinish === 'concrete'
        ? new MeshStandardMaterial({ side: FrontSide, color: '#9f9c95', roughness: 0.7 })
        // UV wieczka wyciągnięcia = metry przekroju; deski Activia Latur 3 (dąb brązowy) wzdłuż długości (x)
        : new MeshStandardMaterial({ side: FrontSide, color: '#ffffff', roughness: 0.55, ...woodMaps('floor', 2, 1) }),
      // styk płyt (zamek): ciemna linia — cień w zamku
      // kolor z koloru płyty, przyciemniony: zdjęcie 163 — styk ~12% ciemniejszy od lica (90–97 przy 103), nie czarna kreska
      joint: new MeshStandardMaterial({ ...common, color: new Color(config.exteriorColor).multiplyScalar(0.6), roughness: 0.7, metalness: 0.04, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
      glass: new MeshPhysicalMaterial({ color: '#5d6b74', metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.45 }),
    }
  }, [config.panelManufacturer, config.wallProfile, config.exteriorColor, config.flashingColor, config.floorFinish, transparent, opacity])
  useEffect(() => () => Object.values(materials).forEach((mat) => mat.dispose()), [materials])

  // E3 (PoC galeria-163): wnętrze z jawną mapą otoczenia o niskim natężeniu — przy scene.environment three ignoruje
  // envMapIntensity materiału, a IBL nie zna zasłonięcia (wnętrze oświetlone jak plener → szyba „mleczna”).
  // Natężenie ≈ udział światła dziennego przy dużym przeszkleniu (ASSUMPTION, kalibracja: łata szyby na zdjęciu 163).
  const e3 = isE3Poc(config)
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

  // stolarka (PoC): parametry 1:1 z dotychczasowego OpeningFrame (rama, uszczelka, okucia, szkło) — bez strojenia materiałów
  const joineryMats = useMemo(() => {
    const cache = new Map<string, Material>()
    const get = (key: string, make: () => Material) => {
      let mat = cache.get(key)
      if (!mat) cache.set(key, (mat = make()))
      return mat
    }
    return {
      cache,
      frame: (color: string) => get('frame' + color, () => new MeshStandardMaterial({ color, metalness: 0.12, roughness: 0.42 })),
      gasket: () => get('gasket', () => new MeshStandardMaterial({ color: '#0c0d0e', metalness: 0, roughness: 0.8 })),
      hardware: (color: string) => get('hw' + color, () => new MeshStandardMaterial({ color, metalness: color === '#2a2d2f' ? 0.6 : 0.85, roughness: color === '#2a2d2f' ? 0.35 : 0.28 })),
      // szyba zespolona 4/16/4 low-E — jak GlassPane (OpeningFrame.tsx); pakiet ma tu rzeczywistą grubość 24 mm
      glass: () => get('glass', () => {
        // LOW (E5): bez transmisji — transmisja to dodatkowy przebieg renderu całej sceny
        if (!transmission) return new MeshPhysicalMaterial({ ...CHEAP_GLASS })
        if (!e3) {
          return new MeshPhysicalMaterial({
            color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: 0.024, ior: 1.52, specularIntensity: 3.4,
            attenuationColor: '#9fb0a8', attenuationDistance: 0.024,
          })
        }
        // E3: wnętrze ma już realistyczną jasność — szkło bliżej fizyki: LT pakietu low-E ≈ 0,78, odbicie ≈ 2 × F0 jednej tafli
        // (?gls=odbicie,LT — kalibracja)
        const q = new URLSearchParams(window.location.search).get('gls')?.split(',').map(Number)
        const [spec, lt] = q && q.length === 2 && q.every(Number.isFinite) ? q : E3_GLASS
        return new MeshPhysicalMaterial({
          color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: 0.024, ior: 1.52, specularIntensity: spec,
          attenuationColor: new Color().setRGB(lt * 0.97, lt, lt * 0.98), attenuationDistance: 0.024,
        })
      }),
    }
  }, [e3, transmission])
  useEffect(() => () => joineryMats.cache.forEach((mat) => mat.dispose()), [joineryMats])

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
      if (p.material === 'glass') return { material: joineryMats.glass(), castShadow: false }
      if (p.material === 'gasket') return { material: joineryMats.gasket(), castShadow: true }
      if (p.material === 'hardware') return { material: joineryMats.hardware(p.color), castShadow: true }
      return { material: joineryMats.frame(p.color), castShadow: true }
    }
    const thinSheet = p.material === 'sheetOuter' || p.material === 'sheetInner'
    return { material: materialOf(p), castShadow: !thinSheet }
  }, [materialOf, joineryMats])

  if (poc) return <LayerRenderer parts={parts} lookOf={lookOf} />
  return <group>{parts.map((p) => <PartMesh key={p.id} part={p} material={materialOf(p)} />)}</group>
}

