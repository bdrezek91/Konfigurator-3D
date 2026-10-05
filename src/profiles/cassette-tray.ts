import { PHYS } from '../physical/spec'

/**
 * KASETON — TACA: jedyne miejsce z wymiarami przekroju tacy (E2, PoC galeria-207). Układ kasetonów (moduły, fugi, narożniki)
 * pozostaje w components.ts (KASETONY FINAL) — tu tylko kształt pojedynczej tacy w obrysie dotychczasowego kasetonu.
 * Układ przekroju: u — od krawędzi tacy do środka, v — od tyłu (lico płyty, 0) do lica kasetonu. Wymiary w mm.
 */
export const CASSETTE_TRAY = {
  /** głębokość tacy (zagięcie) — UNKNOWN w spec.ts (25 mm, ASSUMPTION) */
  depth: PHYS.cassette.thickness.value,
  /** blacha 0,5 mm (VERIFIED); w renderze 1,0 mm — cieńsza daje migotanie cieni na krawędziach (ASSUMPTION renderu) */
  sheet: 1.0,
  /** promień gięcia krawędzi lica — ASSUMPTION (blacha 0,5 mm na krawędziarce: 1–2 mm) */
  bendRadius: 1.5,
  /** segmenty łuku gięcia */
  bendSegments: 3,
  /** obrzeże montażowe (przykręcane do płyty) — ASSUMPTION */
  flange: 8,
  /**
   * Obrzeże w fudze (na zewnątrz tacy, widoczne z wkrętami — opis produkcji w spec.ts) czy schowane (do środka).
   * Domyślnie schowane: fugi są zamrożone (KASETONY FINAL) — wariant „out” tylko do porównania i decyzji.
   */
  flangeOut: false,
  /** wkręty w obrzeżu (tylko przy flangeOut): rozstaw, łeb — ASSUMPTION */
  screwSpacing: 400,
  screwHead: 8,
  screwHeight: 3,
  /** cień w zagłębieniu fugi: kolor boku tacy przy płycie (1 = bez przyciemnienia) — strojenie wizualne */
  shadeMin: 0.7,
} as const
