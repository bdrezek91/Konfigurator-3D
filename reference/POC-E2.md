# Proof of concept E2 — kaseton jako taca — galeria-207

Zakres: tylko `galeria-207` (wzorzec kasetonów Systemu A; bramka `TRAY_POC_PROJECTS` w `src/render/poc.ts`).
**Układ kasetonów bez zmian** (KASETONY FINAL): moduły, fugi, narożniki, attyka — z `components.ts`, jak dotąd.
Zmienia się wyłącznie kształt pojedynczego kasetonu w jego dotychczasowym obrysie i sposób renderowania.
Dach, materiały sceny, HDRI, stolarka 207, inne presety — bez zmian.

## Geometria tacy

```
            lico (osobna płyta, od R do w − R)
   ┌──────────────────────────────┐   gięcie R = 1,5 mm (3 segmenty łuku)          — ASSUMPTION
   │                              │   bok tacy = głębokość 25 mm                    — UNKNOWN w spec.ts (jak dotąd)
   └┐                            ┌┘   obrzeże 8 mm (domyślnie do środka, schowane) — ASSUMPTION
```

- przekrój `cassetteReturn` w bibliotece (`profiles/sections.ts`), wymiary tylko w `profiles/cassette-tray.ts`;
- pierścień 4 boków z uciosem 45° (ten sam `ProfileAssembler` i `RunGeometry.mitre` co stolarka) + lico;
- cień w fudze: kolor wierzchołków boku tacy (od 0,7 przy płycie do 1 przy gięciu) — z geometrii, nie z materiału;
- kaseton-deska: ten sam przekrój, rysunek drewna wypalony w UV geometrii **identycznie z dotychczasowym** (to samo
  przesunięcie, obrót i skala co klon tekstury na boxie) → wspólny materiał, scalanie siatek.

## Metryki (`renderer.info`, pełna klatka, 3 klatki identyczne)

| metryka | before | after |
|---|---:|---:|
| siatki kasetonów (warstwa FACADE) | 125 | **6** |
| meshes (cała scena 207) | 436 | 317 |
| geometries (scena) | 436 | 317 |
| materials | 25 | 24 |
| draw calls / klatkę | 1233 | **876** |
| triangles sceny | 11 430 | 33 430 |
| triangles / klatkę | 33 290 | 99 290 |

Pozostałe ~310 siatek 207 to dotychczasowa ścieżka (bryła Systemu 1 część po części, stolarka OpeningFrame) — poza zakresem E2.
Trójkątów więcej (taca ~190 vs box 12) — świadomie: szczegół kosztuje trójkąty, nie wywołania rysowania; 99 tys. / klatkę
to wciąż mały budżet.

Przy okazji: próg instancjonowania w rendererze 4 → 24 powtórzeń (instancje kilku–kilkunastu kasetonów jednego rozmiaru
dawały 48 siatek; scalenie — kilka). galeria-163 (E0+E1): 124 → **90** draw calli / klatkę.

## Sprawdzenia

- BOM / CSV identyczny (galeria-163, -207, -13); model części Systemu 1 identyczny bajt w bajt po refaktorze składacza;
- `tsc -p tsconfig.app.json`, `oxlint` — bez błędów; `check:system1` — 284 przebiegi, OK;
- różnice pikseli BEFORE → AFTER: 3/4 1,9 % (krawędzie tac), narożnik 2,2 %, front 1,0 %, duży kaseton attyki 0,1 %;
  kaseton-deska: ten sam rysunek (różnice subpikselowe na krawędziach słojów).

## Do decyzji

**Obrzeże w fudze z wkrętami** (`CASSETTE_TRAY.flangeOut`). Produkcja (spec.ts, fuga): „w fudze widać wygiętą blachę
obrzeża z wkrętami”. Wariant zbudowany i pokazany (`comparisons/poc-e2/1-krzyz-fug.jpg`, `6-wariant-obrzeze.jpg`):
na dnie fugi jasne obrzeże + łby wkrętów co 400 mm (ASSUMPTION). Rozjaśnia fugi z bliska, więc zmienia zatwierdzony
wygląd fug — **domyślnie wyłączony**. Ograniczenie wariantu: przy kasetonach zawiniętych przez narożnik obrzeże pominięte
(sterczałoby poza róg) — przed włączeniem trzeba dopracować cięcie obrzeża na końcu przy narożniku.

## Ograniczenia

- głębokość tacy 25 mm i promień gięcia — ASSUMPTION (bez danych produkcji);
- narożnik L Systemu A to nadal dwa pasy (przód wydłużony, bok zachodzi 4 mm) + blachy wnęki — jak w KASETONY FINAL;
  osobny element L z jednego przekroju to kolejny krok (wymaga zgody na zmianę zamrożonego narożnika);
- wkręty w wariancie to proste bryłki 8 × 8 × 3 mm (LOD2 w przyszłości);
- płynność na prawdziwym GPU nie mierzona.
