# Kalibracja profili okładzin płyt warstwowych

Data: 2026-10-02. Kod: `src/scene/materials/profiles.ts`. Stanowisko testowe: `?lab=profiles&m=<producent>&p=<profil>&light=side|front`.

## Źródła

| Producent | Dokument | Strony |
|---|---|---|
| Paneltech | Katalog `pl_katalog_2026_2_v2_www.pdf` (paneltech.pl → Do pobrania) | s. 10 (głębokość „ok. 1 mm”), s. 11 (rysunki profilacji) |
| Paneltech | Karta produktowa PW PIR-S 2025 | moduł 1130 mm (opcjonalnie 1000 lub 1050 mm), profilacje L, ML, MF, MR, G, C |
| Balex Metal | Katalog płyt warstwowych PL-2026-08-24 (balex.eu → pliki do pobrania, fid=211) | rozdz. 14, s. 17–18, tabela 5 |

Kopie stron: `paneltech-katalog-2026-s11-profilacje.jpg`, `balex-katalog-2026-s17-profilowania.jpg`, `balex-katalog-2026-s18-profilowania.jpg`.
Powiększenia rysunków: `paneltech-MF-rysunek.png`, `balex-M16-rysunek.png`.

## Parametry (mm)

| Profil | Kształt | Rozstaw | Głębokość | Pola / rowek | Źródło |
|---|---|---|---|---|---|
| Paneltech **MF mikrofala** | fala trójkątna, zaokrąglona | **16** (8 + 8) | 1,0 | — | katalog: wymiar 8 + 8 mm |
| Paneltech ML mikrolinia | stopnie | 50 | 1,0 | 25 / 25, przejście ≈3 | katalog: 25 + 25 mm |
| Paneltech MR mikrorowek | rowek V | 25 | 1,0 | rowek 7 | katalog: 7 i 25 mm |
| Paneltech L linia | stopnie | 100 | 1,0 | 50 / 50, przejście ≈3 | katalog: 50 + 50 mm |
| Paneltech C carbon | MF w dwóch kierunkach (90°) | 16 × 16 | 1,0 | — | katalog: „profilacja MF w dwóch kierunkach pod kątem 90°” |
| Paneltech T (dach) | trapez | 350 | 42 | podstawa ≈72, góra ≈26 | 350 i 42 opisane; szerokości z rysunku w skali 4,07 px/mm |
| **Balex M16** mikroprofilowanie | fala | **16** (wymiar 8 = pół okresu) | **0,8** | — | katalog: 8 mm i 0,8 mm |
| Balex L liniowane | stopnie | 105 | 0,8 | 52,5 / 52,5 | katalog: 52,5 i 0,8 mm |
| Balex D pogłębione liniowanie | stopnie | 66,67 | 2,0 | 33,33 / 33,33 | katalog: 33,33 i 2,0 mm |
| Balex T (dach) | trapez | 333 | ≈40 | ≈76 / ≈30 | moduł 333 mm; reszta z warstwy wymiarowej rysunku — do potwierdzenia kartą PIR ROOF |

Uwagi:
- Szacunek „~15 mm, 66–67 fal na 1 m” był bliski, ale oba katalogi podają **16 mm, czyli 62,5 fali na 1 m**. Przyjęto wartość katalogową.
- Balex D według tabeli 5 jest okładziną **wewnętrzną** płyty dachowej PIR ROOF, a nie zewnętrzną ściany. W UI zostaje jako „Pogłębione liniowanie (D)” dla zgodności z istniejącymi presetami.
- Balex S (Softline: rozstaw 25, pola 12,5, głębokość 0,8), 1L i 2L nie są jeszcze opcjami w UI.

## Pomiar: test 1 m (stanowisko testowe, światło boczne, 1 m = 965 px)

Rytm mierzony transformatą Fouriera jasności między czerwonymi znacznikami linijki 0 i 1000 mm.

| Profil | A — stara metoda (MF zmierzone; pozostałe: rozstaw listew z kodu) | B — normal mapa z profilu | C — pełna geometria (wzorzec) |
|---|---|---|---|
| Paneltech MF | 70,5 mm → 14,2 / m | 16,1 mm → 62,3 / m | 16,1 mm → 62,3 / m |
| Balex M16 | 70 mm (jak MF) | 16,1 mm → 62,3 / m | 16,1 mm → 62,3 / m |
| Paneltech ML | 55 mm (listwy) | 50,3 mm → 19,9 / m | 50,3 mm |
| Paneltech MR | 35 mm (listwy) | 25,2 mm → 39,7 / m | 25,2 mm |
| Paneltech L | 180 mm (listwy) | 100,6 mm → 9,9 / m | 100,4 mm |
| Paneltech C | 45 mm (listwy) | 16,1 mm → 62,3 / m | 16,1 mm |
| Balex L | 180 mm | 105,4 mm → 9,5 / m | 105,3 mm |
| Balex D | 180 mm | 66,9 mm → 14,9 / m | 67,0 mm |

