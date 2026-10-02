import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three'
import type { PanelManufacturer, SurfaceProfile } from '../../types'

/**
 * Fizyczna definicja przetłoczenia okładziny płyty warstwowej — w milimetrach.
 * Profil jest okresowy wzdłuż szerokości płyty (oś U tekstury = metry wzdłuż ściany).
 */
export type ProfileShape =
  /** fala o przekroju zbliżonym do trójkąta z zaokrąglonymi wierzchołkami (mikrofala MF, Balex M16) */
  | 'zigzag'
  /** naprzemienne pola wyższe/niższe połączone skośnym przejściem (linia L, mikrolinia ML, Balex L/D) */
  | 'step'
  /** płaska blacha z wąskim rowkiem V (mikrorowek MR, rowek R) */
  | 'groove'
  /** mikrofala w dwóch kierunkach pod kątem 90° (Carbon) */
  | 'grid'

export type ProfileSource = 'catalog' | 'catalog-drawing' | 'assumption'

export type SurfaceProfileDef = {
  label: string
  shape: ProfileShape
  /** rozstaw powtórzeń [mm] */
  pitchMm: number
  /** głębokość profilu (grzbiet–dolina) [mm] */
  amplitudeMm: number
  /** szerokość pola wyższego / grzbietu [mm] */
  ridgeWidthMm: number
  /** szerokość pola niższego / rowka [mm] */
  valleyWidthMm: number
  /** szerokość skośnego przejścia między polami [mm] ('step') */
  flankMm?: number
  source: ProfileSource
  note: string
}

const PANELTECH_SRC = 'Katalog Paneltech 2026.2, s. 10–11 (rysunki profilacji); głębokość „ok. 1 mm” (s. 10).'
const BALEX_SRC = 'Katalog płyt warstwowych Balex Metal PL-2026-08-24, rozdz. 14, s. 17–18.'

/**
 * Parametry profili wg katalogów producentów (pobrane 2026-10-02, kopie w reference/profiles/).
 * Wymiary oznaczone 'catalog' są opisane liczbą na rysunku; 'catalog-drawing' — odczytane z rysunku w skali.
 */
export const SURFACE_PROFILES: Record<PanelManufacturer, Partial<Record<SurfaceProfile, SurfaceProfileDef>>> = {
  paneltech: {
    microwave: {
      label: 'Paneltech MF · mikrofala',
      shape: 'zigzag', pitchMm: 16, amplitudeMm: 1.0, ridgeWidthMm: 8, valleyWidthMm: 8,
      source: 'catalog', note: PANELTECH_SRC + ' Wymiary 8 + 8 mm (grzbiet–dolina–grzbiet) → rozstaw 16 mm, 62,5 fali/m.',
    },
    microline: {
      label: 'Paneltech ML · mikrolinia',
      shape: 'step', pitchMm: 50, amplitudeMm: 1.0, ridgeWidthMm: 25, valleyWidthMm: 25, flankMm: 3,
      source: 'catalog', note: PANELTECH_SRC + ' Pola 25 + 25 mm; przejście ≈3 mm odczytane z rysunku.',
    },
    microrib: {
      label: 'Paneltech MR · mikrorowek',
      shape: 'groove', pitchMm: 25, amplitudeMm: 1.0, ridgeWidthMm: 18, valleyWidthMm: 7,
      source: 'catalog', note: PANELTECH_SRC + ' Rowek V szer. 7 mm co 25 mm.',
    },
    linear: {
      label: 'Paneltech L · linia',
      shape: 'step', pitchMm: 100, amplitudeMm: 1.0, ridgeWidthMm: 50, valleyWidthMm: 50, flankMm: 3,
      source: 'catalog', note: PANELTECH_SRC + ' Pola 50 + 50 mm; przejście ≈3 mm odczytane z rysunku.',
    },
    carbon: {
      label: 'Paneltech C · carbon',
      shape: 'grid', pitchMm: 16, amplitudeMm: 1.0, ridgeWidthMm: 8, valleyWidthMm: 8,
      source: 'catalog', note: PANELTECH_SRC + ' „Profilacja MF w dwóch kierunkach pod kątem 90°”, 8 + 8 mm.',
    },
  },
  balex: {
    microline: {
      label: 'Balex M16 · mikroprofilowanie',
      shape: 'zigzag', pitchMm: 16, amplitudeMm: 0.8, ridgeWidthMm: 8, valleyWidthMm: 8,
      source: 'catalog', note: BALEX_SRC + ' Wymiar 8 mm = pół okresu (stąd nazwa M16), głębokość 0,8 mm.',
    },
    linear: {
      label: 'Balex L · liniowane',
      shape: 'step', pitchMm: 105, amplitudeMm: 0.8, ridgeWidthMm: 52.5, valleyWidthMm: 52.5, flankMm: 3,
      source: 'catalog', note: BALEX_SRC + ' Pola 52,5 mm, głębokość 0,8 mm.',
    },
    ribbed: {
      label: 'Balex D · pogłębione liniowanie',
      shape: 'step', pitchMm: 66.67, amplitudeMm: 2.0, ridgeWidthMm: 33.33, valleyWidthMm: 33.33, flankMm: 4,
      source: 'catalog', note: BALEX_SRC + ' Pola 33,33 mm, głębokość 2,0 mm. Wg tabeli 5 katalogu D jest okładziną wewnętrzną płyty dachowej PIR ROOF.',
    },
  },
  generic: {},
}

/** Profile bez dedykowanej definicji producenta korzystają z odpowiednika Paneltech. */
export function surfaceProfileDef(manufacturer: PanelManufacturer, profile: SurfaceProfile): SurfaceProfileDef | null {
  if (profile === 'smooth' || profile === 'trapezoid') return null
  return SURFACE_PROFILES[manufacturer][profile]
    ?? SURFACE_PROFILES.paneltech[profile]
    ?? (profile === 'ribbed' ? SURFACE_PROFILES.balex.ribbed ?? null : null)
}

