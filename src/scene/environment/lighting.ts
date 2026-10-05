import { createContext, useContext } from 'react'

export type LightingMode = 'day' | 'evening'

export type LightingPreset = {
  /** HDRI używane jako tło i źródło odbić (Poly Haven, CC0). */
  hdri: string
  environmentIntensity: number
  backgroundIntensity: number
  /** Obrót HDRI wokół osi Y — dobrany tak, by słońce z HDRI zgadzało się z kierunkiem światła kierunkowego. */
  rotationY: number
  /** Kierunek słońca (wektor od środka sceny do słońca, nienormalizowany). */
  sunDirection: [number, number, number]
  sunColor: string
  sunIntensity: number
  exposure: number
  /** Mnożnik jasności kinkietów i ich światła punktowego. */
  lampIntensity: number
  /**
   * Mapowanie tonów jako efekt postprocessingu. Brak = bez mapowania (stan dotychczasowy: EffectComposer wymusza
   * NoToneMapping na rendererze, więc ACES z onCreated i `exposure` nie działały w podglądzie — działały tylko w HQ).
   */
  toneMapping?: ToneMappingId
  /** Mnożnik koloru trawy podłoża (domyślnie #c9c070) — E3: kalibracja łatą trawy zdjęcia 163 (mniej zielonego odblasku w HQ) */
  groundTint?: string
}

export type ToneMappingId = 'aces' | 'agx' | 'neutral'

/**
 * Słońce w HDRI (zmierzone: środek jasności tarczy w pliku 2k) — azymut atan2(z, x) w układzie mapy i wysokość [°].
 * W three.js kierunek próbkowania mapy = Rᵀ · kierunek świata (WebGLMaterials / WebGLBackground: transpose), więc słońce mapy
 * trafia na azymut świata = azymut mapy − obrót environmentRotation (sprawdzone renderem kontrolnym przy obrocie ≠ π).
 */
export const HDRI_SUN: Record<string, { azimuthDeg: number; elevationDeg: number }> = {
  kloofendal_43d_clear_2k: { azimuthDeg: 36.1, elevationDeg: 43.0 },
  pretoria_gardens_2k: { azimuthDeg: 35.9, elevationDeg: 52.2 },
}

/**
 * Preset dzienny ze słońcem zgranym z HDRI: światło kierunkowe dokładnie w kierunku tarczy słońca mapy, obrót mapy tak,
 * by słońce stało na zadanym azymucie świata (cienie, niebo i odbicia w szybach z tego samego kierunku).
 */
export function sunAlignedDay(base: LightingPreset, hdri: string, worldAzimuthDeg: number, overrides: Partial<LightingPreset> = {}): LightingPreset {
  const sun = HDRI_SUN[hdri]
  const az = (worldAzimuthDeg * Math.PI) / 180
  const el = (sun.elevationDeg * Math.PI) / 180
  return {
    ...base,
    hdri: './hdri/' + hdri + '.hdr',
    rotationY: ((sun.azimuthDeg - worldAzimuthDeg) * Math.PI) / 180,
    sunDirection: [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)],
    ...overrides,
  }
}

export const LIGHTING: Record<LightingMode, LightingPreset> = {
  day: {
    hdri: './hdri/kloofendal_43d_clear_2k.hdr',
    // więcej światła rozproszonego z nieba, mniej jasne tło: porównanie ze zdjęciem 163 (bok w cieniu 85–91, niebo 222–241 sRGB)
    environmentIntensity: 1.45,
    backgroundIntensity: 0.62,
    rotationY: Math.PI,
    sunDirection: [-0.52, 0.42, 0.74],
    sunColor: '#fff1dc',
    sunIntensity: 2.0,
    exposure: 0.95,
    lampIntensity: 0.25,
  },
  evening: {
    hdri: './hdri/spruit_sunrise_1k.hdr',
    environmentIntensity: 0.55,
    backgroundIntensity: 0.7,
    rotationY: Math.PI * 0.35,
    sunDirection: [0.78, 0.16, 0.6],
    sunColor: '#ffb874',
    sunIntensity: 1.6,
    exposure: 0.9,
    lampIntensity: 4,
  },
}

/** E3: kolor trawy (sztuczna trawa na zdjęciu 163: 124/139/64) — ?grass=rrggbb do kalibracji */
const GROUND_TINT_E3 = '#8f7a3a'

/** Azymut światła dziennego dotychczasowej sceny (front oświetlony z lewej z przodu — jak zdjęcie 163), atan2(z, x) [°]. */
export const DAY_WORLD_AZIMUTH_DEG = 125.1

/**
 * E3 (PoC galeria-163): HDRI z otoczeniem (drzewa, trawnik — Poly Haven CC0) zamiast otwartego pola, słońce zgrane z mapą
 * (dotychczas światło kierunkowe ~90° obok tarczy słońca HDRI i 18° niżej). Tone mapping — wybrany pomiarem względem zdjęcia 163.
 */
export const LIGHTING_E3: Record<LightingMode, LightingPreset> = {
  // kalibracja (łaty sRGB zdjęcie 163 vs render, comparisons/poc-e3): Neutral najlepiej trzyma lico 7016 i odcień deski;
  // ekspozycja działa dopiero z mapowaniem tonów (EffectComposer)
  day: sunAlignedDay(LIGHTING.day, 'pretoria_gardens_2k', DAY_WORLD_AZIMUTH_DEG, {
    toneMapping: 'neutral', exposure: 1.25, environmentIntensity: 2.2, backgroundIntensity: 0.62, sunIntensity: 1.6,
    groundTint: GROUND_TINT_E3,
  }),
  evening: LIGHTING.evening,
}

export const LightingContext = createContext<LightingPreset>(LIGHTING.day)

export function useLighting() {
  return useContext(LightingContext)
}

/**
 * Preset oświetlenia dla konfiguracji: PoC E3 → LIGHTING_E3; diagnostyka (testy wizualne, jak ?L=): `?env=<hdri z HDRI_SUN>`
 * podmienia mapę (słońce zgrane), `?tm=aces|agx|neutral` — mapowanie tonów.
 */
export function resolveLighting(mode: LightingMode, e3: boolean): LightingPreset {
  let preset = e3 ? LIGHTING_E3[mode] : LIGHTING[mode]
  if (typeof window === 'undefined' || mode !== 'day') return preset
  const q = new URLSearchParams(window.location.search)
  const env = q.get('env')
  if (env && env in HDRI_SUN) preset = sunAlignedDay(preset, env, DAY_WORLD_AZIMUTH_DEG)
  const grass = q.get('grass')
  if (grass && /^[0-9a-f]{6}$/i.test(grass)) preset = { ...preset, groundTint: '#' + grass }
  const tm = q.get('tm')
  if (tm === 'aces' || tm === 'agx' || tm === 'neutral') preset = { ...preset, toneMapping: tm }
  // ?light=ekspozycja,env,tło,słońce — kalibracja względem zdjęcia (pomiar sRGB łat)
  const lq = q.get('light')?.split(',').map(Number)
  if (lq && lq.length === 4 && lq.every(Number.isFinite)) {
    preset = { ...preset, exposure: lq[0], environmentIntensity: lq[1], backgroundIntensity: lq[2], sunIntensity: lq[3] }
  }
  return preset
}
