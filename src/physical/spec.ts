/**
 * Jedno źródło wartości fizycznych modelu pawilonu Dampol — w milimetrach, ze źródłem i pewnością.
 *
 * Hierarchia źródeł (od najważniejszego):
 *   1 zdjęcie gotowego pawilonu · 2 film z produkcji/realizacji · 3 pomiar na zdjęciu ze znaną skalą ·
 *   4 katalog producenta · 5 dane produkcyjne · 6 rysunek techniczny · 7 szkic/stara wizualizacja · 8 założenie.
 * Przy sprzeczności wygrywa źródło wyżej w hierarchii; sprzeczność jest zapisana w `conflict`.
 *
 * Pomiary zdjęć: reference/gallery/POMIARY.md (rektyfikacja fasady, skala z wysokości okładziny 2,82 m).
 * Rejestr wszystkich wartości i niewiadomych: reference/VALIDATION.md (generowany z tego pliku: `npm run validation`).
 *
 * Ten plik nie importuje three/react — można go czytać skryptem.
 */

export type Confidence = 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
export type SourceRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Status = 'OK' | 'CHANGED' | 'OPEN'

export type PhysicalParam = {
  /** element modelu (czytelna nazwa) */
  element: string
  /** wartość w mm (dla kątów: stopnie, dla liczb bezwymiarowych: '-') */
  value: number
  unit?: 'mm' | 'deg' | '-'
  /** najwyższe źródło, z którego pochodzi wartość */
  rank: SourceRank
  source: string
  confidence: Confidence
  status: Status
  /** wartość przed walidacją (gdy zmieniona) */
  previous?: number
  /** rozbieżność między źródłami */
  conflict?: string
  /** co nadal trzeba zmierzyć / potwierdzić */
  todo?: string
}

const P = (p: PhysicalParam) => p

