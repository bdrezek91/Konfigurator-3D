import { useEffect, useMemo } from 'react'
import { FrontSide, Material, MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import { isRal9005, RENDER } from '../physical/spec'
import { flatNormalMap, profileNormalMap, surfaceProfileDef } from '../scene/materials/profiles'
import { woodMaps } from '../scene/materials/textures'
import type { PavilionConfig } from '../types'
import { buildRunGeometry, finishForConfig } from './geometry'
import { buildSystem1 } from './system1/build'
import type { Part } from './types'

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
  const parts = useMemo(
    () => model.parts.filter((p) => p.layer !== 'fasteners' && !p.id.startsWith('joinery-') && !p.id.startsWith('glass-')),
    [model],
  )
  const transparent = opacity < 1
  const materials = useMemo(() => {
    const profile = surfaceProfileDef(config.panelManufacturer, config.wallProfile)
    const black = isRal9005(config.exteriorColor)
    const common = { side: FrontSide, transparent, opacity }
    return {
      // blacha powlekana poliestrem 25 µm = lakier (dielektryk), półmat: metalness ≈ 0, połysk z chropowatości;
      // metaliczny materiał dawał czarny bok w cieniu (zdjęcie 163: bok 85/87/91, front 91/97/111 przy RAL 7016)
      wallOuter: new MeshStandardMaterial({
        ...common, color: config.exteriorColor, metalness: 0.04, envMapIntensity: 1.5,
        roughness: black ? RENDER.blackMattRoughness.value : RENDER.panelSemiMattRoughness.value,
        normalMap: profile ? profileNormalMap(profile) : flatNormalMap(),
      }),
      roofOuter: new MeshStandardMaterial({ ...common, color: config.flashingColor, metalness: 0.34, roughness: 0.48, envMapIntensity: 1.05 }),
      // wnętrze jaśniejsze (światło odbite od białych ścian i podłogi przez duże przeszklenia — zdjęcia wnętrz z galerii)
      inner: new MeshStandardMaterial({ ...common, color: '#f1ece1', metalness: 0.05, roughness: 0.4, envMapIntensity: 3.4 }),
      // rdzeń odsunięty w buforze głębokości: lico rdzenia leży 0,6 mm za blachą — bez offsetu przy 16-bitowej głębi
      // (render programowy, część telefonów) rdzeń przebijał na krawędziach trójkątów jako żółte kreski
      core: new MeshStandardMaterial({ ...common, color: '#e3cf8f', roughness: 0.92, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 }),
      steel: new MeshStandardMaterial({ side: FrontSide, color: config.flashingColor, metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value }),
      flashing: new MeshStandardMaterial({ side: FrontSide, color: config.flashingColor, metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value }),
      floor: new MeshStandardMaterial({ side: FrontSide, color: '#9aa0a3', roughness: 0.6 }),
      // wierzch podłogi: MFP 12 + wykładzina Tarkett Activia Latur 3 (deska brązowa — kolor przybliżony)
      floorTop: config.floorFinish === 'concrete'
        ? new MeshStandardMaterial({ side: FrontSide, color: '#9f9c95', roughness: 0.7 })
        // UV wieczka wyciągnięcia = metry przekroju → kafel 1 m; deski Activia Latur 3 (dąb brązowy) wzdłuż długości
        : new MeshStandardMaterial({ side: FrontSide, color: '#ffffff', roughness: 0.55, envMapIntensity: 2.2, ...woodMaps('floor', 1.001, 1) }),
      // styk płyt (zamek): ciemna linia — cień w zamku
      joint: new MeshStandardMaterial({ ...common, color: '#15181a', roughness: 0.85, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }),
      glass: new MeshPhysicalMaterial({ color: '#5d6b74', metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.45 }),
    }
  }, [config.panelManufacturer, config.wallProfile, config.exteriorColor, config.flashingColor, config.floorFinish, transparent, opacity])
  useEffect(() => () => Object.values(materials).forEach((mat) => mat.dispose()), [materials])

  const materialOf = (p: Part): Material => {
    if (p.id.startsWith('wall-joint-')) return materials.joint
    if (p.material === 'steel') return materials.steel
    if (p.material === 'flashing') return materials.flashing
    if (p.material === 'pirCore') return materials.core
    if (p.layer === 'floor') return p.material === 'sheetInner' ? materials.floorTop : materials.floor
    if (p.layer === 'roof') return p.material === 'sheetInner' ? materials.roofOuter : p.material === 'sheetOuter' && p.color === '#f1ece1' ? materials.inner : materials.roofOuter
    if (p.material === 'sheetInner') return materials.inner
    if (p.material === 'glass') return materials.glass
    return materials.wallOuter
  }
  return <group>{parts.map((p) => <PartMesh key={p.id} part={p} material={materialOf(p)} />)}</group>
}

