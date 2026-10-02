# Pomiary ze zdjęć (fotogrametria przybliżona)

Metoda: profil jasności w pionowym pasie kasetonów na zdjęciu w pełnej rozdzielczości (5120×3840),
wykrywanie ciemnych fug, skala z wysokości ściany 2,82 m (zewn.) i wysokości drzwi ok. 2,10 m.
Dokładność ok. ±15% (perspektywa, nisko ustawiony aparat). Do potwierdzenia wymiarami z produkcji.

## Zdjęcie 03 — `03-front-kasetony-poziome-zblizenie.jpg`

| Element | Zdjęcie | Render v5 (722/08/26) |
|---|---|---|
| Wysokość pasa kasetonu poziomego (rozstaw fug) | **ok. 220–260 mm** (9 rzędów w części dolnej) | ok. 450–480 mm (6 rzędów) |
| Pas attyki | **2 rzędy po ok. 300–330 mm**, kasetony ok. 1,2 m długości, łączenia mijankowe co ½ długości | brak wyraźnego pasa attyki |
| Długość kasetonu poziomego (ściana pełna) | jeden kaseton na całą szerokość pasa między narożnikiem a stolarką (ok. 0,4–0,6 m na tym zdjęciu), bez pionowych łączeń | krótkie kasetony ok. 0,5–0,6 m z mijankowymi łączeniami → efekt cegieł |
| Fuga (z cieniem) | **ok. 12–18 mm**, prawie czarna (jasność 1–11 przy kasetonie 34–47) | cienka, mało kontrastowa |
| Przeszklenie frontu | 3 pola, wysokość prawie do pasa attyki, ok. 3 m szerokości na froncie ~6 m | 2 osobne, małe otwory |
| Rama stolarki | smukła, kolor jak kaseton (antracyt), nie czarna | gruba, czarna |
| Lamele | pionowe, ok. 35–45 mm, szczeliny ok. 15–20 mm, zlicowane z kasetonami | brązowe prostokątne bloki |
| Krawędź górna | ostra, płaska attyka, dachu nie widać | wystająca płyta dachu + blacha trapezowa |
| Posadowienie | cokół prawie przy gruncie, ciemny pas 80–120 mm | wysoki czarny pas, bryła "pływa" |

## Wniosek
Główna przyczyna efektu "lego": kasetony w modelu są **2× za wysokie i za krótkie** (ok. 470 × 550 mm
zamiast ok. 240 mm × cała długość pola), a fugi są za słabe. Do tego wystający dach i grube czarne ramy.

## Zdjęcie 03 — rektyfikacja fotogrametryczna (zastępuje szacunki powyżej)

Metoda: fasada traktowana jako płaski prostokąt. Z czterech narożników okładziny wyznaczono punkty zbiegu
poziomu i pionu; z warunku ortogonalności kierunków — ogniskową aparatu; następnie każdy punkt zdjęcia
rzutowano na płaszczyznę fasady (metry). Skala: wysokość okładziny 0,03–2,82 m (2,79 m).
Kontrola spójności: pion szkła mierzony u góry i u dołu zdjęcia różni się o ≤ 6 mm.

Narożniki fasady (px, zdjęcie 1600×1200): TL (110,18), TR (1515,350), BR (1578,872), BL (65,1078).
Ogniskowa ≈ 1221 px → pionowe FOV ≈ 52,3°.

| Element | Pomiar (od lewego końca fasady) |
|---|---|
| Długość fasady | ≈ 6,67 m (proporcja L/H = 2,392) |
| Przeszklenie | 0,50 → 3,545 m: FIX 1,04 · drzwi 0,86 (zawiasy lewe) · FIX 1,14 m; góra ramy ≈ 2,11 m |
| Pole lameli | 3,98 → 6,25 m (2,27 m), wys. 0,04 → 2,11 m |
| Attyka | dolna krawędź ≈ 2,12 m → 2 rzędy ≈ 0,35 m |
| Pasy korpusu | ≈ 0,22–0,23 m (9 rzędów) |
| Kamera | 0,72 m nad gruntem, 3,6 m od lica, 0,04 m od lewego końca; patrzy wzdłuż fasady i ~8° w górę |