Na ścianie pawilonu (zbliżenie z kamery 0,72 m, 2,43 px/mm) stara wersja dawała dominujący rytm ~95 mm, nowa 16 mm.

## Przed / po: mikrofala Paneltech MF

| | przed | po |
|---|---|---|
| Rozstaw w normal mapie | 22 px przy 5 kaflach/m = 17,2 mm (58,2 / m), rytm łamany co 200 mm (11,64 paska na kafel) | 16,0 mm (62,5 / m), kafel = dokładnie 1 okres |
| Rytm widoczny w obrazie | 70,5 mm (14,2 / m) — dominują doklejone listwy | 16,1 mm (62,3 / m) |
| Amplituda | normalScale 0,18 (relief praktycznie niewidoczny) + listwy 8 × 1,2 mm co 70 mm w ciemniejszym kolorze | 1,0 mm fizycznie (Balex: 0,8 mm), normalScale 1 |
| Geometria | ~14 dodatkowych brył na metr ściany | 0 dodatkowych brył |

## Odpowiedzi

1. **Jak profil był generowany?** Normal mapa rysowana na canvasie 256 px (paski co 22 px, gradient 6 px, siła ±9/255, repeat 5) oraz osobne bryły (`Box`) co 70 mm, 8 mm szerokie, 1,2 mm grube, w ciemniejszym kolorze. Inne profile działały tak samo, z innym rozstawem pasków i listew.
2. **Co było nie tak?** Wygląd wyznaczały listwy co 70 mm (14 na metr zamiast 62,5), a nie mikrofala. Normal mapa miała niecałkowitą liczbę pasków na kafel (rytm łamał się co 200 mm), zły kształt (wąski garb zamiast fali) i była przygaszona do 18%. Żaden parametr nie był w milimetrach.
3. **Tylko rozstaw czy cały model?** Cały model. Sama korekta rozstawu zostawiłaby listwy jako osobne obiekty, z aliasingiem z daleka i bez związku z kształtem przekroju.
4. **Najlepsza reprezentacja:** normal mapa generowana z fizycznego przekroju h(x) w mm. Jeden kafel to jeden okres, liczba powtórzeń to 1000 / rozstaw na metr, mipmapy i filtrowanie anizotropowe. Displacement, parallax ani prawdziwa geometria nie są potrzebne.
5. **Dlaczego?** Przy głębokości 0,8–1 mm w skali pawilonu oko widzi tylko zmianę cieniowania, a nie przesunięcie sylwetki. Test A/B/C pokazał, że normal mapa daje ten sam rytm i to samo cieniowanie co pełna geometria (16,1 mm w B i C). Geometria 16 wierzchołków na okres to ~1000 wierzchołków na metr szerokości i wymagałaby wycinania otworów. Parallax i displacement przy 1 mm nic nie dają. Własny shader nie działałby w Render HQ, bo path tracer obsługuje tylko standardowe materiały.
6. **Koszt wydajności:** tekstura 64–1024 × 4 px na profil (Carbon: 2D), tworzona raz i zapamiętywana. Usunięto ~14 brył na metr ściany (dla 6 × 3 m ok. 250 obiektów i wywołań rysowania). Bilans jest wyraźnie na plus.
7. **Render HQ:** three-gpu-pathtracer czyta `normalMap` z `MeshStandardMaterial`, więc profil trafia do HQ bez dodatkowego kodu. Nie potwierdzono tego osobnym renderem HQ (wolny przy programowym GPU w CI).
8. **Jeden system dla wszystkich profili?** Tak, i już działa. Kształty `zigzag`, `step`, `groove` i `grid` oraz trapez dachu (`ROOF_TRAPEZOIDS`) są opisane tą samą strukturą w mm, ze źródłem przy każdej wartości. Nowy profil to jedna pozycja w tabeli.

## Ograniczenia

- Moduł płyty Paneltech PW PIR-S to standardowo 1130 mm (opcjonalnie 1000 lub 1050 mm). W modelu styki są co 1000 mm, zgodnie z dotychczasowymi projektami Dampol.
- Szerokość przejść stopni (≈3 mm) i szerokości żeber trapezu odczytano z rysunków, a nie z opisanych wymiarów.

## Zrzuty

- `lab-test-1m-MF.jpg` — test 1 m: A (stara metoda), B (normal mapa z profilu), C (pełna geometria).
- `przed-po-MF-zblizenie.jpg` — ściana pawilonu z bliska: przed | Paneltech MF (pierwsza wersja, 15 mm) | Balex.
- `po-MF-M16-Carbon-gladka.jpg` — zbliżenie po kalibracji: Paneltech MF | Balex M16 | Paneltech Carbon | gładka.
- `regresja-galeria-03.jpg` — przed | po: 0 pikseli różnicy (okładzina kasetonowa zasłania płytę).
- `regresja-722-08-26.jpg` — przed | po: 389 pikseli różnicy na 1132×936 (żebra dachu wg katalogu), elewacja bez zmian.
