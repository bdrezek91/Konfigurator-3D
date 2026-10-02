import { DataTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, RepeatWrapping, RGBAFormat, UnsignedByteType } from 'three'
import type { PanelManufacturer, SurfaceProfile } from '../../types'

/**
 * Fizyczna definicja przetłoczenia okładziny płyty warstwowej — w milimetrach.
 * Profil jest okresowy wzdłuż szerokości płyty (oś U tekstury = metry wzdłuż ściany).
 */
export type ProfileShape =
  /** fala sinusoidalna (mikrofala) */
  | 'wave'
  /** płaska blacha z wąskimi rowkami (mikrorowek, mikrolinia, linia) */
  | 'groove'
  /** płaska blacha z wąskimi grzbietami (liniowanie wypukłe) */
  | 'rib'

export type ProfileSource = 'catalog' | 'measured' | 'assumption'

export type SurfaceProfileDef = {
  label: string
  shape: ProfileShape
  /** rozstaw powtórzeń [mm] */
  pitchMm: number
  /** głębokość profilu (grzbiet–dolina) [mm] */
  amplitudeMm: number
  /** szerokość grzbietu / płaskiej części [mm] (dla 'groove' i 'rib') */
  ridgeWidthMm: number
  /** szerokość doliny / rowka [mm] (dla 'groove' i 'rib') */
  valleyWidthMm: number
  source: ProfileSource
  note: string
}

/**
 * Parametry profili. Źródła:
 * - Paneltech MF: głębokość ≈ 1 mm — karta techniczna PW PIR-S („głębokość profilacji ok. 1 mm”).
 *   Rozstaw 15 mm — wartość robocza do potwierdzenia katalogiem (pomiar z nagrania WA0018 dał 11 ± 3 mm,
 *   ograniczony kompresją wideo; patrz reference/profiles/KALIBRACJA.md).
 * - Pozostałe profile: założenia do weryfikacji kartami producentów (oznaczone source: 'assumption').
 */
