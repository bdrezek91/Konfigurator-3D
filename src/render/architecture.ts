import type { PavilionConfig } from '../types'

/**
 * Cechy nowej architektury (E0–E5) włączone dla presetu — jedno miejsce zamiast osobnych bramek PoC.
 * Migracja kontrolowana: preset po presecie (E6-A: galeria-163, E6-B: galeria-207 — w pełni).
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

const NONE: ArchFeatures = {
  layerRenderer: false, sectionJoinery: false, cassetteTrays: false, boardTrays: false, foundationParts: false, lighting: false, flashingMitre: false,
}
const FULL: ArchFeatures = {
  layerRenderer: true, sectionJoinery: true, cassetteTrays: true, boardTrays: true, foundationParts: true, lighting: true, flashingMitre: true,
}

/** Presety na nowej architekturze (klucz: config.project). */
export const ARCH_PRESETS: Readonly<Record<string, ArchFeatures>> = {
  'GALERIA/163': FULL,
  // kaseton-deska 207 leży na ścianach kasetonowych — to kasetony z dekorem drewna (tace z modelu komponentów), nie pasy
  // na gołej płycie; `boardTrays` nie dotyczy (włączone dublowałoby deskę)
  // E3 (światło) bez zmian: kalibracja E3 pod 163 rozjaśnia antracyt kasetonów 207 (porównanie e6-b-207) — do decyzji
  'GALERIA/207': { ...FULL, boardTrays: false, lighting: false },
}

export function arch(config: Pick<PavilionConfig, 'project'>): ArchFeatures {
  const f = ARCH_PRESETS[config.project] ?? NONE
  // `?e3=0` — diagnostyka: wyłącza światło E3 na presecie (porównanie przed / po w jednym buildzie)
  if (f.lighting && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e3') === '0') return { ...f, lighting: false }
  return f
}
