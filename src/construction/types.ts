import type { Confidence } from '../physical/spec'

/** Systemy konstrukcyjne Dampol. Zaimplementowany: kątownik 50×50×4. Pozostałe — do opisania przez produkcję. */
export type ConstructionSystemId = 'angle_50x50x4' | 'system_2' | 'system_3'

export type Vec3 = [number, number, number]

/** Warstwy modelu — każda jest osobnym systemem, konstrukcja nie zależy od elewacji. */
export type Layer = 'steel' | 'floor' | 'walls' | 'roof' | 'topFrame' | 'flashings' | 'decor' | 'fasteners'

/** Kolejność montażu (exploded view). */
export const STAGES = [
  { stage: 1, label: 'Dolna rama z kątownika' },
  { stage: 2, label: 'Pionowe kątowniki narożne' },
  { stage: 3, label: 'Płyty podłogowe' },
  { stage: 4, label: 'Ściana tylna' },
  { stage: 5, label: 'Ściany boczne' },
  { stage: 6, label: 'Ściana przednia' },
  { stage: 7, label: 'Dach' },
  { stage: 8, label: 'Górna rama' },
  { stage: 9, label: 'Obróbki' },
  { stage: 10, label: 'Elewacja / dekor' },
] as const

export type Stage = (typeof STAGES)[number]['stage']

/**
 * Bryła elementu w układzie „szyna” (run): punkt startowy, kierunek biegu `axis`, dwa kierunki przekroju `u`, `v`.
 * Przekrój to wielokąt [u, v] w metrach (z otworami), wyciągnięty wzdłuż `axis` na `length`.
 */
export type RunGeometry = {
  start: Vec3
  axis: Vec3
  u: Vec3
  v: Vec3
  length: number
  section: Array<[number, number]>
  holes?: Array<Array<[number, number]>>
}

export type MaterialKind = 'steel' | 'sheetOuter' | 'sheetInner' | 'pirCore' | 'flashing' | 'cassette' | 'glass' | 'frame' | 'screw' | 'floorFinish'

export type Part = {
  id: string
  name: string
  layer: Layer
  stage: Stage
  geometry: RunGeometry
  material: MaterialKind
  color: string
  /** kierunek rozsunięcia w exploded view (jednostkowy × odległość) */
  explode: Vec3
  confidence: Confidence
}

/** Wymiar wyliczony z konstrukcji (nie wpisany ręcznie). */
export type DerivedDimension = {
  key: string
  label: string
  valueMm: number
  formula: string
  confidence: Confidence
  /** porównanie z danymi produkcji, jeśli istnieją */
  check?: { expected: string; ok: boolean }
}

export type ConstructionModel = {
  system: ConstructionSystemId
  parts: Part[]
  derived: DerivedDimension[]
  /** kluczowe poziomy [m] do przekrojów i etykiet */
  levels: Record<string, number>
}

/** Wykończenie: goły PIR (obróbka „półtorówka” 15 mm), deska/dekor (obróbka „na kwadraty” 25 mm), kasetony (obróbka płaska techniczna). */
export type FinishVariant = 'bare' | 'squares' | 'cassette'