/** Wymiary fizyczne. Odczyt w metrach: `m(PHYS.cassette.gap)`. */
export const PHYS = {
  envelope: {
    claddingHeight: P({
      element: 'Wysokość zewnętrzna okładziny (attyka płaska)', value: 2820, rank: 6,
      source: 'Projekty 722/08/26 i in. (2,82 m); spójne z proporcją zdjęcia 11: L/H = 2,45 → L = 6,92 m ≈ pawilon 7 × 3',
      confidence: 'HIGH', status: 'OK', todo: 'Potwierdzić miarą taśmową na gotowym pawilonie (jedyna skala wszystkich pomiarów zdjęć).',
    }),
  },
  panel: {
    wallModule: P({
      element: 'Moduł płyty ściennej (rozstaw styków)', value: 1000, rank: 2,
      source: 'Film WA0018/WA0019: styki ≈ 1,0 m; WA0017: 0,97–1,0 m przy typowym FOV telefonu',
      confidence: 'MEDIUM', status: 'OK',
      conflict: 'Katalog Paneltech PW PIR-S: standard 1130 mm (opcjonalnie 1000 / 1050). Film wskazuje 1000 — przyjęto film (źródło wyższe).',
      todo: 'Potwierdzić zamówieniem/WZ płyt (1000 czy 1050).',
    }),
    roofModule: P({
      element: 'Moduł płyty dachowej', value: 1050, rank: 5, source: 'Standard zakupowy konfiguratora (dotychczasowe zakupy)',
      confidence: 'MEDIUM', status: 'OK', todo: 'Niewidoczny na zdjęciach (attyka) — potwierdzić zamówieniem.',
    }),
    jointWidth: P({
      element: 'Widoczny styk płyt (zamek)', value: 10, rank: 2, source: 'Film WA0017/WA0019: cienka ciemna linia',
      confidence: 'LOW', status: 'OK', todo: 'Zmierzyć szczelinę zamka z bliska.',
    }),
  },
  cassette: {
    gap: P({
      element: 'Fuga między kasetonami', value: 15, rank: 3,
      source: 'Zdjęcie 11 (rektyfikacja, 5 mm/px): 15 mm; zdjęcie 03: 12–18 mm',
      confidence: 'VERIFIED', status: 'OK',
    }),
    bodyBandHeight: P({
      element: 'Wysokość pasa kasetonu poziomego (korpus)', value: 240, rank: 3,
      source: 'Zdjęcie 11: 9 pasów, średnio 242 mm (234–254); zdjęcie 03: 232 mm',
      confidence: 'HIGH', status: 'CHANGED', previous: 300,
      conflict: 'Zdjęcie 09 (inna realizacja): kasetony korpusu ≈ 550 mm — inny wariant elewacji, nie domyślny.',
    }),
    atticRowHeight: P({
      element: 'Wysokość rzędu kasetonu attyki (2 rzędy)', value: 330, rank: 3,
      source: 'Zdjęcie 11: 2 × 320 mm; zdjęcie 03: 2 × 335 mm',
      confidence: 'HIGH', status: 'CHANGED', previous: 315,
      conflict: 'Zdjęcie 09: attyka 1 rząd ≈ 650 mm — inny wariant.',
    }),
    atticModuleTarget: P({
      element: 'Docelowa szerokość kasetonu attyki (długość dzielona na równe moduły)', value: 1100, rank: 3,
      source: 'Zdjęcie 03: 6 równych modułów ≈ 1,10 m; zdjęcie 11: 9 modułów ≈ 0,77 m. Łączenia obu rzędów w jednej linii (bez mijanki)',
      confidence: 'HIGH', status: 'CHANGED', previous: 1200,
      conflict: 'Model miał mijankę co 600 mm — żadne zdjęcie jej nie pokazuje.',
    }),
    thickness: P({
      element: 'Grubość kasetonu', value: 30, rank: 8, source: 'Założenie (nie widać na zdjęciach frontalnych)',
      confidence: 'UNKNOWN', status: 'OPEN', todo: 'Zdjęcie narożnika z boku / karta kasetonu.',
    }),
    offsetFromPanel: P({
      element: 'Odsunięcie lica kasetonu od lica płyty (podkonstrukcja)', value: 75, rank: 8, source: 'Założenie',
      confidence: 'UNKNOWN', status: 'OPEN', todo: 'Przekrój/rysunek podkonstrukcji Dampol.',
    }),
    cornerWrap: P({
      element: 'Zawinięcie kasetonu narożnego L (na każdą ścianę)', value: 150, rank: 8, source: 'Założenie; zdjęcia 19–21 pokazują zawinięcie bez listwy',
      confidence: 'LOW', status: 'OPEN', todo: 'Zmierzyć na zdjęciu narożnika ze skalą.',
    }),
  },
  lamella: {
    pitch: P({
      element: 'Rozstaw lameli pionowych', value: 82, rank: 3,
      source: 'Zdjęcie 03 (drewnopodobne): 28 lameli, 82 ± 2 mm; zdjęcie 11 (aluminiowe): 80,6 mm',
      confidence: 'VERIFIED', status: 'CHANGED', previous: 72,
      conflict: 'Model galerii-03 miał 58 mm (39 lameli zamiast 28). Zdjęcie 09 (inny produkt): ≈ 150 mm — wariant szeroki.',
    }),
    face: P({
      element: 'Szerokość czoła lameli', value: 45, rank: 3,
      source: 'Zdjęcie 03: jasne czoło 45–50 mm; zdjęcie 11 (alu): 40 mm',
      confidence: 'MEDIUM', status: 'CHANGED', previous: 40,
    }),
    depth: P({
      element: 'Głębokość lameli', value: 40, rank: 8, source: 'Założenie — niewidoczna na zdjęciach frontalnych',
      confidence: 'UNKNOWN', status: 'OPEN', previous: 52, todo: 'Zdjęcie z boku pola lameli / karta produktu.',
    }),
    widePitch: P({
      element: 'Rozstaw lameli — wariant szeroki', value: 150, rank: 3, source: 'Zdjęcie 09: 0,053 H ≈ 150 mm (19 szczelin)',
      confidence: 'MEDIUM', status: 'OK',
    }),
  },
  board: {
    height: P({
      element: 'Deska elewacyjna pozioma — wysokość', value: 140, rank: 2, source: 'Film WA0016: 0,13–0,15 m',
      confidence: 'MEDIUM', status: 'OK',
    }),
    gap: P({
      element: 'Deska — szczelina cieniowa', value: 12, rank: 2, source: 'Film WA0016 (ocena wizualna)',
      confidence: 'LOW', status: 'OK',
    }),
  },
  joinery: {
    fixFrameFace: P({
      element: 'Widoczna szerokość ramy FIX (ALU)', value: 62, rank: 3,
      source: 'Zdjęcie 11: 55–75 mm (bok 70, góra 70, prawa 50 + cień ościeża)',
      confidence: 'MEDIUM', status: 'OK', todo: 'System profili (Aluprof/Ponzio?) — karta przekroju.',
    }),
    doorSashFace: P({
      element: 'Widoczne skrzydło drzwi (ponad ościeżnicę)', value: 45, rank: 3,
      source: 'Zdjęcie 11: ościeżnica + skrzydło 95 mm (bok), 125 mm (góra)',
      confidence: 'MEDIUM', status: 'CHANGED', previous: 55,
    }),
    frameDepth: P({
      element: 'Głębokość profilu ramy', value: 70, rank: 8, source: 'Założenie (typowe systemy ALU 60–75 mm)',
      confidence: 'LOW', status: 'OPEN', todo: 'Karta systemu profili.',
    }),
    glazingTop: P({
      element: 'Góra ramy przeszklenia nad dołem okładziny', value: 2110, rank: 3,
      source: 'Zdjęcie 03: 2,11 m; zdjęcie 11: 2,17 m', confidence: 'HIGH', status: 'OK',
    }),
  },
  base: {
    groundGap: P({
      element: 'Prześwit pod ramą (domyślny)', value: 60, rank: 1,
      source: 'Zdjęcia 03 i 11: ≈ 30 mm; film WA0019: 50–100 mm; zdjęcie 09: widoczny cokół ≈ 150 mm',
      confidence: 'MEDIUM', status: 'CHANGED', previous: 120,
      conflict: 'Zależy od montażu (podkłady/bloczki). Wysokie bloczki 120 mm z modelu nie występują na zdjęciach gotowych pawilonów.',
    }),
    bottomRail: P({
      element: 'Widoczny rygiel dolny (goły PIR)', value: 140, rank: 2,
      source: 'Film WA0017: 4,8% H ≈ 135 mm; WA0016: 0,15 m', confidence: 'MEDIUM', status: 'CHANGED', previous: 150,
    }),
    crownBand: P({
      element: 'Obróbka korony / rygiel górny (goły PIR)', value: 215, rank: 2,
      source: 'Film WA0017: 7,2–7,7% H ≈ 200–220 mm; WA0019: 200–250 mm', confidence: 'MEDIUM', status: 'CHANGED', previous: 230,
    }),
  },
  color: {
    ral7016: P({
      element: 'RAL 7016 (sRGB #383E42)', value: 7016, unit: '-', rank: 4, source: 'Wzornik RAL (sRGB 56,62,66)',
      confidence: 'VERIFIED', status: 'OK',
    }),
  },
} as const

/** Parametry renderingu — nie są wymiarami fizycznymi (strojenie obrazu). */
export const RENDER = {
  metalRoughness: { value: 0.5, note: 'Blacha powlekana poliester mat — strojenie wizualne' },
  metalMetalness: { value: 0.38, note: 'Powłoka organiczna na stali — strojenie wizualne' },
  glassMetalness: { value: 0.82, note: 'Przybliżenie szkła niskoemisyjnego (odbicie) zgodne w rasteryzacji i path tracerze' },
  cassetteBevelMm: { value: 3, note: 'Zaokrąglenie krawędzi kasetonu w renderze' },
} as const

/** RAL 7016 w sRGB — kolor elewacji i ram stolarki na zdjęciach realizacji (03, 09, 11). */
export const RAL_7016_HEX = '#383e42'

/** mm → m */
export const m = (p: { value: number }) => p.value / 1000
