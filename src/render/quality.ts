import { createContext, useContext } from 'react'

/**
 * TRYBY JAKOŚCI (E5). LOW — słabsze telefony; MEDIUM — domyślny konfigurator; HIGH / ULTRA — mocniejsze GPU (więcej detalu,
 * lepsze cienie i AO). Wartości to kompromis wydajność / wygląd — strojenie, nie wielkości fizyczne.
 */
export type QualityTier = 'low' | 'medium' | 'high' | 'ultra'
export type QualityMode = QualityTier | 'auto'

export type QualitySettings = {
  tier: QualityTier
  /** zakres DPR płótna */
  dpr: [number, number]
  /** MSAA w EffectComposer (0 = wyłączone) */
  msaa: number
  /** rozmiar mapy cienia słońca */
  shadowMap: number
  /** AO ekranowe: wyłączone / połowa rozdzielczości / pełne */
  ao: 'off' | 'half' | 'full'
  aoQuality: 'performance' | 'low' | 'medium' | 'high' | 'ultra'
  /** szkło z transmisją (dodatkowy przebieg renderu sceny) — bez niej: odbicie + przezroczystość */
  glassTransmission: boolean
  /** maksymalny poziom detalu części (LOD 0 — bryła, 1 — okucia, 2 — uszczelki, listwy, wkręty) */
  maxLod: 0 | 1 | 2
  /** SMAA na końcu łańcucha */
  smaa: boolean
}

export const QUALITY: Record<QualityTier, QualitySettings> = {
  low: { tier: 'low', dpr: [1, 1], msaa: 0, shadowMap: 1024, ao: 'off', aoQuality: 'performance', glassTransmission: false, maxLod: 0, smaa: true },
  medium: { tier: 'medium', dpr: [1, 1.5], msaa: 0, shadowMap: 2048, ao: 'half', aoQuality: 'medium', glassTransmission: true, maxLod: 1, smaa: true },
  high: { tier: 'high', dpr: [1, 1.75], msaa: 4, shadowMap: 4096, ao: 'full', aoQuality: 'high', glassTransmission: true, maxLod: 2, smaa: true },
  ultra: { tier: 'ultra', dpr: [1, 2], msaa: 8, shadowMap: 4096, ao: 'full', aoQuality: 'ultra', glassTransmission: true, maxLod: 2, smaa: true },
}

export const TIERS: QualityTier[] = ['low', 'medium', 'high', 'ultra']

/**
 * Tryb startowy „auto” z parametrów urządzenia (heurystyka — bez pomiaru GPU; PerformanceMonitor obniża tryb przy spadku FPS).
 * Dotychczasowe ustawienia sceny odpowiadają HIGH (DPR 1–1,75, MSAA 4, cień 4096, N8AO pełne).
 */
export function autoTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'high'
  const nav = navigator as Navigator & { deviceMemory?: number }
  const cores = nav.hardwareConcurrency ?? 4
  const mem = nav.deviceMemory ?? 8
  const mobile = /Android|iPhone|iPad|Mobile/i.test(nav.userAgent)
  if (mobile && (cores <= 4 || mem <= 3)) return 'low'
  if (mobile) return 'medium'
  if (cores >= 8 && mem >= 8) return 'high'
  return 'medium'
}

/** `?q=low|medium|high|ultra|auto` (testy, linki) → ustawienie zapisane przez widza → auto. */
export function initialQualityMode(): QualityMode {
  if (typeof window === 'undefined') return 'auto'
  const q = new URLSearchParams(window.location.search).get('q')
  if (q === 'auto' || (TIERS as string[]).includes(q ?? '')) return q as QualityMode
  try {
    const saved = window.localStorage.getItem('dampol3d.quality')
    if (saved === 'auto' || (TIERS as string[]).includes(saved ?? '')) return saved as QualityMode
  } catch {
    // brak dostępu do pamięci przeglądarki — tryb auto
  }
  return 'auto'
}

export function saveQualityMode(mode: QualityMode) {
  try {
    window.localStorage.setItem('dampol3d.quality', mode)
  } catch {
    // ignoruj — ustawienie tylko na tę sesję
  }
}

export const QualityContext = createContext<QualitySettings>(QUALITY.high)
export const useQuality = () => useContext(QualityContext)

/**
 * LOD części względem odległości kamery [m] z histerezą: poziom pokazany przy zbliżeniu poniżej `show`, chowany powyżej `hide`.
 * LOD 0 zawsze; 1 — do ~20 m (normalny kadr pawilonu); 2 — zbliżenie (~6 m).
 */
export const LOD_DISTANCE: Record<1 | 2, { show: number; hide: number }> = {
  1: { show: 20, hide: 23 },
  2: { show: 6, hide: 7 },
}

/** Szkło bez transmisji (LOW): przyciemniona przezroczystość + odbicie otoczenia — bez dodatkowego przebiegu renderu. */
export const CHEAP_GLASS = { color: '#2b3236', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.55, specularIntensity: 2.5, depthWrite: false } as const
