import type { PavilionConfig } from '../types'

export type LightingVariant = 'sun' | 'overcast'

/**
 * Cechy nowej architektury (E0–E5) włączone dla presetu — jedno miejsce zamiast osobnych bramek PoC.
 * Migracja: E6-A galeria-163, E6-B galeria-207, E6-C — wszystkie pawilony (zasada poniżej).
 * E5 (tryby jakości, LOD) działa globalnie i nie ma tu przełącznika.
 */
export type ArchFeatures = {
  /** E0: bryła Systemu 1 przez renderer warstw (scalanie, instancje, LOD) */
  layerRenderer: boolean
  /** E1: stolarka z biblioteki przekrojów w modelu Systemu 1 (OpeningFrame wyłączony) */
  sectionJoinery: boolean
  /** E2: kasetony elewacji jako tace */
  cassetteTrays: boolean
  /** E2: kaseton-deska (pasy dekoru na gołej płycie) jako tace w rendererze warstw (DecorLocal wyłączony) */
  boardTrays: boolean
  /** P3: lamele pionowe w rendererze warstw (DecorLocal tylko dla lameli ukośnych, „węża”, ornamentu) */
  lamellaParts: boolean
  /** podkładki fundamentowe z modelu komponentów w rendererze warstw (FoundationSupports wyłączony) */
  foundationParts: boolean
  /**
   * E3: HDRI z otoczeniem, tone mapping, wnętrze i szkło. 'sun' — słoneczny dzień (kalibracja: zdjęcie 163),
   * 'overcast' — pochmurno (kalibracja: zdjęcie 207); false — dotychczasowe światło.
   */
  lighting: LightingVariant | false
  /** E4: korona i cokół z uciosem przez narożnik */
  flashingMitre: boolean
}

const FULL: ArchFeatures = {
  layerRenderer: true, sectionJoinery: true, cassetteTrays: true, boardTrays: true, lamellaParts: true, foundationParts: true, lighting: 'sun', flashingMitre: true,
}

/**
 * Zasada (E6-C): nowa architektura dla wszystkich pawilonów — galerie, presety projektów i „Własna konfiguracja”.
 * Światło: E3 „pochmurno” (zdjęcie 207 — kasetony, galerie z pochmurnym niebem) domyślnie; 163 — E3 „słońce” (zdjęcie 163).
 * Stolarka z przekrojów: wszystkie rodzaje otworów (OpeningFrame — tylko konstrukcje poza Systemem 1).
 */
const DEFAULT: ArchFeatures = { ...FULL, lighting: 'overcast' }

/** Wyjątki od zasady (klucz: config.project). */
export const ARCH_PRESETS: Readonly<Record<string, ArchFeatures>> = {
  'GALERIA/163': FULL,
}

export function arch(config: Pick<PavilionConfig, 'project'>): ArchFeatures {
  const f = ARCH_PRESETS[config.project] ?? DEFAULT
  // `?e3=0|1|sun|overcast` — diagnostyka: dotychczasowe światło / E3 słońce / E3 pochmurno (porównanie w jednym buildzie)
  const e3 = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('e3') : null
  if (e3 === '0' || e3 === '1' || e3 === 'sun' || e3 === 'overcast') return { ...f, lighting: e3 === '0' ? false : e3 === 'overcast' ? 'overcast' : 'sun' }
  return f
}
