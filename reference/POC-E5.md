# E5 — tryby jakości LOW / MEDIUM / HIGH / ULTRA + LOD

Zakres: cała aplikacja (tryby jakości dotyczą renderu, nie modelu). LOD części działa tam, gdzie scena idzie przez renderer warstw
(galeria-163; galeria-207 — kasetony). Model, BOM, kasetony, kamera — bez zmian.

## Tryby (`src/render/quality.ts`)

| | LOW | MEDIUM | HIGH | ULTRA |
|---|---|---|---|---|
| DPR | 1 | 1–1,5 | 1–1,75 | 1–2 |
| MSAA | 0 | 0 | 4 | 8 |
| mapa cienia | 1024 | 2048 | 4096 | 4096 |
| AO (N8AO) | wyłączone | ½ rozdzielczości, medium | pełne, high | pełne, ultra |
| szkło | bez transmisji (przezroczystość + odbicie) | transmisja | transmisja | transmisja |
| maks. LOD | 0 | 1 | 2 | 2 |

- **HIGH = dotychczasowe ustawienia sceny** (DPR 1–1,75, MSAA 4, cień 4096, N8AO pełne) — galeria-207 w HIGH piksel w piksel
  jak przed E5 (różnica tylko w UI);
- **Auto** (domyślnie): start z parametrów urządzenia (telefon słaby → LOW, telefon → MEDIUM, komputer 8+ rdzeni i 8+ GB → HIGH,
  pozostałe → MEDIUM — heurystyka, ASSUMPTION) + `PerformanceMonitor` (drei) obniża o poziom przy spadku FPS;
- wybór widza: przełącznik „Jakość” w prawym górnym rogu widoku, zapisany w przeglądarce; `?q=low|medium|high|ultra|auto` (testy);
- tryb HQ (path tracer) zawsze ULTRA.

## LOD części

`Part.lod`: 0 — zawsze (bryła, ramy, szyby, klamka); 1 — zawiasy (do ~20 m); 2 — uszczelki, listwy przyszybowe, przylga drzwi,
wkręty kasetonów (zbliżenie ~6 m, HIGH+). Renderer warstw grupuje części po poziomie i przełącza widoczność siatki w każdej
klatce: odległość kamery do kuli otaczającej siatkę, histereza (pokaż < 6 m, schowaj > 7 m; poziom 1: 20 / 23 m), limit z trybu.

## Pomiar (`renderer.info`, pełna klatka; render programowy — FPS na GPU niemierzone)

| preset | LOW | MEDIUM | HIGH | ULTRA |
|---|---:|---:|---:|---:|
| galeria-163: draw calls / klatkę | **46** | 88 | 87 | 87 |
| galeria-163: trójkąty / klatkę | 23 097 | 35 487 | 35 486 | 35 486 |
| galeria-207: draw calls / klatkę | **554** | 877 | 876 | 876 |
| galeria-207: trójkąty / klatkę | 65 877 | 99 291 | 99 290 | 99 290 |

LOW ~połowa wywołań (bez przebiegu normalnych AO i bez przebiegu transmisji szkła). MEDIUM–ULTRA różnią się kosztem pikseli
(DPR, MSAA, rozdzielczość AO i cienia), nie liczbą wywołań — tego render programowy nie pokaże; do zmierzenia na telefonie / laptopie.

## Sprawdzenia

`tsc -p tsconfig.app.json`, `oxlint` — bez błędów; `check:system1` — OK; BOM bez zmian.

## Ograniczenia

- heurystyka auto bez detekcji GPU (`detect-gpu` = nowa zależność — do decyzji);
- LOD tylko dla scen w rendererze warstw (galeria-163, kasetony 207) — reszta presetów po migracji (E6);
- w kontenerze (render programowy, kilka FPS) tryb auto schodzi do LOW — testy wizualne podają `?q=high`.
