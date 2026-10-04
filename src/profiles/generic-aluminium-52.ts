import { PHYS } from '../physical/spec'

/**
 * GENERIC-ALUMINIUM-52 — jedyne miejsce z wymiarami profili stolarki aluminiowej (proof of concept, preset galeria-163).
 *
 * To NIE jest przekrój producenta. Produkcja podaje system Ponzio PE52 (ościeżnica 52 mm), ale nie mamy karty przekrojów,
 * więc przekroje są uogólnione: widoczne szerokości z pomiaru zdjęć (spec.ts), reszta = ASSUMPTION (typowe wartości systemów
 * aluminiowych 50–60 mm). Po otrzymaniu DXF / karty PE52 podmieniamy tylko ten plik.
 *
 * Układ przekroju (wszystkie profile): u — w poprzek lica, od zewnętrznej krawędzi profilu (0) w stronę światła otworu;
 * v — w głąb, od płaszczyzny tylnej (wnętrze, 0) do lica zewnętrznego. Wymiary w mm.
 */
export const GENERIC_ALU_52 = {
  id: 'generic-aluminium-52',
  confidence: 'ASSUMPTION' as const,

  /** ościeżnica FIX: widoczne lico (zdjęcie 11: 55–75 mm), głębokość PE52 */
  frame: {
    face: PHYS.joinery.fixFrameFace.value, // 62 — MEDIUM (zdjęcie 11)
    depth: PHYS.joinery.frameDepth.value, // 52 — HIGH (produkcja: PE52)
    /** zewnętrzna część lica (pełna głębokość) — dalej stopień do przylgi; ASSUMPTION */
    outerFace: 34,
    /** stopień lica: przylga cofnięta względem zewnętrznej części; ASSUMPTION */
    step: 4,
  },

  /** ościeżnica drzwi (bez szyby): ościeżnica + szczelina + skrzydło = 95–99 mm z boku (zdjęcie 11) */
  doorFrame: {
    face: 50, // ASSUMPTION (podział 95 mm ze zdjęcia 11)
    depth: PHYS.joinery.frameDepth.value,
    outerFace: 30,
    step: 4,
    /** przylga skrzydła (listwa oporowa po stronie wnętrza) */
    stopWidth: 14,
    stopDepth: 4,
  },

  /** skrzydło drzwi: lico boków (zdjęcie 11), górą szersze (125 mm razem z ościeżnicą), cokół wysoki */
  sash: {
    face: PHYS.joinery.doorSashFace.value, // 45 — MEDIUM (zdjęcie 11)
    headFace: 70, // ASSUMPTION: 125 − 50 − 4 + ~ (zdjęcie 11, góra)
    bottomFace: 90, // ASSUMPTION: cokół skrzydła (zdjęcia 11, 12)
    depth: 52, // ASSUMPTION (PE52: skrzydło 52–60 mm)
    outerFace: 24,
    step: 3,
    /** szczelina obwodowa ościeżnica–skrzydło (widoczna ciemna linia) */
    gap: 4,
    /** szczelina nad progiem */
    bottomGap: 6,
  },

  /** słupek / ślemię FIX (wspólny profil, szklony z obu stron): zdjęcia 11, 207 — 70–90 mm */
  mullion: {
    face: 76, // ASSUMPTION
    depth: PHYS.joinery.frameDepth.value,
    step: 4,
  },

  /** pakiet szybowy 4/16/4 i jego osadzenie (wspólne dla ościeżnicy, skrzydła i słupka) */
  glazing: {
    /** grubość pakietu */
    unit: 24,
    /** wejście szyby za linię widoczności */
    bite: 13,
    /** głębokość wrębu od linii widoczności do dna (luz na podkładki: wrąb − wejście = 5 mm) */
    rebate: 18,
    /** listwa przyszybowa (od wnętrza): głębokość */
    beadDepth: 11,
    /** uszczelki EPDM: grubość, szerokość, wysunięcie poza linię widoczności (czarna linia przy szybie) */
    gasketThickness: 3,
    gasketWidth: 8,
    gasketReveal: 1,
    /** przylga zewnętrzna (część profilu przed szybą) */
    lipDepth: 7,
  },

  /** próg drzwi niski aluminiowy */
  threshold: {
    height: 20, // ASSUMPTION
    back: 6, // za płaszczyzną tylną ościeżnicy
    nose: 14, // wysunięcie przed lico ościeżnicy
    noseHeight: 5,
  },

  /** parapet zewnętrzny (w bibliotece; galeria-163 nie ma parapetu na zdjęciu) */
  sill: {
    projection: 40, // ASSUMPTION
    thickness: 1.5,
    drip: 12,
  },

  /** okucia (wymiary widoczne, nie modelujemy mechanizmu) — ASSUMPTION ze zdjęć 11, 163 */
  hardware: {
    hinge: { width: 18, height: 70, depth: 16, positions: [0.2, 1.0, 1.8] },
    handle: { height: 1050, roseWidth: 26, roseHeight: 200, roseDepth: 8, lever: 120, leverSection: 16, neck: 30, offsetFromEdge: 0.5 },
  },

  /** osadzenie: lico ościeżnicy względem lica zewnętrznego płyty ściennej */
  install: { proud: 1 },
} as const

export type GenericAlu52 = typeof GENERIC_ALU_52