Weryfikacja: nakładka zdjęcia i renderu (`reference/comparisons/galeria-03-nakladka-zdjecie-render.png`)
pokrywa krawędzie przeszklenia, lameli, rzędów kasetonów i attyki. Dokładność wymiarów ±3%
(zależy od założonej wysokości okładziny).

## Walidacja 2026-10-02 — rektyfikacja zdjęć 03, 09, 11 i klatek filmów

Metoda: 4 narożniki fasady → homografia; ogniskowa z warunku prostopadłości krawędzi, gdy zdjęcie nie jest frontalne.
Skrypt odtwarza wcześniejszy wynik zdjęcia 03 (f = 1221 px, L = 6,675 m, kamera 0,68 m nad gruntem, 3,6 m od lica).
Skala: wysokość okładziny 2,82 m (2,79 m dla 03). Wymiary poziome rozdzielczość 5 mm/px.

### Zdjęcie 11 (frontalne, szare kasetony, lamele aluminiowe)
Narożniki: TL (44,265), TR (1540,259), BR (1541,866), BL (45,875); L/H = 2,45 → L ≈ 6,92 m (pawilon ~7 × 3).

| Element | Pomiar |
|---|---|
| Fugi poziome korpusu (od dołu) | 225, 460, 695, 925, 1160, 1415, 1670, 1925, 2175 mm → 9 pasów, średnio **242 mm** (234–254, dystorsja) |
| Attyka | 2 rzędy ≈ **320 mm**; moduł **760–795 mm**; łączenia obu rzędów w jednej linii; panel z logo 2,29 m |
| Fuga | **15 mm** |
| Lamele aluminiowe | rozstaw **80,6 mm** (10 żeber w polu ≈ 0,82 m), czoło ≈ 40 mm, szczelina ≈ 40 mm |
| Wąski kaseton przy ramie | ≈ 150 mm |
| Rama FIX (widoczna) | 55–75 mm (bok 70, góra 70; prawa 50 + cień ościeża ≈ 50 mm) |
| Drzwi: ościeżnica + skrzydło | bok ≈ 95 mm, góra ≈ 125 mm; słupek szkło–szkło FIX/drzwi ≈ 135 mm |
| Góra ramy przeszklenia | 2,17 m nad dołem okładziny |
| Prześwit pod ramą | ≈ 30 mm |

### Zdjęcie 03 (wzorzec galerii-03), rektyfikacja powtórzona
| Element | Pomiar |
|---|---|
| Lamele drewnopodobne | **28 lameli, rozstaw 82 ± 2 mm** (trzy wysokości: 82,8 / 81,9 / 81,7) — model miał 58 mm |
| Attyka | łączenia w jednej linii w obu rzędach co ≈ **1,10 m** (6 równych modułów) — model miał mijankę co 0,6 m |
| Pasy korpusu | 232 mm |

### Zdjęcie 09 (inna realizacja: duże kasetony, lamele szerokie)
f ≈ 2058 px, L/H = 2,87. Attyka 1 rząd ≈ 0,22 H (≈ 0,65 m); kasetony korpusu ≈ 0,18 H (≈ 0,55 m);
widoczny cokół (rama pod kasetonami) ≈ 0,054 H (≈ 0,15 m); lamele **≈ 150 mm** (0,053 H, 19 szczelin).
Wniosek: wysokość pasa, attyka i rozstaw lameli to **parametry wariantu**, nie stałe.

### Filmy
- **WA0017** (gotowy, goły PIR): korona 7,2–7,7% H ≈ **200–220 mm**, dolny pas 4,8% H ≈ **135 mm**. Moduł płyty z rozstawu styków nie jest jednoznaczny (ogniskowa nieoznaczona przy poziomej kamerze); przy typowym FOV telefonu ≈ 0,97–1,0 m.
- **WA0019** (w produkcji): nad jasną obróbką korony (≈ 180 mm) ciemny pas ≈ **55 mm** = górny kątownik; słupy narożne sięgają jego góry.
- **WA0018** (wnętrze): w narożnikach pionowych i na styku ściana–sufit białe L ≈ 50–60 mm.
