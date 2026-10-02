# Rejestr walidacji modelu — wartości, źródła, niewiadome

> Plik generowany: `npm run validation` (źródło: `src/physical/spec.ts`, `src/construction/system1/build.ts`). Nie edytuj ręcznie.

Hierarchia źródeł: 1 zdjęcie gotowego pawilonu · 2 film · 3 pomiar zdjęcia ze skalą · 4 katalog · 5 produkcja · 6 rysunek · 7 szkic · 8 założenie.
Przy sprzeczności wygrywa źródło wyżej; sprzeczność opisana w kolumnie „problem”.

Pewność: VERIFIED 5 · HIGH 8 · MEDIUM 15 · LOW 7 · UNKNOWN 8

## Wartości fizyczne

| element | obecna wartość | źródło | pewność | problem | proponowana wartość | status |
|---|---|---|---|---|---|---|
| `envelope.claddingHeight` Wysokość zewnętrzna okładziny (attyka płaska) | 2820 mm | rysunek: Projekty 722/08/26 i in. (2,82 m); spójne z proporcją zdjęcia 11: L/H = 2,45 → L = 6,92 m ≈ pawilon 7 × 3 | **HIGH** | Potwierdzić miarą taśmową na gotowym pawilonie (jedyna skala wszystkich pomiarów zdjęć). | — | OK |
| `panel.wallModule` Moduł płyty ściennej (rozstaw styków) | 1000 mm | film: Film WA0018/WA0019: styki ≈ 1,0 m; WA0017: 0,97–1,0 m przy typowym FOV telefonu | **MEDIUM** | Katalog Paneltech PW PIR-S: standard 1130 mm (opcjonalnie 1000 / 1050). Film wskazuje 1000 — przyjęto film (źródło wyższe). · Potwierdzić zamówieniem/WZ płyt (1000 czy 1050). | — | OK |
| `panel.roofModule` Moduł płyty dachowej | 1050 mm | produkcja: Standard zakupowy konfiguratora (dotychczasowe zakupy) | **MEDIUM** | Niewidoczny na zdjęciach (attyka) — potwierdzić zamówieniem. | — | OK |
| `panel.jointWidth` Widoczny styk płyt (zamek) | 10 mm | film: Film WA0017/WA0019: cienka ciemna linia | **LOW** | Zmierzyć szczelinę zamka z bliska. | — | OK |
| `cassette.gap` Fuga między kasetonami | 15 mm | pomiar zdjęcia: Zdjęcie 11 (rektyfikacja, 5 mm/px): 15 mm; zdjęcie 03: 12–18 mm | **VERIFIED** | — | — | OK |
| `cassette.bodyBandHeight` Wysokość pasa kasetonu poziomego (korpus) | 240 mm | pomiar zdjęcia: Zdjęcie 11: 9 pasów, średnio 242 mm (234–254); zdjęcie 03: 232 mm | **HIGH** | Zdjęcie 09 (inna realizacja): kasetony korpusu ≈ 550 mm — inny wariant elewacji, nie domyślny. | było 300 → 240 mm | CHANGED |
| `cassette.atticRowHeight` Wysokość rzędu kasetonu attyki (2 rzędy) | 330 mm | pomiar zdjęcia: Zdjęcie 11: 2 × 320 mm; zdjęcie 03: 2 × 335 mm | **HIGH** | Zdjęcie 09: attyka 1 rząd ≈ 650 mm — inny wariant. | było 315 → 330 mm | CHANGED |
| `cassette.atticModuleTarget` Docelowa szerokość kasetonu attyki (długość dzielona na równe moduły) | 1100 mm | pomiar zdjęcia: Zdjęcie 03: 6 równych modułów ≈ 1,10 m; zdjęcie 11: 9 modułów ≈ 0,77 m. Łączenia obu rzędów w jednej linii (bez mijanki) | **HIGH** | Model miał mijankę co 600 mm — żadne zdjęcie jej nie pokazuje. | było 1200 → 1100 mm | CHANGED |
| `cassette.thickness` Grubość kasetonu | 30 mm | założenie: Założenie (nie widać na zdjęciach frontalnych) | **UNKNOWN** | Zdjęcie narożnika z boku / karta kasetonu. | zmierzyć | OPEN |
| `cassette.offsetFromPanel` Odsunięcie lica kasetonu od lica płyty (podkonstrukcja) | 75 mm | założenie: Założenie | **UNKNOWN** | Przekrój/rysunek podkonstrukcji Dampol. | zmierzyć | OPEN |
| `cassette.cornerWrap` Zawinięcie kasetonu narożnego L (na każdą ścianę) | 150 mm | założenie: Założenie; zdjęcia 19–21 pokazują zawinięcie bez listwy | **LOW** | Zmierzyć na zdjęciu narożnika ze skalą. | zmierzyć | OPEN |
| `lamella.pitch` Rozstaw lameli pionowych | 82 mm | pomiar zdjęcia: Zdjęcie 03 (drewnopodobne): 28 lameli, 82 ± 2 mm; zdjęcie 11 (aluminiowe): 80,6 mm | **VERIFIED** | Model galerii-03 miał 58 mm (39 lameli zamiast 28). Zdjęcie 09 (inny produkt): ≈ 150 mm — wariant szeroki. | było 72 → 82 mm | CHANGED |
| `lamella.face` Szerokość czoła lameli | 45 mm | pomiar zdjęcia: Zdjęcie 03: jasne czoło 45–50 mm; zdjęcie 11 (alu): 40 mm | **MEDIUM** | — | było 40 → 45 mm | CHANGED |
| `lamella.depth` Głębokość lameli | 40 mm | założenie: Założenie — niewidoczna na zdjęciach frontalnych | **UNKNOWN** | Zdjęcie z boku pola lameli / karta produktu. | było 52 → 40 mm | OPEN |
| `lamella.widePitch` Rozstaw lameli — wariant szeroki | 150 mm | pomiar zdjęcia: Zdjęcie 09: 0,053 H ≈ 150 mm (19 szczelin) | **MEDIUM** | — | — | OK |
| `board.height` Deska elewacyjna pozioma — wysokość | 140 mm | film: Film WA0016: 0,13–0,15 m | **MEDIUM** | — | — | OK |
| `board.gap` Deska — szczelina cieniowa | 12 mm | film: Film WA0016 (ocena wizualna) | **LOW** | — | — | OK |
| `joinery.fixFrameFace` Widoczna szerokość ramy FIX (ALU) | 62 mm | pomiar zdjęcia: Zdjęcie 11: 55–75 mm (bok 70, góra 70, prawa 50 + cień ościeża) | **MEDIUM** | System profili (Aluprof/Ponzio?) — karta przekroju. | — | OK |
| `joinery.doorSashFace` Widoczne skrzydło drzwi (ponad ościeżnicę) | 45 mm | pomiar zdjęcia: Zdjęcie 11: ościeżnica + skrzydło 95 mm (bok), 125 mm (góra) | **MEDIUM** | — | było 55 → 45 mm | CHANGED |
| `joinery.frameDepth` Głębokość profilu ramy | 70 mm | założenie: Założenie (typowe systemy ALU 60–75 mm) | **LOW** | Karta systemu profili. | zmierzyć | OPEN |
| `joinery.glazingTop` Góra ramy przeszklenia nad dołem okładziny | 2110 mm | pomiar zdjęcia: Zdjęcie 03: 2,11 m; zdjęcie 11: 2,17 m | **HIGH** | — | — | OK |
| `base.groundGap` Prześwit pod ramą (domyślny) | 60 mm | zdjęcie: Zdjęcia 03 i 11: ≈ 30 mm; film WA0019: 50–100 mm; zdjęcie 09: widoczny cokół ≈ 150 mm | **MEDIUM** | Zależy od montażu (podkłady/bloczki). Wysokie bloczki 120 mm z modelu nie występują na zdjęciach gotowych pawilonów. | było 120 → 60 mm | CHANGED |
| `base.bottomRail` Widoczny rygiel dolny (goły PIR) | 140 mm | film: Film WA0017: 4,8% H ≈ 135 mm; WA0016: 0,15 m | **MEDIUM** | — | było 150 → 140 mm | CHANGED |
| `base.crownBand` Obróbka korony / rygiel górny (goły PIR) | 215 mm | film: Film WA0017: 7,2–7,7% H ≈ 200–220 mm; WA0019: 200–250 mm | **MEDIUM** | — | było 230 → 215 mm | CHANGED |
| `system1.angleLeg` Kątownik — długość ramienia | 50 mm | produkcja: Opis produkcji: kątownik równoramienny 50×50×4 | **VERIFIED** | — | — | OK |
| `system1.angleThickness` Kątownik — grubość | 4 mm | produkcja: Opis produkcji: 50×50×4 | **VERIFIED** | — | — | OK |
| `system1.angleOrientation` Orientacja kątowników (ramiona do środka, piętka na zewnętrznym obrysie) | 1 | produkcja: Opis produkcji; film WA0018 (L widoczne od wewnątrz w narożach), WA0017 (słup widoczny z zewnątrz w narożu) | **HIGH** | — | — | OK |
| `system1.outerFrameWidth` Zewnętrzny wymiar ramy (pawilon „3 m”) | 2960 mm | rysunek: Presety/projekty: 2,96 m. Potwierdzone pośrednio: ściana boczna wyliczona 2,752 m mieści się w danych produkcji 2,74–2,76 m | **HIGH** | Nominał handlowy 3,00 m dałby ścianę boczną 2,792 m — poza zakresem produkcji. | — | OK |
| `system1.floorModule` Szerokość modułowa płyty podłogowej | 1000 mm | produkcja: Opis produkcji: kilka (np. 3) długich elementów na szerokości ~3 m | **MEDIUM** | Potwierdzić szerokość krycia płyt podłogowych (1000 / 1050 / 1130). | — | OK |
| `system1.floorScrewLength` Mocowanie podłogi do kątownika — długość wkrętu/szpilki | 125 mm | produkcja: Opis produkcji: 120–125 mm | **HIGH** | Rozstaw mocowań (UNKNOWN). | — | OK |
| `system1.floorScrewSpacing` Mocowanie podłogi — rozstaw | 600 mm | założenie: Założenie wizualizacyjne | **UNKNOWN** | — | zmierzyć | OPEN |
| `system1.wallScrewSpacing` Mocowanie ściany skrajnej do słupa — rozstaw | 500 mm | założenie: Założenie wizualizacyjne | **UNKNOWN** | — | zmierzyć | OPEN |
| `system1.roofClearance` Luz płyty dachowej przy kątowniku (na stronę) | 6 mm | produkcja: Wyliczony z danych produkcji: element dachowy 2,94 m przy ramie 2,96 m → (2,96 − 2·0,004 − 2,94) / 2 | **MEDIUM** | Potwierdzić sposób oparcia dachu i kierunek ułożenia. | — | OK |
| `system1.topFrameOnRoof` Górna rama: kątownik leżący na płycie dachowej (ramię poziome do środka) | 1 | film: Film WA0019: ciemny pas ≈ 55 mm nad obróbką korony, słupy kończą się na jego górze | **LOW** | topFramePosition — zdjęcie z bliska górnego narożnika przed obróbką. | zmierzyć | OPEN |
| `system1.postAboveRoof` Wysunięcie słupa ponad płytę dachową (= wysokość górnego kątownika) | 50 mm | film: Film WA0019: słup sięga góry ciemnego pasa ≈ 55 mm nad koroną | **LOW** | cornerAngleHeight — pomiar na produkcji. | zmierzyć | OPEN |
| `system1.crownFlashingFace` Obróbka korony A (goły PIR) — wysokość lica | 215 mm | film: Film WA0017 (gotowy): pas 200–220 mm; WA0019 (w produkcji): obróbka 180 mm + kątownik 55 mm | **MEDIUM** | — | — | OK |
| `system1.flashingDrip` Obróbka A — wysunięcie zagięcia (kapinos) | 15 mm | założenie: Przekaz ustny „1,5” / „2,5” bez jednostki. Zdjęcie 11: daszek korony ≈ 15–20 mm → przyjęto cm-owy odczyt 15 mm (wariant mały) | **UNKNOWN** | flashingOffset — potwierdzić jednostkę i wartości 1,5 / 2,5 na rysunku gięcia. | zmierzyć | OPEN |
| `system1.cornerFlashingSide` Obróbka narożna — ramię od strony ściany bocznej | 124 mm | film: Wyliczone: musi zakryć czoło ściany przedniej/tylnej (t + grubość ściany = 104 mm) + zakład 20 mm; film WA0017: ciemna listwa narożna | **MEDIUM** | Zmierzyć listwę narożną na gotowym pawilonie. | — | OK |
| `system1.cornerFlashingFront` Obróbka narożna — ramię od strony ściany przedniej/tylnej | 60 mm | film: Wyliczone: zakrywa ramię słupa 50 mm + zakład 10 mm | **LOW** | — | zmierzyć | OPEN |
| `system1.baseFlashingFace` Obróbka cokołowa — wysokość lica | 140 mm | film: Film WA0017: 135–140 mm (kątownik 50 + krawędź podłogi + zakład) | **MEDIUM** | — | — | OK |
| `system1.intermediateFloorSupports` Podpory pośrednie podłogi (poprzeczki) | 0 | założenie: Opis produkcji wymienia tylko obwód; brak danych o poprzeczkach | **UNKNOWN** | — | zmierzyć | OPEN |
| `system1.squareFlashing` Obróbka „na kwadraty” — geometria | 0 | założenie: Brak przykładu na zdjęciach/filmach — typ zarejestrowany, geometria nieznana | **UNKNOWN** | — | zmierzyć | OPEN |
| `color.ral7016` RAL 7016 (sRGB #383E42) | 7016 | katalog: Wzornik RAL (sRGB 56,62,66) | **VERIFIED** | — | — | OK |

## System 1 (kątownik 50×50×4) — wymiary wyliczone z konstrukcji (preset 722/08/26, rama 6030 × 2960 mm)

| wymiar | wartość | wzór | pewność | kontrola z produkcją |
|---|---|---|---|---|
| Płyta podłogowa — pole wewnątrz ramy | 6022 | L − 2·t (dł.) × W − 2·t = 6022 × 2952 | **HIGH** | — |
| Liczba płyt podłogowych (wzdłuż długości) | 3 | ⌈(W − 2·t) / moduł⌉ = ⌈2952 / 1000⌉, ostatnia 952 mm | **MEDIUM** | — |
| Poziom podłogi (wierzch PIR) nad spodem ramy | 104 | t + grubość podłogi = 4 + 100 | **HIGH** | — |
| Ściana przednia/tylna — długość | 6022 | L − 2·t (między ramionami słupów) | **HIGH** | — |
| Ściana boczna — długość | 2752 | W − 2·t − 2·grubość ściany przód/tył = 2960 − 8 − 200 | **HIGH** | ✓ produkcja: 2740–2760 mm |
| Płyty ściany przedniej | 7 | ⌈6022 / 1000⌉, ostatnia 22 mm | **MEDIUM** | ✗ ostatnia płyta ≥ 100 mm (inaczej moduł lub długość ramy są inne) |
| Element dachowy — długość (w poprzek) | 2942 | W − 2·t − 2·luz (luz z danych produkcji) — po skosie | **MEDIUM** | ✓ produkcja: ≈ 2940 mm |
| Liczba płyt dachowych | 6 | ⌈6010 / 1050⌉ | **MEDIUM** | — |
| Słup narożny przedni — długość | 2874 | t + podłoga + ściana przednia + dach + 50 (ponad dach) | **LOW** | — |
| Słup narożny tylny — długość | 2774 | t + podłoga + ściana tylna + dach + 50 | **LOW** | — |
| Wysunięcie słupa ponad dach | 50 | = wysokość górnego kątownika (WA0019) | **LOW** | — |
| Wysokość zewn. front (spód ramy → góra górnej ramy) | 2874 | konstrukcja; + prześwit 60 mm do gruntu | **MEDIUM** | — |

## Niewiadome Systemu 1 (do potwierdzenia na produkcji)

| klucz | stan | co rozstrzygnie |
|---|---|---|
| topFramePosition | LOW — kątownik leżący na płycie dachowej (WA0019: ciemny pas ≈ 55 mm nad obróbką) | zdjęcie górnego narożnika przed obróbką |
| cornerAngleHeight | LOW — słup do góry górnej ramy (dach + 50 mm) | pomiar słupa |
| roofSupportDetail | MEDIUM — dach leży na ścianach, luz 6 mm/stronę z danych 2,94 m | przekrój/rysunek oparcia dachu |
| sideWallCalculatedLength | HIGH — 2752 mm = W − 2·4 − 2·100, zgodne z produkcją 2740–2760 | — |
| flashingOffset | UNKNOWN — „1,5 / 2,5” bez jednostki; przyjęto 15 mm (zdjęcie 11: daszek ≈ 15–20 mm) | rysunek gięcia obróbki |
| squareFlashing („na kwadraty”) | UNKNOWN — brak przykładu na zdjęciach | zdjęcie/rysunek |
| intermediateFloorSupports | UNKNOWN — opis wymienia tylko obwód | potwierdzenie produkcji |
| wallModuleVsFrameLength | ✗ — 6022 mm / 1000 → 6 płyt + 22 mm; moduł lub długość ramy inne | WZ płyt / pomiar ramy |
| screwSpacing (podłoga, słupy) | UNKNOWN — wizualizacja co 600 / 500 mm | technologia montażu |
| system_2, system_3 | nie modelowane | opis produkcji |

## Parametry renderingu (nie są wymiarami fizycznymi)

| parametr | wartość | uwaga |
|---|---|---|
| `metalRoughness` | 0.5 | Blacha powlekana poliester mat — strojenie wizualne |
| `metalMetalness` | 0.38 | Powłoka organiczna na stali — strojenie wizualne |
| `glassMetalness` | 0.82 | Przybliżenie szkła niskoemisyjnego (odbicie) zgodne w rasteryzacji i path tracerze |
| `cassetteBevelMm` | 3 | Zaokrąglenie krawędzi kasetonu w renderze |

## Pomiary zdjęć i filmów

Szczegóły metody i wyniki: [reference/gallery/POMIARY.md](gallery/POMIARY.md). Konstrukcja Systemu 1: [reference/construction/SYSTEM1.md](construction/SYSTEM1.md).
