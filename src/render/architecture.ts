import type { PavilionConfig } from '../types'

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
  /** podkładki fundamentowe z modelu komponentów w rendererze warstw (FoundationSupports wyłączony) */
  foundationParts: boolean
  /** E3: HDRI z otoczeniem, słońce zgrane z mapą, tone mapping, wnętrze i szkło */
  lighting: boolean
  /** E4: korona i cokół z uciosem przez narożnik */
  flashingMitre: boolean
}

const FULL: ArchFeatures = {
  layerRenderer: true, sectionJoinery: true, cassetteTrays: true, boardTrays: true, foundationParts: true, lighting: true, flashingMitre: true,
}

/**
 * Zasada (E6-C): nowa architektura dla wszystkich pawilonów — galerie, presety projektów i „Własna konfiguracja”.
 * Wyjątek: światło E3 tylko tam, gdzie jest skalibrowane (163); na 207 oddalało render od zdjęcia (E6-B, rozdz. 3).
 * Stolarka z przekrojów obejmuje otwory z biblioteki (`sectionJoinerySupports`), pozostałe zostają na OpeningFrame.
 */
const DEFAULT: ArchFeatures = { ...FULL, lighting: false }

/** Wyjątki od zasady (klucz: config.project). */
export const ARCH_PRESETS: Readonly<Record<string, ArchFeatures>> = {
  'GALERIA/163': FULL,
}

export function arch(config: Pick<PavilionConfig, 'project'>): ArchFeatures {
  const f = ARCH_PRESETS[config.project] ?? DEFAULT
  // `?e3=0` / `?e3=1` — diagnostyka: wyłącza / włącza światło E3 na presecie (porównanie w jednym buildzie, nie zmienia presetu)
  const e3 = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('e3') : null
  if (e3 === '0' || e3 === '1') return { ...f, lighting: e3 === '1' }
  return f
}
