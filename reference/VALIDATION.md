# Rejestr walidacji modelu — wartości, źródła, niewiadome

> Plik generowany: `npm run validation` (źródło: `src/physical/spec.ts`, `src/construction/system1/build.ts`). Nie edytuj ręcznie.

Hierarchia źródeł: 1 zdjęcie gotowego pawilonu · 2 film · 3 pomiar zdjęcia ze skalą · 4 katalog · 5 produkcja · 6 rysunek · 7 szkic · 8 założenie.
Przy sprzeczności wygrywa źródło wyżej; sprzeczność opisana w kolumnie „problem”.

Pewność: VERIFIED 22 · HIGH 16 · MEDIUM 14 · LOW 7 · UNKNOWN 4

## Wartości fizyczne

| element | obecna wartość | źródło | pewność | problem | proponowana wartość | status |
|---|---|---|---|---|---|---|
| `envelope.claddingHeight` Wysokość zewnętrzna okładziny (attyka płaska) | 2820 mm | rysunek: Projekty 722/08/26 i in. (2,82 m); spójne z proporcją zdjęcia 11: L/H = 2,45 → L = 6,92 m ≈ pawilon 7 × 3 | **HIGH** | Potwierdzić miarą taśmową na gotowym pawilonie (jedyna skala wszystkich pomiarów zdjęć). | — | OK |
| `panel.wallModule` Moduł płyty ściennej (rozstaw styków) | 1000 mm | produkcja: Produkcja Dampol (2026-10-02): płyty w module metrowym, ściana przednia 6 × 3 = 6 płyt; filmy WA0017/18/19: styki ≈ 1,0 m | **VERIFIED** | Katalog Paneltech PW PIR-S: standard 1130 mm (opcjonalnie 1000 / 1050) — Dampol zamawia 1000. | — | OK |
| `panel.roofModule` Moduł płyty dachowej | 1050 mm | produkcja: Standard zakupowy konfiguratora (dotychczasowe zakupy) | **MEDIUM** | Niewidoczny na zdjęciach (attyka) — potwierdzić zamówieniem. | — | OK |
| `panel.jointWidth` Widoczny styk płyt (zamek) | 10 mm | film: Film WA0017/WA0019: cienka ciemna linia | **LOW** | Zmierzyć szczelinę zamka z bliska. | — | OK |
| `cassette.gap` Fuga między kasetonami (w fudze widać wygiętą blachę obrzeża z wkrętami) | 20 mm | produkcja: Produkcja Dampol (2026-10-03): szczeliny 20 mm między kasetonami. Zdjęcia 11/03: ciemny pas 12–18 mm | **VERIFIED** | Zdjęcie mierzy cień, nie prześwit — jasne obrzeże w fudze zwęża ciemny pas; 20 mm mieści się w błędzie pomiaru (±5 mm/px). Przyjęto 20 mm. | było 15 → 20 mm | CHANGED |
| `cassette.bodyBandHeight` Wysokość pasa kasetonu poziomego (korpus) | 240 mm | pomiar zdjęcia: Zdjęcie 11: 9 pasów, średnio 242 mm (234–254); zdjęcie 03: 232 mm | **HIGH** | Zdjęcie 09 (inna realizacja): kasetony korpusu ≈ 550 mm — inny wariant elewacji, nie domyślny. | było 300 → 240 mm | CHANGED |
| `cassette.atticRowHeight` Wysokość rzędu kasetonu attyki (2 rzędy) | 330 mm | pomiar zdjęcia: Zdjęcie 11: 2 × 320 mm; zdjęcie 03: 2 × 335 mm | **HIGH** | Zdjęcie 09: attyka 1 rząd ≈ 650 mm — inny wariant. | było 315 → 330 mm | CHANGED |
| `cassette.atticModuleTarget` Docelowa szerokość kasetonu attyki (długość dzielona na równe moduły) | 1100 mm | pomiar zdjęcia: Zdjęcie 03: 6 równych modułów ≈ 1,10 m; zdjęcie 11: 9 modułów ≈ 0,77 m. Łączenia obu rzędów w jednej linii (bez mijanki) | **HIGH** | Model miał mijankę co 600 mm — żadne zdjęcie jej nie pokazuje. | było 1200 → 1100 mm | CHANGED |
| `cassette.sheet` Kaseton — blacha stalowa powlekana 0,5 mm, RAL 7016 mat | 0.5 mm | produkcja: Produkcja Dampol (2026-10-03) | **VERIFIED** | — | — | OK |
| `cassette.mounting` Kaseton — mocowanie: wkręty przez obrzeże bezpośrednio do płyty warstwowej (bez podkonstrukcji) | 0 | produkcja: Produkcja Dampol (2026-10-03) | **VERIFIED** | — | — | CHANGED |
| `cassette.thickness` Kaseton — głębokość tacy (zagięcie krawędzi) | 25 mm | założenie: Założenie — nie podana przez produkcję, niewidoczna na zdjęciach frontalnych | **UNKNOWN** | Wymiar zagięcia kasetonu (mm). | było 30 → 25 mm | OPEN |
| `cassette.offsetFromPanel` Kaseton — lico od lica płyty (= głębokość tacy; kaseton leży na płycie) | 25 mm | produkcja: Wyliczone: mocowanie bezpośrednio do płyty (produkcja) + głębokość tacy (założenie) | **LOW** | — | było 75 → 25 mm | CHANGED |
| `cassette.cornerWrap` Zawinięcie kasetonu narożnego L (na każdą ścianę) | 150 mm | założenie: Założenie; zdjęcia 19–21 pokazują zawinięcie bez listwy | **LOW** | Zmierzyć na zdjęciu narożnika ze skalą. | zmierzyć | OPEN |
| `lamella.pitch` Rozstaw lameli pionowych | 82 mm | pomiar zdjęcia: Zdjęcie 03 (drewnopodobne): 28 lameli, 82 ± 2 mm; zdjęcie 11 (aluminiowe): 80,6 mm | **VERIFIED** | Model galerii-03 miał 58 mm (39 lameli zamiast 28). Zdjęcie 09 (inny produkt): ≈ 150 mm — wariant szeroki. | było 72 → 82 mm | CHANGED |
| `lamella.face` Szerokość czoła lameli | 45 mm | pomiar zdjęcia: Zdjęcie 03: jasne czoło 45–50 mm; zdjęcie 11 (alu): 40 mm | **MEDIUM** | — | było 40 → 45 mm | CHANGED |
| `lamella.depth` Lamela — od czoła do ściany 30 mm; na przemian profil „kapelusz” _\|‾\|_ (czoło) i U (dno na ścianie = rowek), na zakładkę | 30 mm | produkcja: Produkcja Dampol (2026-10-03) | **VERIFIED** | — | było 52 → 30 mm | CHANGED |
| `lamella.sheet` Lamela — blacha 0,4 mm z nadrukiem winchester | 0.4 mm | produkcja: Produkcja Dampol (2026-10-03) | **VERIFIED** | — | — | OK |
| `lamella.widePitch` Rozstaw lameli — wariant szeroki | 150 mm | pomiar zdjęcia: Zdjęcie 09: 0,053 H ≈ 150 mm (19 szczelin) | **MEDIUM** | — | — | OK |
| `board.height` Deska elewacyjna pozioma — wysokość | 140 mm | film: Film WA0016: 0,13–0,15 m | **MEDIUM** | — | — | OK |
| `board.gap` Deska — szczelina cieniowa | 12 mm | film: Film WA0016 (ocena wizualna) | **LOW** | — | — | OK |
| `joinery.fixFrameFace` Widoczna szerokość ramy FIX (ALU) | 62 mm | pomiar zdjęcia: Zdjęcie 11: 55–75 mm (bok 70, góra 70, prawa 50 + cień ościeża). Produkcja nie zna wymiaru | **MEDIUM** | Karta przekrojów Ponzio PE52 (widok ościeżnicy/skrzydła). | — | OK |
| `joinery.doorSashFace` Widoczne skrzydło drzwi (ponad ościeżnicę) | 45 mm | pomiar zdjęcia: Zdjęcie 11: ościeżnica + skrzydło 95 mm (bok), 125 mm (góra) | **MEDIUM** | — | było 55 → 45 mm | CHANGED |
| `joinery.frameDepth` Głębokość ościeżnicy — Ponzio PE52 (system domyślny) | 52 mm | katalog: Produkcja Dampol (2026-10-02): profile aluminiowe PE52 albo PE78; PE52: ościeżnica 52 mm, skrzydło 60 mm (opisy systemu u dystrybutorów Ponzio) | **HIGH** | Widoczna szerokość ościeżnicy/skrzydła PE52 i PE78 z karty przekrojów (teraz z pomiaru zdjęcia 11). | było 70 → 52 mm | CHANGED |
| `joinery.sashDepthPE52` Głębokość skrzydła — Ponzio PE52 | 60 mm | katalog: Opisy systemu PE52 (dystrybutorzy Ponzio) | **HIGH** | — | — | OK |
| `joinery.frameDepthPE78` Głębokość ościeżnicy — Ponzio PE78N (wariant ciepły) | 78 mm | katalog: Opisy systemu PE78N: drzwi ościeżnica/skrzydło 78/78 mm, okna 78/86 mm | **HIGH** | — | — | OK |
| `joinery.slidingDoorPSK` Drzwi przesuwne PSK — typ stolarki (wymiary i układ skrzydeł różne) | 1 | produkcja: Produkcja Dampol (2026-10-02/03) | **HIGH** | Dodać typ PSK w edytorze stolarki z parametrami (szerokość, liczba skrzydeł). | zmierzyć | OPEN |
| `joinery.pvcWindows` Okna PCV — pakiet dwuszybowy standard (bez ciepłej ramki), czasem trzyszybowy | 2 | produkcja: Produkcja Dampol (2026-10-02) | **VERIFIED** | — | — | OK |
| `joinery.glazingTop` Góra ramy przeszklenia nad dołem okładziny | 2110 mm | pomiar zdjęcia: Zdjęcie 03: 2,11 m; zdjęcie 11: 2,17 m | **HIGH** | — | — | OK |
| `base.groundGap` Prześwit pod ramą (domyślny) | 60 mm | zdjęcie: Zdjęcia 03 i 11: ≈ 30 mm; film WA0019: 50–100 mm; zdjęcie 09: widoczny cokół ≈ 150 mm | **MEDIUM** | Zależy od montażu (podkłady/bloczki). Wysokie bloczki 120 mm z modelu nie występują na zdjęciach gotowych pawilonów. | było 120 → 60 mm | CHANGED |
| `base.bottomRail` Widoczny rygiel dolny (goły PIR) | 140 mm | film: Film WA0017: 4,8% H ≈ 135 mm; WA0016: 0,15 m | **MEDIUM** | — | było 150 → 140 mm | CHANGED |
| `base.crownBand` Obróbka korony / rygiel górny (goły PIR) | 215 mm | film: Film WA0017: 7,2–7,7% H ≈ 200–220 mm; WA0019: 200–250 mm | **MEDIUM** | — | było 230 → 215 mm | CHANGED |
| `system1.angleLeg` Kątownik — długość ramienia | 50 mm | produkcja: Opis produkcji: kątownik równoramienny 50×50×4 | **VERIFIED** | — | — | OK |
| `system1.angleThickness` Kątownik — grubość | 4 mm | produkcja: Opis produkcji: 50×50×4 | **VERIFIED** | — | — | OK |
| `system1.angleOrientation` Orientacja kątowników (ramiona do środka, piętka na zewnętrznym obrysie) | 1 | produkcja: Opis produkcji; film WA0018 (L widoczne od wewnątrz w narożach), WA0017 (słup widoczny z zewnątrz w narożu) | **HIGH** | — | — | OK |
| `system1.outerFrameWidth` Zewnętrzny wymiar ramy (pawilon „6 × 3”) | 2960 mm | produkcja: Produkcja Dampol (2026-10-02): rama 6030 × 2960 mm; zgodne z wyliczoną ścianą boczną 2752 mm (produkcja 2740–2760) | **VERIFIED** | Nominał handlowy 3,00 m dałby ścianę boczną 2,792 m — poza zakresem produkcji. | — | OK |
| `system1.floorModule` Szerokość modułowa płyty podłogowej | 1000 mm | produkcja: Opis produkcji: kilka (np. 3) długich elementów na szerokości ~3 m | **MEDIUM** | Potwierdzić szerokość krycia płyt podłogowych (1000 / 1050 / 1130). | — | OK |
| `system1.floorScrewLength` Mocowanie podłogi do kątownika — długość wkrętu/szpilki | 125 mm | produkcja: Opis produkcji: 120–125 mm | **HIGH** | Rozstaw mocowań (UNKNOWN). | — | OK |
| `system1.floorScrewSpacing` Mocowanie podłogi — rozstaw | 600 mm | założenie: Założenie wizualizacyjne | **UNKNOWN** | — | zmierzyć | OPEN |
| `system1.wallScrewSpacing` Mocowanie ściany skrajnej do słupa — rozstaw | 500 mm | założenie: Założenie wizualizacyjne | **UNKNOWN** | — | zmierzyć | OPEN |
| `system1.roofClearance` Luz płyty dachowej przy kątowniku (na stronę) | 6 mm | produkcja: Wyliczony z danych produkcji: element dachowy 2,94 m przy ramie 2,96 m → (2,96 − 2·0,004 − 2,94) / 2 | **MEDIUM** | Potwierdzić sposób oparcia dachu i kierunek ułożenia. | — | OK |
| `system1.topFrameOnRoof` Górna rama: leży na dachu, dospawana do słupów wystających ponad dach | 1 | produkcja: Produkcja Dampol (2026-10-02): rama leży na dachu (w rogach wyżej — uszczelnienie), słup wystaje ~5 cm pod dospawanie; film WA0019 | **HIGH** | — | — | OK |
| `system1.postAboveRoof` Wysunięcie słupa ponad płytę dachową | 50 mm | produkcja: Produkcja Dampol (2026-10-02): „jakieś 5 cm”; film WA0019: ≈ 55 mm | **HIGH** | Zdjęcie z produkcji (zdjecie-produkcja-naroznik-slup-nad-dachem.jpg): słup ≈ 120–150 mm nad dachem — możliwe, że przed przycięciem / dospawaniem górnej ramy. Model zostaje przy 50 mm do potwierdzenia. · Potwierdzić: wysunięcie docelowe (po dospawaniu ramy) vs stan na zdjęciu. | — | OK |
| `system1.wallLockTolerance` Ściana przednia/tylna: nadwyżka ponad 6 × 1000 (tolerancja, przejmowana przez ostatnią płytę) | 22 mm | produkcja: Wyliczona: między ramionami słupów 6030 − 2·4 = 6022 mm. Produkcja: 6 płyt w module 1000; ostatnia płyta docinana, gdy się nie mieści (zależnie od złożenia zamków) | **HIGH** | — | — | OK |
| `system1.sideWallPanels` Ściana boczna: 3 płyty = 2 × 1000 + 1 docięta na 752 mm | 3 | produkcja: Produkcja Dampol (2026-10-02); wyliczenie 2752 = 2 × 1000 + 752 | **VERIFIED** | — | — | OK |
| `system1.topFrameCornerRaise` Górna rama: podniesienie w narożnikach (silikon + wasserstop pod kątownikiem), zakres 3–8 mm | 5 mm | produkcja: Produkcja Dampol (2026-10-03): 3–8 mm „zależy jak ktoś położy”. W geometrii nie podnoszone (wartość zmienna, poniżej skali obrazu) | **HIGH** | — | — | OK |
| `system1.cornerContact` Narożnik: blacha płyty skrajnej oparta o jedno ramię słupa, czoło (rdzeń/zamek) dotyka drugiego ramienia | 1 | produkcja: Produkcja Dampol (2026-10-02) | **VERIFIED** | — | — | OK |
| `system1.crownFlashingFace` Pas korony (od góry kątownika do dołu obróbki) = widoczny kątownik 50 + obróbka ≈ 165 | 215 mm | film: Film WA0017 (gotowy): pas 200–220 mm; WA0019: obróbka 180 mm + kątownik 55 mm. Produkcja (2026-10-03): kątownik ogólnie widoczny nad obróbką | **MEDIUM** | — | — | CHANGED |
| `system1.flashingOffsetPoltorowka` Obróbka korony „półtorówka” (goły PIR) — odsunięcie lica od ściany | 15 mm | produkcja: Produkcja Dampol (2026-10-02): szkic z wymiarem „1,5 cm” (reference/construction/szkic-obrobka-poltorowka-15mm.jpg); zdjęcie 11: daszek ≈ 15–20 mm | **VERIFIED** | Wcześniej jednostka nieznana — rozstrzygnięte: cm. | — | CHANGED |
| `system1.poltorowkaStep` Półtorówka — załamanie do ściany na dole lica (kąt) i kołnierz przykręcany do ściany | 45 deg | szkic: Szkic produkcji (rysunek poglądowy, oznaczony jako generowany przez AI — kształt, nie wymiar) | **LOW** | Kąt załamania i długość kołnierza na ścianie. | zmierzyć | OPEN |
| `system1.flashingOffsetSquares` Obróbka korony „na kwadraty” — odsunięcie lica od ściany | 25 mm | produkcja: Produkcja Dampol (2026-10-02): szkic „2,5” + opis „kwadrat ma 2,5 cm” (reference/construction/szkic-obrobka-na-kwadraty-25mm.jpg) | **VERIFIED** | — | — | CHANGED |
| `system1.cornerFlashingSide` Obróbka narożna — ramię od strony ściany bocznej | 124 mm | film: Wyliczone: musi zakryć czoło ściany przedniej/tylnej (t + grubość ściany = 104 mm) + zakład 20 mm; film WA0017: ciemna listwa narożna | **MEDIUM** | Zmierzyć listwę narożną na gotowym pawilonie. | — | OK |
| `system1.cornerFlashingFront` Obróbka narożna — ramię od strony ściany przedniej/tylnej | 60 mm | film: Wyliczone: zakrywa ramię słupa 50 mm + zakład 10 mm | **LOW** | — | zmierzyć | OPEN |
| `system1.baseFlashingFace` Obróbka cokołowa — wysokość lica | 140 mm | film: Film WA0017: 135–140 mm (kątownik 50 + krawędź podłogi + zakład) | **MEDIUM** | — | — | OK |
| `system1.baseFlashingOffset` Obróbka cokołowa — odsunięcie lica od ściany (skośny powrót do ściany, kołnierz przykręcony, owija narożnik) | 25 mm | pomiar zdjęcia: Zdjęcie cokołu w narożniku (zdjecie-cokol-naroznik.jpg) — szacunek z perspektywy, bez wymiaru odniesienia | **LOW** | Wymiar odsunięcia i kąt skosu z rysunku gięcia (mm). | było 1.2 → 25 mm | CHANGED |
| `system1.intermediateFloorSupports` Podpory pośrednie podłogi (poprzeczki) | 0 | założenie: Opis produkcji wymienia tylko obwód; brak danych o poprzeczkach | **UNKNOWN** | — | zmierzyć | OPEN |
| `system1.squareFlashing` Obróbka „na kwadraty” — geometria: przez ostatnie żebro dachu, lico pionowe, powrót poziomy do ściany, kapinos | 1 | produkcja: Szkic produkcji (2026-10-02). Stosowana, gdy deska/lamele/dekor wymagają większego odsunięcia | **HIGH** | Długość powrotu i kapinosu (mm). | — | CHANGED |
| `floor.board` Płyta podłogowa na PIR — MFP 12 mm (nie OSB) | 12 mm | produkcja: Produkcja Dampol (2026-10-02/03): płyta MFP, grubość 12 mm | **VERIFIED** | — | — | OK |
| `floor.covering` Wykładzina PVC Tarkett Activia Latur 3 — deska brązowa, 2,0 mm, warstwa użytkowa 0,40 mm | 2 mm | produkcja: Produkcja Dampol (2026-10-03): „Activia Latur 3”; parametry z opisów sklepów (Castorama, ewinyl, it-pol) | **VERIFIED** | Kolor/tekstura w renderze przybliżone (strony z próbką zablokowane) — zdjęcie podłogi z realizacji pomoże. | — | OK |
| `coating.panelOuter` Płyta warstwowa — okładzina zewn.: RAL 7016 półmat (lekki połysk), poliester 25 µm | 25 | produkcja: Produkcja Dampol (2026-10-02): „zwykła 25 mikronów”, półmat | **VERIFIED** | — | — | OK |
| `coating.flashings` Obróbki blacharskie — RAL 7016M (faktura, mat) | 7016 | produkcja: Produkcja Dampol (2026-10-02): „wszystkie obróbki w fakturze 7016M” | **VERIFIED** | Faktura (struktura powłoki) — w renderze tylko wyższa chropowatość, bez mapy struktury. | — | OK |
| `coating.panelInner` Okładzina wewnętrzna ścian i dachu — zawsze RAL 9010, gładka (PIR); w płycie styropianowej — linia | 9010 | produkcja: Produkcja Dampol (2026-10-02) | **VERIFIED** | — | — | OK |
| `coating.black` Płyty czarne — RAL 9005 mat, zawsze gładkie (mikrofala możliwa jako opcja) | 9005 | produkcja: Produkcja Dampol (2026-10-02) | **VERIFIED** | — | — | OK |
| `color.ral7016` RAL 7016 (sRGB #383E42) | 7016 | katalog: Wzornik RAL (sRGB 56,62,66) | **VERIFIED** | — | — | OK |

## System 1 (kątownik 50×50×4) — wymiary wyliczone z konstrukcji (preset 722/08/26, rama 6030 × 2960 mm)

| wymiar | wartość | wzór | pewność | kontrola z produkcją |
|---|---|---|---|---|
| Płyta podłogowa — pole wewnątrz ramy | 6022 | L − 2·t (dł.) × W − 2·t = 6022 × 2952 | **HIGH** | — |
| Liczba płyt podłogowych (wzdłuż długości) | 3 | ⌈(W − 2·t) / moduł⌉ = ⌈2952 / 1000⌉, ostatnia 952 mm | **MEDIUM** | — |
| Poziom podłogi (wierzch PIR) nad spodem ramy | 104 | t + grubość podłogi = 4 + 100 | **HIGH** | — |
| Ściana przednia/tylna — długość | 6022 | L − 2·t (między ramionami słupów) | **HIGH** | — |
| Ściana boczna — długość | 2752 | W − 2·t − 2·grubość ściany przód/tył = 2960 − 8 − 200 | **HIGH** | ✓ produkcja: 2740–2760 mm |
| Płyty ściany przedniej | 6 | 6022 mm między słupami = 6 × 1000 + 22 mm tolerancji (ostatnia płyta docinana, gdy się nie mieści) | **VERIFIED** | ✓ produkcja: 6 płyt dla 6 × 3 |
| Płyty ściany bocznej | 3 | 2 × 1000 + docięta 752 mm | **VERIFIED** | ✓ produkcja: 3 płyty, jedna docięta na 752 mm |
| Element dachowy — długość (w poprzek) | 2942 | W − 2·t − 2·luz (luz z danych produkcji) — po skosie | **MEDIUM** | ✓ produkcja: ≈ 2940 mm |
| Liczba płyt dachowych | 6 | ⌈6010 / 1050⌉ | **MEDIUM** | — |
| Słup narożny przedni — długość | 2874 | t + podłoga + ściana przednia + dach + 50 (ponad dach) | **MEDIUM** | — |
| Słup narożny tylny — długość | 2774 | t + podłoga + ściana tylna + dach + 50 | **MEDIUM** | — |
| Wysunięcie słupa ponad dach | 50 | produkcja „~5 cm” pod dospawanie górnej ramy; WA0019 ≈ 55 mm | **HIGH** | — |
| Wysokość zewn. front (spód ramy → góra górnej ramy) | 2874 | konstrukcja; + prześwit 60 mm do gruntu | **MEDIUM** | — |

## Niewiadome Systemu 1 (do potwierdzenia na produkcji)

| klucz | stan | co rozstrzygnie |
|---|---|---|
| topFramePosition | HIGH — leży na dachu, dospawana do słupów wystających ~5 cm (produkcja 2026-10-02, WA0019) | — |
| topFrameCornerRaise | UNKNOWN — w narożnikach rama wyżej o warstwę silikonu + wasserstopu; w modelu 0 | grubość uszczelnienia |
| cornerAngleHeight | HIGH — słup = rama + podłoga + ściana + dach + ~50 mm (produkcja: „jakieś 5 cm” nad dach) | — |
| roofSupportDetail | MEDIUM — dach leży na ścianach, luz 6 mm/stronę z danych 2,94 m | przekrój/rysunek oparcia dachu |
| sideWallCalculatedLength | HIGH — 2752 mm = W − 2·4 − 2·100, zgodne z produkcją 2740–2760 | — |
| flashingOffset | UNKNOWN — „1,5 / 2,5” bez jednostki; przyjęto 15 mm (zdjęcie 11: daszek ≈ 15–20 mm) | rysunek gięcia obróbki |
| squareFlashing („na kwadraty”) | UNKNOWN — brak przykładu na zdjęciach | zdjęcie/rysunek |
| intermediateFloorSupports | UNKNOWN — opis wymienia tylko obwód | potwierdzenie produkcji |
| wallModuleVsFrameLength | ROZSTRZYGNIĘTE — rama 6030 × 2960, 6 płyt × 1000 na froncie, ostatnia płyta docinana gdy się nie mieści; ściana boczna 3 płyty (2 × 1000 + 752) | — |
| cornerContact | VERIFIED — blacha płyty skrajnej o ramię słupa, czoło (rdzeń/zamek) o drugie ramię | — |
| flashingBendDrawing | czeka na rysunek gięcia (zapowiedziany przez produkcję) | rysunek gięcia obróbek A/B i „na kwadraty” |
| screwSpacing (podłoga, słupy) | UNKNOWN — wizualizacja co 600 / 500 mm | technologia montażu |
| system_2, system_3 | nie modelowane | opis produkcji |

## Parametry renderingu (nie są wymiarami fizycznymi)

| parametr | wartość | uwaga |
|---|---|---|
| `metalRoughness` | 0.5 | Blacha powlekana poliester mat — strojenie wizualne |
| `metalMetalness` | 0.38 | Powłoka organiczna na stali — strojenie wizualne |
| `glassMetalness` | 0.82 | Przybliżenie szkła niskoemisyjnego (odbicie) zgodne w rasteryzacji i path tracerze |
| `cassetteBevelMm` | 3 | Zaokrąglenie krawędzi kasetonu w renderze |
| `lamellaGrooveShade` | 0.35 | Dno rowka lameli (U, 30 mm w głąb, ≈ 37 mm szer.): przyciemnienie koloru zamiast niedostępnego w czasie rzeczywistym zacienienia (zdjęcie 03: rowek ≈ 0,2 jasności czoła) |
| `panelSemiMattRoughness` | 0.4 | Płyta 7016 półmat (lekki połysk) — strojenie wizualne powłoki 25 µm |
| `flashingMattRoughness` | 0.72 | Obróbki 7016M faktura mat — wyższa chropowatość |
| `flashingMattMetalness` | 0.22 | Obróbki 7016M — mniej metaliczny połysk niż płyta |
| `blackMattRoughness` | 0.7 | Płyta RAL 9005 mat |
| `flashingSheetRenderMm` | 1.2 | Grubość blachy obróbki w widoku technicznym (realnie 0,5–0,7 mm — pogrubione dla czytelności) |

## Pomiary zdjęć i filmów

Szczegóły metody i wyniki: [reference/gallery/POMIARY.md](gallery/POMIARY.md). Konstrukcja Systemu 1: [reference/construction/SYSTEM1.md](construction/SYSTEM1.md).
