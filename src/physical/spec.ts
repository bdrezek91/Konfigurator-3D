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
      element: 'Moduł płyty ściennej (rozstaw styków)', value: 1000, rank: 5,
      source: 'Produkcja Dampol (2026-10-02): płyty w module metrowym, ściana przednia 6 × 3 = 6 płyt; filmy WA0017/18/19: styki ≈ 1,0 m',
      confidence: 'VERIFIED', status: 'OK',
      conflict: 'Katalog Paneltech PW PIR-S: standard 1130 mm (opcjonalnie 1000 / 1050) — Dampol zamawia 1000.',
    }),
    roofModule: P({
      element: 'Moduł płyty dachowej', value: 1050, rank: 5, source: 'Standard zakupowy konfiguratora (dotychczasowe zakupy)',
      confidence: 'MEDIUM', status: 'OK', todo: 'Niewidoczny na zdjęciach (attyka) — potwierdzić zamówieniem.',
    }),
    jointWidth: P({
      element: 'Widoczny styk płyt (zamek) — ciemna linia na licu co moduł', value: 6, rank: 3,
      source: 'Pomiar zdjęcia z produkcji (zdjecie-produkcja-naroznik-slup-nad-dachem.jpg): styki co 742 px = 1000 mm → 1,35 mm/px, linia 4–7 px = 5–9 mm; filmy WA0017/WA0019: cienka ciemna linia',
      confidence: 'MEDIUM', status: 'CHANGED', previous: 10,
    }),
  },
  cassette: {
    gap: P({
      element: 'Fuga między kasetonami (w fudze widać wygiętą blachę obrzeża z wkrętami)', value: 20, rank: 5,
      source: 'Produkcja Dampol (2026-10-03): szczeliny 20 mm między kasetonami. Zdjęcia 11/03: ciemny pas 12–18 mm',
      confidence: 'VERIFIED', status: 'CHANGED', previous: 15,
      conflict: 'Zdjęcie mierzy cień, nie prześwit — jasne obrzeże w fudze zwęża ciemny pas; 20 mm mieści się w błędzie pomiaru (±5 mm/px). Przyjęto 20 mm.',
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
    sheet: P({
      element: 'Kaseton — blacha stalowa powlekana 0,5 mm, RAL 7016 mat', value: 0.5, rank: 5,
      source: 'Produkcja Dampol (2026-10-03)', confidence: 'VERIFIED', status: 'OK',
    }),
    mounting: P({
      element: 'Kaseton — mocowanie: wkręty przez obrzeże bezpośrednio do płyty warstwowej (bez podkonstrukcji)', value: 0, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-03)', confidence: 'VERIFIED', status: 'CHANGED',
    }),
    thickness: P({
      element: 'Kaseton — głębokość tacy (zagięcie krawędzi)', value: 25, rank: 8, source: 'Założenie — nie podana przez produkcję, niewidoczna na zdjęciach frontalnych',
      confidence: 'UNKNOWN', status: 'OPEN', previous: 30, todo: 'Wymiar zagięcia kasetonu (mm).',
    }),
    offsetFromPanel: P({
      element: 'Kaseton — lico od lica płyty (= głębokość tacy; kaseton leży na płycie)', value: 25, rank: 5,
      source: 'Wyliczone: mocowanie bezpośrednio do płyty (produkcja) + głębokość tacy (założenie)', confidence: 'LOW', status: 'CHANGED', previous: 75,
    }),
    cornerWrap: P({
      element: 'Zawinięcie kasetonu narożnego L (na każdą ścianę) — przy pełnej elewacji kasetonowej na obu ścianach', value: 150, rank: 8,
      source: 'Założenie; galeria: zawinięcie widoczne przy pełnej elewacji kasetonowej (028, 110, 111; dawne 19–21)',
      confidence: 'LOW', status: 'OPEN', todo: 'Zmierzyć szerokość zawinięcia na zdjęciu narożnika ze skalą.',
      conflict: 'Goła płyta z pasami kaseton-deska (zdjęcie 163 = zdjęcie od produkcji 2026-10-04): róg przykryty obróbką narożną, nie kasetonem L — model rozróżnia oba przypadki.',
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
      element: 'Lamela — od czoła do ściany 30 mm; na przemian profil „kapelusz” _|‾|_ (czoło) i U (dno na ścianie = rowek), na zakładkę', value: 30, rank: 5,
      source: 'Produkcja Dampol (2026-10-03)', confidence: 'VERIFIED', status: 'CHANGED', previous: 52,
    }),
    sheet: P({
      element: 'Lamela — blacha 0,4 mm z nadrukiem winchester', value: 0.4, rank: 5, source: 'Produkcja Dampol (2026-10-03)', confidence: 'VERIFIED', status: 'OK',
    }),
    widePitch: P({
      element: 'Rozstaw lameli — wariant szeroki', value: 150, rank: 3, source: 'Zdjęcie 09: 0,053 H ≈ 150 mm (19 szczelin)',
      confidence: 'MEDIUM', status: 'OK',
    }),
    fullWallPitch: P({
      element: 'Lamele na całej ścianie (czarne/białe, galeria 064–065) — rozstaw', value: 80, rank: 3,
      source: 'Pomiar zdjęcia galerii 065 (frontalne): 104 okresy na szerokości, skala z wysokości → 78–80 mm; zgodne z rozstawem lameli 82 mm (zdjęcie 03) — ten sam system lameli',
      confidence: 'MEDIUM', status: 'OK',
    }),
  },
  standingSeam: {
    module: P({
      element: 'Blacha na rąbek (elewacja pionowa) — szerokość panelu między rąbkami', value: 310, rank: 3,
      source: 'Pomiar zdjęcia galerii 044 (frontalne): wzór co 97–98 px = 2 panele; skala z wysokości pawilonu i drzwi (6,1–6,5 mm/px) → 300–315 mm. Produkcja: profil nieznany',
      confidence: 'MEDIUM', status: 'CHANGED', previous: 600, todo: 'Producent i profil blachy na rąbek.',
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
      source: 'Zdjęcie 11: 55–75 mm (bok 70, góra 70, prawa 50 + cień ościeża). Produkcja nie zna wymiaru',
      confidence: 'MEDIUM', status: 'OK', todo: 'Karta przekrojów Ponzio PE52 (widok ościeżnicy/skrzydła).',
    }),
    doorSashFace: P({
      element: 'Widoczne skrzydło drzwi (ponad ościeżnicę)', value: 45, rank: 3,
      source: 'Zdjęcie 11: ościeżnica + skrzydło 95 mm (bok), 125 mm (góra)',
      confidence: 'MEDIUM', status: 'CHANGED', previous: 55,
    }),
    frameDepth: P({
      element: 'Głębokość ościeżnicy — Ponzio PE52 (system domyślny)', value: 52, rank: 4,
      source: 'Produkcja Dampol (2026-10-02): profile aluminiowe PE52 albo PE78; PE52: ościeżnica 52 mm, skrzydło 60 mm (opisy systemu u dystrybutorów Ponzio)',
      confidence: 'HIGH', status: 'CHANGED', previous: 70,
      todo: 'Widoczna szerokość ościeżnicy/skrzydła PE52 i PE78 z karty przekrojów (teraz z pomiaru zdjęcia 11).',
    }),
    sashDepthPE52: P({
      element: 'Głębokość skrzydła — Ponzio PE52', value: 60, rank: 4, source: 'Opisy systemu PE52 (dystrybutorzy Ponzio)', confidence: 'HIGH', status: 'OK',
    }),
    frameDepthPE78: P({
      element: 'Głębokość ościeżnicy — Ponzio PE78N (wariant ciepły)', value: 78, rank: 4,
      source: 'Opisy systemu PE78N: drzwi ościeżnica/skrzydło 78/78 mm, okna 78/86 mm', confidence: 'HIGH', status: 'OK',
    }),
    slidingDoorPSK: P({
      element: 'Drzwi przesuwne PSK — typ stolarki (wymiary i układ skrzydeł różne)', value: 1, unit: '-', rank: 5, source: 'Produkcja Dampol (2026-10-02/03)',
      confidence: 'HIGH', status: 'OPEN', todo: 'Dodać typ PSK w edytorze stolarki z parametrami (szerokość, liczba skrzydeł).',
    }),
    pvcWindows: P({
      element: 'Okna PCV — pakiet dwuszybowy standard (bez ciepłej ramki), czasem trzyszybowy', value: 2, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02)', confidence: 'VERIFIED', status: 'OK',
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
  /** SYSTEM 1 — konstrukcja z kątownika równoramiennego 50×50×4 (opis produkcji Dampol + filmy WA0017/18/19). */
  system1: {
    angleLeg: P({
      element: 'Kątownik — długość ramienia', value: 50, rank: 5, source: 'Opis produkcji: kątownik równoramienny 50×50×4',
      confidence: 'VERIFIED', status: 'OK',
    }),
    angleThickness: P({
      element: 'Kątownik — grubość', value: 4, rank: 5, source: 'Opis produkcji: 50×50×4',
      confidence: 'VERIFIED', status: 'OK',
    }),
    angleOrientation: P({
      element: 'Orientacja kątowników (ramiona do środka, piętka na zewnętrznym obrysie)', value: 1, unit: '-', rank: 5,
      source: 'Opis produkcji; film WA0018 (L widoczne od wewnątrz w narożach), WA0017 (słup widoczny z zewnątrz w narożu)',
      confidence: 'HIGH', status: 'OK',
    }),
    outerFrameWidth: P({
      element: 'Zewnętrzny wymiar ramy (pawilon „6 × 3”)', value: 2960, rank: 5,
      source: 'Produkcja Dampol (2026-10-02): rama 6030 × 2960 mm; zgodne z wyliczoną ścianą boczną 2752 mm (produkcja 2740–2760)',
      confidence: 'VERIFIED', status: 'OK',
      conflict: 'Nominał handlowy 3,00 m dałby ścianę boczną 2,792 m — poza zakresem produkcji.',
    }),
    floorModule: P({
      element: 'Szerokość modułowa płyty podłogowej', value: 1000, rank: 5, source: 'Opis produkcji: kilka (np. 3) długich elementów na szerokości ~3 m',
      confidence: 'MEDIUM', status: 'OK', todo: 'Potwierdzić szerokość krycia płyt podłogowych (1000 / 1050 / 1130).',
    }),
    floorScrewLength: P({
      element: 'Mocowanie podłogi do kątownika — długość wkrętu/szpilki', value: 125, rank: 5, source: 'Opis produkcji: 120–125 mm',
      confidence: 'HIGH', status: 'OK', todo: 'Rozstaw mocowań (UNKNOWN).',
    }),
    floorScrewSpacing: P({
      element: 'Mocowanie podłogi — rozstaw', value: 600, rank: 8, source: 'Założenie wizualizacyjne', confidence: 'UNKNOWN', status: 'OPEN',
    }),
    wallScrewSpacing: P({
      element: 'Mocowanie ściany skrajnej do słupa — rozstaw', value: 500, rank: 8, source: 'Założenie wizualizacyjne', confidence: 'UNKNOWN', status: 'OPEN',
    }),
    roofClearance: P({
      element: 'Luz płyty dachowej przy kątowniku (na stronę)', value: 6, rank: 5,
      source: 'Wyliczony z danych produkcji: element dachowy 2,94 m przy ramie 2,96 m → (2,96 − 2·0,004 − 2,94) / 2',
      confidence: 'MEDIUM', status: 'OK', todo: 'Potwierdzić sposób oparcia dachu i kierunek ułożenia.',
    }),
    topFrameOnRoof: P({
      element: 'Górna rama: leży na dachu, dospawana do słupów wystających ponad dach', value: 1, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02): rama leży na dachu (w rogach wyżej — uszczelnienie), słup wystaje ~5 cm pod dospawanie; film WA0019',
      confidence: 'HIGH', status: 'OK',
    }),
    postAboveRoof: P({
      element: 'Wysunięcie słupa ponad płytę dachową', value: 50, rank: 5,
      source: 'Produkcja Dampol (2026-10-02): „jakieś 5 cm”; film WA0019: ≈ 55 mm', confidence: 'HIGH', status: 'OK',
      conflict: 'Zdjęcie z produkcji (zdjecie-produkcja-naroznik-slup-nad-dachem.jpg): słup ≈ 120–150 mm nad dachem — stan przed przycięciem i dospawaniem górnej ramy (potwierdzone przez produkcję 2026-10-03). Docelowo ~50 mm.',
    }),
    wallLockTolerance: P({
      element: 'Ściana przednia/tylna: nadwyżka ponad 6 × 1000 (tolerancja, przejmowana przez ostatnią płytę)', value: 22, rank: 5,
      source: 'Wyliczona: między ramionami słupów 6030 − 2·4 = 6022 mm. Produkcja: 6 płyt w module 1000; ostatnia płyta docinana, gdy się nie mieści (zależnie od złożenia zamków)',
      confidence: 'HIGH', status: 'OK',
    }),
    sideWallPanels: P({
      element: 'Ściana boczna: 3 płyty = 2 × 1000 + 1 docięta na 752 mm', value: 3, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02); wyliczenie 2752 = 2 × 1000 + 752', confidence: 'VERIFIED', status: 'OK',
    }),
    topFrameCornerRaise: P({
      element: 'Górna rama: podniesienie w narożnikach (silikon + wasserstop pod kątownikiem), zakres 3–8 mm', value: 5, rank: 5,
      source: 'Produkcja Dampol (2026-10-03): 3–8 mm „zależy jak ktoś położy”. W geometrii nie podnoszone (wartość zmienna, poniżej skali obrazu)',
      confidence: 'HIGH', status: 'OK',
    }),
    cornerContact: P({
      element: 'Narożnik: blacha płyty skrajnej oparta o jedno ramię słupa, czoło (rdzeń/zamek) dotyka drugiego ramienia', value: 1, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02)', confidence: 'VERIFIED', status: 'OK',
    }),
    crownFlashingFace: P({
      element: 'Pas korony (od góry kątownika do dołu obróbki) = widoczny kątownik 50 + obróbka ≈ 165', value: 215, rank: 2,
      source: 'Film WA0017 (gotowy): pas 200–220 mm; WA0019: obróbka 180 mm + kątownik 55 mm. Produkcja (2026-10-03): kątownik ogólnie widoczny nad obróbką',
      confidence: 'MEDIUM', status: 'CHANGED',
    }),
    flashingOffsetPoltorowka: P({
      element: 'Obróbka korony „półtorówka” (goły PIR) — odsunięcie lica od ściany', value: 15, rank: 5,
      source: 'Produkcja Dampol (2026-10-02): szkic z wymiarem „1,5 cm” (reference/construction/szkic-obrobka-poltorowka-15mm.jpg); zdjęcie 11: daszek ≈ 15–20 mm',
      confidence: 'VERIFIED', status: 'CHANGED',
      conflict: 'Wcześniej jednostka nieznana — rozstrzygnięte: cm.',
    }),
    poltorowkaStep: P({
      element: 'Półtorówka — załamanie do ściany na dole lica (kąt) i kołnierz przykręcany do ściany', value: 45, unit: 'deg', rank: 7,
      source: 'Szkic produkcji (rysunek poglądowy, oznaczony jako generowany przez AI — kształt, nie wymiar)', confidence: 'LOW', status: 'OPEN',
      todo: 'Kąt załamania i długość kołnierza na ścianie.',
    }),
    flashingOffsetSquares: P({
      element: 'Obróbka korony „na kwadraty” — odsunięcie lica od ściany', value: 25, rank: 5,
      source: 'Produkcja Dampol (2026-10-02): szkic „2,5” + opis „kwadrat ma 2,5 cm” (reference/construction/szkic-obrobka-na-kwadraty-25mm.jpg)',
      confidence: 'VERIFIED', status: 'CHANGED',
    }),
    cornerFlashingSide: P({
      element: 'Obróbka narożna — ramię od strony ściany bocznej', value: 250, rank: 5,
      source: 'Produkcja Dampol (2026-10-04): ramiona obróbki narożnej 25 cm; zdjęcie 163 (pionowy pas na narożu)',
      confidence: 'VERIFIED', status: 'CHANGED', previous: 124,
    }),
    cornerFlashingFront: P({
      element: 'Obróbka narożna — ramię od strony ściany przedniej/tylnej', value: 250, rank: 5,
      source: 'Produkcja Dampol (2026-10-04): ramiona obróbki narożnej 25 cm', confidence: 'VERIFIED', status: 'CHANGED', previous: 60,
    }),
    baseFlashingFace: P({
      element: 'Obróbka cokołowa — wysokość lica', value: 140, rank: 2, source: 'Film WA0017: 135–140 mm (kątownik 50 + krawędź podłogi + zakład)',
      confidence: 'MEDIUM', status: 'OK',
    }),
    baseFlashingOffset: P({
      element: 'Obróbka cokołowa — odsunięcie lica od ściany (skośny powrót do ściany, kołnierz przykręcony, owija narożnik)', value: 15, rank: 5,
      source: 'Produkcja Dampol (2026-10-03): „półtora cm ma obróbki kawałek”; kształt ze zdjęcia cokołu w narożniku (zdjecie-cokol-naroznik.jpg)',
      confidence: 'HIGH', status: 'CHANGED', previous: 25,
    }),
    baseFlashingSlope: P({
      element: 'Obróbka cokołowa — kąt skosu powrotu do ściany (od poziomu)', value: 16, unit: 'deg', rank: 3,
      source: 'Wyliczony ze zdjęcia cokołu (2026-10-03): model afiniczny kamery z trzech kierunków naroża (orto-normalność), skala z lica 140 mm; '
        + 'pas skosu 82,9 mm w kolumnie obrazu = 15 mm odsunięcia + wzniesienie ≈ 4,3 mm → atan(4,3 / 15) ≈ 16°. Dwie kolumny pomiarowe dają ten sam wynik (±1 mm)',
      confidence: 'MEDIUM', status: 'OK',
      todo: 'Wynik zależy od lica 140 mm (film, MEDIUM) — potwierdzić z rysunkiem gięcia.',
    }),
    baseFlashingFlange: P({
      element: 'Obróbka cokołowa — kołnierz pionowy na ścianie (przykręcany)', value: 16, rank: 3,
      source: 'Zdjęcie cokołu (2026-10-03): ciemny pas z wkrętami nad skosem, ≈ 15,6 mm w obu kolumnach pomiarowych',
      confidence: 'MEDIUM', status: 'OK',
    }),
    liftingEyeRod: P({
      element: 'Ucho transportowe w narożu górnej ramy — pręt gładki φ16', value: 16, rank: 5,
      source: 'Produkcja Dampol (2026-10-04): „pręty gładkie fi 16, 25 cm, wygięte w U”, dospawane do górnej ramy; zdjęcie gotowego pawilonu (ucha w 4 narożach)',
      confidence: 'VERIFIED', status: 'CHANGED',
    }),
    liftingEyeLength: P({
      element: 'Ucho transportowe — długość pręta przed gięciem (U)', value: 250, rank: 5,
      source: 'Produkcja Dampol (2026-10-04)', confidence: 'VERIFIED', status: 'CHANGED',
    }),
    liftingEyeSpan: P({
      element: 'Ucho transportowe — rozstaw osi ramion U (położenie: przy słupie, ramiona przy wewnętrznym licu ramy)', value: 76, rank: 8,
      source: 'Założenie z proporcji zdjęcia gotowego pawilonu; ramiona = (250 − π·76/2)/2 ≈ 65 mm', confidence: 'LOW', status: 'OPEN',
      todo: 'Rozstaw ramion i miejsce spawania (na słupie / na ramie, w której płaszczyźnie).',
    }),
    crownUnderFrame: P({
      element: 'Obróbka korony zachodzi pod górny kątownik (kątownik leży na dachu/obróbce) — kołnierz poziomy na wierzchu dachu', value: 45, rank: 1,
      source: 'Zdjęcie gotowego pawilonu (2026-10-04) + produkcja: „kątownik jest na dachu/obróbce”, płyta nigdzie niewidoczna — zakryta obróbkami',
      confidence: 'MEDIUM', status: 'CHANGED', todo: 'Szerokość kołnierza pod kątownikiem (przyjęto 45 mm ≈ ramię kątownika).',
    }),
    intermediateFloorSupports: P({
      element: 'Podpory pośrednie podłogi (poprzeczki)', value: 0, unit: '-', rank: 8,
      source: 'Opis produkcji wymienia tylko obwód; brak danych o poprzeczkach', confidence: 'UNKNOWN', status: 'OPEN',
    }),
    squareFlashing: P({
      element: 'Obróbka „na kwadraty” — geometria: przez ostatnie żebro dachu, lico pionowe, powrót poziomy do ściany, kapinos', value: 1, unit: '-', rank: 5,
      source: 'Szkic produkcji (2026-10-02). Stosowana, gdy deska/lamele/dekor wymagają większego odsunięcia',
      confidence: 'HIGH', status: 'CHANGED', todo: 'Długość powrotu i kapinosu (mm).',
    }),
  },
  floor: {
    board: P({
      element: 'Płyta podłogowa na PIR — MFP 12 mm (nie OSB)', value: 12, rank: 5,
      source: 'Produkcja Dampol (2026-10-02/03): płyta MFP, grubość 12 mm', confidence: 'VERIFIED', status: 'OK',
    }),
    covering: P({
      element: 'Wykładzina PVC Tarkett Activia Latur 3 — deska brązowa, 2,0 mm, warstwa użytkowa 0,40 mm', value: 2, rank: 5,
      source: 'Produkcja Dampol (2026-10-03): „Activia Latur 3”; parametry z opisów sklepów (Castorama, ewinyl, it-pol)', confidence: 'VERIFIED', status: 'OK',
      todo: 'Kolor/tekstura w renderze przybliżone (strony z próbką zablokowane) — zdjęcie podłogi z realizacji pomoże.',
    }),
  },
  /** Powłoki i kolory wg produkcji Dampol (2026-10-02). */
  coating: {
    panelOuter: P({
      element: 'Płyta warstwowa — okładzina zewn.: RAL 7016 półmat (lekki połysk), poliester 25 µm', value: 25, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02): „zwykła 25 mikronów”, półmat', confidence: 'VERIFIED', status: 'OK',
    }),
    flashings: P({
      element: 'Obróbki blacharskie — RAL 7016M (faktura, mat)', value: 7016, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02): „wszystkie obróbki w fakturze 7016M”', confidence: 'VERIFIED', status: 'OK',
      todo: 'Faktura (struktura powłoki) — w renderze tylko wyższa chropowatość, bez mapy struktury.',
    }),
    panelInner: P({
      element: 'Okładzina wewnętrzna ścian i dachu — zawsze RAL 9010, gładka (PIR); w płycie styropianowej — linia', value: 9010, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02)', confidence: 'VERIFIED', status: 'OK',
    }),
    black: P({
      element: 'Płyty czarne — RAL 9005 mat, zawsze gładkie (mikrofala możliwa jako opcja)', value: 9005, unit: '-', rank: 5,
      source: 'Produkcja Dampol (2026-10-02)', confidence: 'VERIFIED', status: 'OK',
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
  lamellaGrooveShade: { value: 0.35, note: 'Dno rowka lameli (U, 30 mm w głąb, ≈ 37 mm szer.): przyciemnienie koloru zamiast niedostępnego w czasie rzeczywistym zacienienia (zdjęcie 03: rowek ≈ 0,2 jasności czoła)' },
  panelSemiMattRoughness: { value: 0.33, note: 'Płyta 7016 półmat (lekki połysk) — strojenie wizualne powłoki 25 µm; porównanie ze zdjęciem 163 (odbicie nieba na licu)' },
  flashingMattRoughness: { value: 0.72, note: 'Obróbki 7016M faktura mat — wyższa chropowatość' },
  flashingMattMetalness: { value: 0.22, note: 'Obróbki 7016M — mniej metaliczny połysk niż płyta' },
  blackMattRoughness: { value: 0.7, note: 'Płyta RAL 9005 mat' },
  flashingSheetRenderMm: { value: 1.2, note: 'Grubość blachy obróbki w widoku technicznym (realnie 0,5–0,7 mm — pogrubione dla czytelności)' },
} as const

/** RAL 7016 w sRGB — kolor elewacji i ram stolarki na zdjęciach realizacji (03, 09, 11). */
export const RAL_7016_HEX = '#383e42'
/** RAL 9010 (biały) — okładzina wewnętrzna. */
export const RAL_9010_HEX = '#f1ece1'
/** RAL 9005 (czarny) — płyty czarne mat. */
export const RAL_9005_HEX = '#0e0e10'
export const isRal9005 = (hex: string) => ['#0e0e10', '#121315'].includes(hex.toLowerCase())

/** mm → m */
export const m = (p: { value: number }) => p.value / 1000