/** Trapez płyty dachowej [mm] (żebro: podstawa, góra, wysokość; rozstaw żeber). */
export type RoofTrapezoidDef = { pitchMm: number; heightMm: number; baseMm: number; topMm: number; source: ProfileSource; note: string }

export const ROOF_TRAPEZOIDS: Record<PanelManufacturer, RoofTrapezoidDef> = {
  paneltech: {
    pitchMm: 350, heightMm: 42, baseMm: 72, topMm: 26, source: 'catalog-drawing',
    note: PANELTECH_SRC + ' T: rozstaw 350 mm i wysokość 42 mm opisane; podstawa/góra żebra odczytane z rysunku w skali (4,07 px/mm).',
  },
  balex: {
    pitchMm: 333, heightMm: 40, baseMm: 76, topMm: 30, source: 'catalog-drawing',
    note: BALEX_SRC + ' T: moduł 333 mm; wysokość/podstawa/góra z warstwy wymiarowej rysunku — do potwierdzenia kartą PIR ROOF.',
  },
  generic: {
    pitchMm: 350, heightMm: 42, baseMm: 72, topMm: 26, source: 'assumption', note: 'Jak Paneltech T.',
  },
}

const smoothstep = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t))
const ZIGZAG_ROUND = 0.96

/** Fala trójkątna z zaokrąglonymi wierzchołkami, zakres [-1, 1], grzbiet w x = 0. */
function zigzag(xMm: number, p: number) {
  return Math.asin(ZIGZAG_ROUND * Math.cos((2 * Math.PI * xMm) / p)) / Math.asin(ZIGZAG_ROUND)
}

/** Wysokość profilu h(x, y) [mm]; y używane tylko przez 'grid'. */
export function profileHeight(def: SurfaceProfileDef, xMm: number, yMm = 0) {
  const p = def.pitchMm
  const a = def.amplitudeMm
  const x = ((xMm % p) + p) % p
  switch (def.shape) {
    case 'zigzag':
      return (a / 2) * zigzag(x, p)
    case 'grid':
      return (a / 4) * (zigzag(xMm, p) + zigzag(yMm, p))
    case 'step': {
      // pole wyższe [0, ridge], niższe [ridge, p]; przejścia o szerokości flank wyśrodkowane na granicach
      const f = Math.max(0.5, def.flankMm ?? 3)
      const r = def.ridgeWidthMm
      const up = smoothstep((x + f / 2) / f) - smoothstep((x - r + f / 2) / f) + smoothstep((x - p + f / 2) / f)
      return a * (up - 0.5)
    }
    case 'groove': {
      // rowek V o szerokości valleyWidth, środek w p/2
      const w = def.valleyWidthMm
      const d = Math.abs(x - p / 2)
      return d < w / 2 ? -a * (1 - d / (w / 2)) : 0
    }
  }
}

const cache = new Map<string, DataTexture>()

/**
 * Normal mapa wygenerowana z fizycznego profilu [mm]. Jeden kafel = jeden okres; repeat ustawiony
 * tak, by przy UV w metrach (ściany z ExtrudeGeometry) wypadało dokładnie 1000 / pitchMm okresów na metr.
 * Nachylenie liczone jako średnia na szerokości piksela (różnica h na krawędziach piksela) — bez aliasingu
 * wąskich rowków. Mipmapy + anizotropia uśredniają profil z daleka (bez moiré); path tracer czyta tę samą mapę.
 */
export function profileNormalMap(def: SurfaceProfileDef) {
  const key = [def.shape, def.pitchMm, def.amplitudeMm, def.ridgeWidthMm, def.valleyWidthMm, def.flankMm].join('|')
  const cached = cache.get(key)
  if (cached) return cached
  // ≥ 64 px na okres i ≥ 8 px na najwęższy element (rowek / przejście)
  const narrow = def.shape === 'step' ? def.flankMm ?? 3 : def.shape === 'groove' ? def.valleyWidthMm : def.pitchMm / 8
  const width = Math.min(1024, Math.max(64, Math.ceil((8 * def.pitchMm) / Math.max(0.5, narrow) / 4) * 4))
  const is2d = def.shape === 'grid'
  const height = is2d ? width : 4
  const data = new Uint8Array(width * height * 4)
  const mm = def.pitchMm / width
  for (let j = 0; j < height; j++) {
    const y = is2d ? (j + 0.5) * mm : 0
    for (let i = 0; i < width; i++) {
      const x = (i + 0.5) * mm
      const sx = (profileHeight(def, x + mm / 2, y) - profileHeight(def, x - mm / 2, y)) / mm
      const sy = is2d ? (profileHeight(def, x, y + mm / 2) - profileHeight(def, x, y - mm / 2)) / mm : 0
      const len = Math.hypot(sx, sy, 1)
      const k = (j * width + i) * 4
      data[k] = Math.round((-sx / len * 0.5 + 0.5) * 255)
      data[k + 1] = Math.round((-sy / len * 0.5 + 0.5) * 255)
      data[k + 2] = Math.round((1 / len * 0.5 + 0.5) * 255)
      data[k + 3] = 255
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType)
  texture.colorSpace = NoColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.magFilter = LinearFilter
  texture.minFilter = LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  // UV ścian w metrach → 1000 / pitch okresów na metr
  texture.repeat.set(1000 / def.pitchMm, is2d ? 1000 / def.pitchMm : 1)
  texture.needsUpdate = true
  cache.set(key, texture)
  return texture
}
