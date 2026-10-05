import { Color, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, type Material } from 'three'
import { isRal9005, RENDER } from '../physical/spec'
import { flatNormalMap, profileNormalMap, surfaceProfileDef } from '../scene/materials/profiles'
import { renderMetalColor, woodMaps, woodSharedMaps, type WoodKind } from '../scene/materials/textures'
import type { PavilionConfig } from '../types'
import { CHEAP_GLASS } from './quality'
import { CAVITY_SHADE } from '../construction/facade/corners'

/**
 * BIBLIOTEKA MATERIAŁÓW NOWEJ ŚCIEŻKI (E6-A): jedna definicja materiału na rodzaj elementu — bryła Systemu 1, stolarka,
 * tace kasetonów i kasetonu-deski, posadowienie. Parametry przeniesione 1:1 z dotychczasowych miejsc (System1Body,
 * OpeningFrame, CassetteTrays, primitives) — bez strojenia. Materiały współdzielone (cache) żyją przez cały czas działania
 * aplikacji (zestaw kombinacji jest skończony), jak w primitives.tsx.
 */
const cache = new Map<string, Material>()
function shared<T extends Material>(key: string, make: () => T): T {
  let mat = cache.get(key) as T | undefined
  if (!mat) {
    mat = make()
    // renderer warstw i R3F nie mogą zwolnić materiału współdzielonego
    mat.dispose = () => {}
    cache.set(key, mat)
  }
  return mat
}

/**
 * Materiały bryły Systemu 1 (płyty, rdzeń, obróbki, rama, podłoga) dla konfiguracji — przeniesione 1:1 z System1Body.
 * Zwalnia je wywołujący (zależą od koloru, profilu i przezroczystości).
 */
export function createSystem1Materials(config: PavilionConfig, opacity: number) {
  const transparent = opacity < 1
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
}

// ---- stolarka (E1)
export const joineryFrameMaterial = (color: string) => shared('frame|' + color, () => new MeshStandardMaterial({ color, metalness: 0.12, roughness: 0.42 }))
export const gasketMaterial = () => shared('gasket', () => new MeshStandardMaterial({ color: '#0c0d0e', metalness: 0, roughness: 0.8 }))
export const hardwareMaterial = (color: string) => shared('hw|' + color, () => new MeshStandardMaterial({
  color, metalness: color === '#2a2d2f' ? 0.6 : 0.85, roughness: color === '#2a2d2f' ? 0.35 : 0.28,
}))

/** Szkło: 'legacy' — jak GlassPane; 'e3' — LT pakietu ≈ 0,78 przy realistycznym wnętrzu; 'cheap' — LOW (E5), bez transmisji. */
export type GlassMode = 'legacy' | 'e3' | 'cheap'
/** E3: [odbicie (specularIntensity), LT] — kalibracja łatą szyby zdjęcia 163; `?gls=odbicie,LT` (diagnostyka). */
export const E3_GLASS: [number, number] = [2.5, 0.78]
export function e3GlassParams(): [number, number] {
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('gls')?.split(',').map(Number) : undefined
  return q && q.length === 2 && q.every(Number.isFinite) ? [q[0], q[1]] : E3_GLASS
}
export function joineryGlass(mode: GlassMode, [spec, lt]: [number, number] = E3_GLASS) {
  if (mode === 'cheap') return shared('glass|cheap', () => new MeshPhysicalMaterial({ ...CHEAP_GLASS }))
  if (mode === 'legacy') {
    return shared('glass|legacy', () => new MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: 0.024, ior: 1.52, specularIntensity: 3.4,
      attenuationColor: '#9fb0a8', attenuationDistance: 0.024,
    }))
  }
  return shared('glass|e3|' + spec + '|' + lt, () => new MeshPhysicalMaterial({
    color: '#ffffff', metalness: 0, roughness: 0, transmission: 1, thickness: 0.024, ior: 1.52, specularIntensity: spec,
    attenuationColor: new Color().setRGB(lt * 0.97, lt, lt * 0.98), attenuationDistance: 0.024,
  }))
}

// ---- elewacja: tace (E2)
/** Blacha kasetonu — jak dotychczasowy Box kasetonu (RENDER.flashingMatt*); `shaded` — kolory wierzchołków (cień w fudze). */
export const cassetteSteelMaterial = (color: string, shaded: boolean) => shared('cass|' + color + '|' + shaded, () => new MeshStandardMaterial({
  color: renderMetalColor(color), metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value, vertexColors: shaded,
}))

/**
 * Drewno tacy: kaseton z dekorem drewna (jak Box: metal 0,02, roughness 0,6, normalScale 0,22) albo kaseton-deska
 * (jak RoundedPiece pasa: metal 0,10, roughness 0,62, normalScale 0,6). Rysunek elementu jest w UV geometrii.
 */
export function trayWoodMaterial(kind: WoodKind, shaded: boolean) {
  const boards = kind === 'pineBoards' || kind === 'winchesterBoards'
  return shared('wood|' + kind + '|' + shaded, () => {
    const m = new MeshStandardMaterial({ color: '#ffffff', metalness: boards ? 0.1 : 0.02, roughness: boards ? 0.62 : 0.6, vertexColors: shaded, ...woodSharedMaps(kind) })
    m.normalScale.set(boards ? 0.6 : 0.22, boards ? 0.6 : 0.22)
    return m
  })
}

/** Blacha wnęki narożnika — jak dotychczasowy Box (kolor elewacji × 0,3, metal 0, roughness 0,9). */
export const cornerCavityMaterial = (exterior: string) => shared('cavity|' + exterior, () =>
  new MeshStandardMaterial({ color: new Color(exterior).multiplyScalar(CAVITY_SHADE), metalness: 0, roughness: 0.9 }))

// ---- posadowienie
/** Bloczek betonowy — jak dotychczasowy RoundedPiece podkładki (#888983, roughness 0,92, metal 0,10). */
export const concreteBlockMaterial = () => shared('concrete-block', () => new MeshStandardMaterial({ color: '#888983', roughness: 0.92, metalness: 0.1 }))