export const SURFACE_PROFILES: Record<PanelManufacturer, Partial<Record<SurfaceProfile, SurfaceProfileDef>>> = {
  paneltech: {
    microwave: {
      label: 'Paneltech MF · mikrofala',
      shape: 'wave', pitchMm: 15, amplitudeMm: 1.0, ridgeWidthMm: 7.5, valleyWidthMm: 7.5,
      source: 'measured',
      note: 'Głębokość ≈1 mm wg karty PW PIR-S; rozstaw 15 mm robocze (wideo: 11±3 mm) — do potwierdzenia katalogiem.',
    },
    microline: {
      label: 'Paneltech ML · mikrolinia',
      shape: 'groove', pitchMm: 25, amplitudeMm: 0.5, ridgeWidthMm: 23, valleyWidthMm: 2,
      source: 'assumption', note: 'Założenie — wąskie linie, do weryfikacji kartą Paneltech.',
    },
    microrib: {
      label: 'Paneltech MR · mikrorowek',
      shape: 'groove', pitchMm: 33, amplitudeMm: 0.8, ridgeWidthMm: 30, valleyWidthMm: 3,
      source: 'assumption', note: 'Założenie — do weryfikacji kartą Paneltech.',
    },
    linear: {
      label: 'Paneltech L · linia',
      shape: 'groove', pitchMm: 100, amplitudeMm: 1.0, ridgeWidthMm: 92, valleyWidthMm: 8,
      source: 'assumption', note: 'Założenie — do weryfikacji kartą Paneltech.',
    },
    carbon: {
      label: 'Paneltech C · carbon',
      shape: 'wave', pitchMm: 6, amplitudeMm: 0.3, ridgeWidthMm: 3, valleyWidthMm: 3,
      source: 'assumption', note: 'Założenie — drobna faktura, do weryfikacji.',
    },
  },
  balex: {
    microline: {
      label: 'Balex · mikroprofilowanie',
      shape: 'wave', pitchMm: 15, amplitudeMm: 0.8, ridgeWidthMm: 7.5, valleyWidthMm: 7.5,
      source: 'assumption',
      note: 'Odpowiednik mikrofali; rozstaw i głębokość do potwierdzenia katalogiem PIR Balex (moduł 1000/1100 mm).',
    },
    linear: {
      label: 'Balex L · liniowanie',
      shape: 'groove', pitchMm: 100, amplitudeMm: 1.0, ridgeWidthMm: 92, valleyWidthMm: 8,
      source: 'assumption', note: 'Założenie — do weryfikacji katalogiem Balex.',
    },
    ribbed: {
      label: 'Balex · głębokie liniowanie',
      shape: 'groove', pitchMm: 200, amplitudeMm: 2.0, ridgeWidthMm: 185, valleyWidthMm: 15,
      source: 'assumption', note: 'Założenie — do weryfikacji katalogiem Balex.',
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

/** Wysokość profilu h(x) [mm] dla x [mm] w obrębie jednego okresu. */
export function profileHeight(def: SurfaceProfileDef, xMm: number) {
  const p = def.pitchMm
  const x = ((xMm % p) + p) % p
  if (def.shape === 'wave') return (def.amplitudeMm / 2) * Math.cos((2 * Math.PI * x) / p)
  // rowek/grzbiet o łagodnych zboczach (cosinus na szerokości doliny)
  const w = def.valleyWidthMm
  const c = p - w / 2
  const d = Math.min(Math.abs(x - c), Math.abs(x + p - c), Math.abs(x - p - c))
  const local = d < w / 2 ? 0.5 * (1 + Math.cos((Math.PI * d) / (w / 2))) : 0
  return def.shape === 'groove' ? -def.amplitudeMm * local : def.amplitudeMm * local
}

const PX_PER_PERIOD = 64
const cache = new Map<string, DataTexture>()

/**
 * Normal mapa wygenerowana z fizycznego profilu [mm]. Jeden kafel = jeden okres; repeat ustawiony
 * tak, by przy UV w metrach (ściany z ExtrudeGeometry) wypadało dokładnie 1000 / pitchMm okresów na metr.
 * Mipmapy + filtrowanie anizotropowe uśredniają profil z daleka (bez moiré), a path tracer czyta tę samą mapę.
 */
export function profileNormalMap(def: SurfaceProfileDef) {
  const key = [def.shape, def.pitchMm, def.amplitudeMm, def.ridgeWidthMm, def.valleyWidthMm].join('|')
  const cached = cache.get(key)
  if (cached) return cached
  // fala: 64 px na okres; rowki: co najmniej 12 px na szerokość rowka (maks. 1024 px)
  const width = def.shape === 'wave'
    ? PX_PER_PERIOD
    : Math.min(1024, Math.max(PX_PER_PERIOD, Math.ceil((12 * def.pitchMm) / Math.max(0.5, def.valleyWidthMm) / 8) * 8))
  const height = 4
  const data = new Uint8Array(width * height * 4)
  const mmPerPx = def.pitchMm / width
  for (let i = 0; i < width; i++) {
    const x = (i + 0.5) * mmPerPx
    const slope = (profileHeight(def, x + mmPerPx * 0.5) - profileHeight(def, x - mmPerPx * 0.5)) / mmPerPx // dh/dx [mm/mm]
    const nx = -slope
    const nz = 1
    const len = Math.hypot(nx, nz)
    const r = Math.round(((nx / len) * 0.5 + 0.5) * 255)
    const b = Math.round(((nz / len) * 0.5 + 0.5) * 255)
    for (let j = 0; j < height; j++) {
      const k = (j * width + i) * 4
      data[k] = r
      data[k + 1] = 128
      data[k + 2] = b
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
  texture.repeat.set(1000 / def.pitchMm, 1)
  texture.needsUpdate = true
  cache.set(key, texture)
  return texture
}
