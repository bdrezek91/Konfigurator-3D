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
