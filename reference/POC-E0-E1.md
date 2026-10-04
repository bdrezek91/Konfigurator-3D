# Proof of concept E0 (renderer warstw) + E1 (przekroje + stolarka) — galeria-163

Zakres: tylko preset `galeria-163` (bramka `src/render/poc.ts`). Kasetony, dach, materiały sceny, HDRI, LOD i inne presety — bez zmian.
Pomiar: build produkcyjny, Chromium + swiftshader (render programowy), ten sam kadr startowy; `renderer.info` z pełnej klatki
(mapa cienia + normalne N8AO + obraz + postprocessing), `autoReset = false` na jedną klatkę, 3 kolejne klatki — identyczne wyniki.
BEFORE = commit `0c198ef` + sam licznik klatki (osobny build), AFTER = ten commit.

## Metryki

| metryka | before | after |
|---|---:|---:|
| meshes (cała scena) | 363 | **42** |
| geometries (w scenie / w GPU) | 363 / 378 | **42 / 57** |
| materials | 24 | 20 |
| draw calls / klatkę (`renderer.info`) | 992 | **124** |
| triangles / klatkę (`renderer.info`) | 37 118 | 37 622 |
| triangles sceny (geometria × instancje) | 12 794 | 12 962 |
| InstancedMesh | 0 | 14 (148 instancji) |

Kontrola: `galeria-207` (poza PoC) — 436 meshy, 1233 draw calle przed i po (bez zmian).

Warstwy renderera (AFTER, `userData` siatek):

| warstwa | części modelu | siatki | trójkąty |
|---|---:|---:|---:|
| STRUCTURE | 68 | 3 | 2704 |
| PIR | 113 | 9 | 1356 |
| JOINERY | 85 | 8 | 1368 |
| TRIMS | 27 | 2 | 548 |
| ROOF | 36 | 7 | 432 |
| FLOOR | 9 | 3 | 108 |

Stolarka przed: ~100 osobnych boxów (OpeningFrame: 363 − 253 części Systemu 1 − 10 pozostałych). Po: 85 części z przekrojów → 8 siatek.
Liczba trójkątów prawie bez zmian — szczegół jest w kształcie przekroju (stopień, wrąb, przylga, uciosy), nie w gęstości siatki.

## Architektura

```
config → buildSystem1 (MODEL CZĘŚCI: Part = przekrój × długość, warstwa, materiał)
          └─ joinery/build.ts (stolarka z biblioteki przekrojów — tylko PoC)
       → LayerRenderer (render/layers.ts: warstwa → grupa materiał+cień → scalenie | InstancedMesh)
       → three.js
```

- **Jeden świat danych**: stolarka PoC to części tego samego modelu Systemu 1 (warstwa `joinery`), nie osobny model.
  BOM / CSV dalej z `components.ts` — **identyczny** przed i po (diff 2203 linii CSV: galeria-163, -207, -13).
- **Renderer warstw**: grupuje po warstwie (STRUCTURE, PIR, FACADE, JOINERY, TRIMS, ROOF, FLOOR, TECHNICAL), materiale i cieniu;
  bryły o tej samej sygnaturze (przekrój po przesunięciu do zera, długość, uciosy) ≥ 4 razy → `InstancedMesh`, reszta → `mergeGeometries`.
  Identyfikatory części zostają w `userData.parts` siatki (diagnostyka, przyszłe zaznaczanie).
- **Biblioteka przekrojów** `src/profiles/sections.ts`: aluminiumFrame, aluminiumSash, aluminiumDoorFrame, doorStop + seal, mullion,
  transom, glazingBead, sealInner / sealOuter, threshold, sill, angle, thickenPath. Każdy: wielokąt 2D [mm], materiał, punkt bazowy,
  orientacja, parametry, pewność. Kątownik i obróbki Systemu 1 korzystają już z biblioteki (ta sama geometria co wcześniej).
- **Wymiary** wyłącznie w `src/profiles/generic-aluminium-52.ts` — **ASSUMPTION** (brak karty PE52); widoczne szerokości
  ościeżnicy / skrzydła i głębokość 52 mm z `spec.ts` (zdjęcie 11, produkcja).
- **Uciosy**: `RunGeometry.mitre = [k0, k1]` — koniec przesunięty o k·u (płaszczyzna cięcia przez narożnik zewnętrzny i wewnętrzny);
  45° przy równych profilach, ucios przekątny przy różnych (skrzydło: bok 45 / góra 70 / cokół 90 mm). Bez nachodzących brył.

## Stolarka galeria-163 — hierarchia

OPENING (otwór w płycie, blacha ościeża 0,8 mm) → OUTER FRAME (pierścień z uciosem; drzwi: boki do posadzki) → SASH / FIXED GLAZING
→ MULLION / TRANSOM (w bibliotece i generatorze; galeria-163 nie ma słupka — pokaz w `?lab=joinery`) → GASKETS + BEADS (pierścienie na
linii widoczności) → GLASS (pakiet 24 mm w wrębie: wejście 13 mm, luz 5 mm do dna, bez kolizji z profilem) → THRESHOLD (między
bokami ościeżnicy) → okucia (3 zawiasy, klamka z szyldem i wkładką) → TRIMS (obróbki ościeży z modelu ściany).

## Sprawdzenia

- `tsc -p tsconfig.app.json`, `oxlint` — bez błędów; `npm run check:system1` — 284 przebiegi, OK.
- Tryb techniczny (`?mode=technical`), laboratorium konstrukcji z przekrojem / clippingiem (`?lab=construction&view=B`),
  zmiana długości (`?L=8.03`) — działają (zrzuty w `comparisons/poc-e0-e1/`).
- Różnica pikseli 3/4 BEFORE vs AFTER: 0,84 % kadru, wyłącznie w otworach stolarki — ściany, dach, rama przez nowy renderer bez zmian.

## Ograniczenia / do potwierdzenia

- przekroje to **generic-aluminium-52**, nie PE52 — podmiana po otrzymaniu karty / DXF (jeden plik);
- materiały stolarki przeniesione 1:1 (bez strojenia), próg w kolorze ramy jak dotąd (ASSUMPTION);
- płynność na prawdziwym GPU nie mierzona (swiftshader); spadek draw calli jest pomiarem, FPS — nie;
- w głównym widoku nie było zaznaczania elementów (jest w trybie technicznym, który korzysta z modelu komponentów — bez zmian);
- przekrój w laboratorium bez wypełnienia (cap) — jak przed zmianą.
