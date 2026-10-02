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
}

export const LIGHTING: Record<LightingMode, LightingPreset> = {
  day: {
    hdri: './hdri/kloofendal_43d_clear_2k.hdr',
    environmentIntensity: 0.85,
    backgroundIntensity: 0.85,
    rotationY: Math.PI,
    sunDirection: [-0.52, 0.42, 0.74],
    sunColor: '#fff1dc',
    sunIntensity: 2.4,
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

export const LightingContext = createContext<LightingPreset>(LIGHTING.day)

export function useLighting() {
  return useContext(LightingContext)
}
