# Audyt silnika 3D konfiguratora — 2026-10-04

Zakres: branch `claude/festive-newton-nehkfy` (commit `70b3361`), React 19 / R3F 9 / drei 10 / three 0.186.
Pomiary: build produkcyjny, Chromium + swiftshader (render programowy — **wydajności na prawdziwym GPU nie mierzono**).
Wersja live: nie sprawdzana w tym audycie (wcześniej przeglądarka w kontenerze nie wczytywała strony przez proxy).

---

## Odpowiedź na pytanie główne

**Czy three.js / React Three Fiber wystarczy, żeby dojść do dużo wyższego poziomu szczegółowości? — TAK.**

Ograniczeniem nie jest silnik, tylko **nasz model danych i sposób renderowania**:

- three r186 ma wszystko, czego potrzeba konfiguratorowi produktowemu: `ExtrudeGeometry` i własne `BufferGeometry` z przekrojów,
  `mergeGeometries`, `InstancedMesh`, `BatchedMesh`, `LOD`, płaszczyzny cięcia, `MeshPhysicalMaterial` (transmisja, IOR,
  attenuation), PMREM / HDRI, tone mapping AgX / Neutral, cienie PCF. Konfiguratory klasy premium (meble, okna, auta) działają
  na tym samym stosie.
- Zmiana silnika (Babylon, Unity WebGL, Unreal Pixel Streaming) **nie rozwiązuje problemu**: każdy z nich wyrenderuje tylko tę
  geometrię, którą mu damy. Dziś dostaje pudełka. Koszt przepisania byłby ogromny, a zysk wizualny bliski zeru.
- Jedyne miejsca, gdzie rasteryzacja WebGL realnie ogranicza: brak globalnego oświetlenia (wnętrze oświetlone jak plener) i odbicia
  tylko z mapy otoczenia (bez odbić sąsiednich obiektów). Oba mają w three znane obejścia (rozdz. 8) i oba omija już istniejący
  tryb HQ (path tracer `three-gpu-pathtracer`).

Pomiar, który to potwierdza (scena po załadowaniu presetu):

| preset | meshe | unikalne geometrie | wierzchołki | materiały | tekstury |
|---|---|---|---|---|---|
| galeria-163 | 363 | 363 | 37 180 | 24 | 38 |
| galeria-207 | 436 | 436 | 31 660 | 25 | 36 |
| galeria-13  | 393 | 393 | 31 132 | 24 | 35 |

~35 tys. wierzchołków to **ułamek procenta** budżetu nawet słabego telefonu (bezpiecznie 300 tys. – 1 mln). Za to każdy element
to osobny mesh z własną geometrią, rysowany w ~3 przebiegach (obraz, mapa cienia, normalne do AO) — **szacunkowo 1000–1300 draw calli
na klatkę**. Czyli: geometrii jest za mało, a wywołań rysowania za dużo. Dołożenie detali w obecnej architekturze (1 element = 1 mesh)
pomnożyłoby draw calle i zabiło płynność, zanim zabraknie trójkątów. To jest prawdziwa blokada — architektoniczna, nie silnikowa.

---

## 1. Ocena obecnego poziomu

| obszar | ocena | uzasadnienie |
|---|---|---|
| **GEOMETRY DETAIL** | **MEDIUM** | konstrukcja Systemu 1 ma prawdziwe warstwy z przekrojów (kątowniki, płyty z rdzeniem PIR, obróbki z giętego przekroju); widoczna warstwa produktu — kasetony, stolarka, lamele, narożniki — to prostopadłościany |
| **MATERIAL SYSTEM** | **POOR** | materiały tworzone w ≥ 6 miejscach (cache prymitywów, `System1Body`, `Wall`, `OpeningFrame`, `Facade`, technika) bez wspólnej biblioteki; tekstury drewna generowane skryptem; brak map AO, brak roughness/normal dla blach i aluminium (poza przetłoczeniem płyty); martwe `envMapIntensity` w kodzie; klon tekstury na każdy element drewniany |
| **LIGHTING** | **MEDIUM** | poprawna baza: HDRI + słońce z cieniem 4096, N8AO, ACES, sRGB; słabości: HDRI otwartego pola bez kontekstu (płoty, drzewa) → ubogie odbicia, wnętrze oświetlone pełnym IBL (szyba „mleczna”), fugi przyciemniane kolorem materiału zamiast cieniem z geometrii, ACES przesuwa kolory RAL |
| **ARCHITECTURE** | **MEDIUM** | dobre: czyste funkcje `config → model`, parametry fizyczne ze źródłem i pewnością (`spec.ts`), model konstrukcyjny z przekrojów (`construction/`), BOM z modelu, 284 przebiegi `check:system1`; złe: **dwa równoległe modele geometrii** (`components.ts` — pudełka z wymiarami BOM, 2019 linii, oraz `construction/system1/build.ts` — przekroje), podwójna logika kasetonów (`cassetteRows` vs `addCassettes`), komponenty renderu liczą geometrię w JSX, ścieżka „legacy” dla konstrukcji spoza Systemu 1 |
| **SCALABILITY** | **POOR** | 1 element = 1 mesh = 1 geometria; brak scalania, instancingu (poza trybem technicznym), LOD i progów jakości; cała scena przebudowywana przy każdej zmianie `config` (useMemo na całym obiekcie) |

### Co konkretnie blokuje realizm

1. **Atomem modelu wizualnego jest „pudełko z wymiarami”** (`components.ts`: `lengthMm × widthMm × thicknessMm` + pozycja).
   Kaseton, słupek, listwa, lamela, obróbka narożna — wszystko jest boxem. Nie da się z tego zrobić gięcia, zagięcia, uszczelki
   ani profilu. Lepszy atom już istnieje (`Part` z `RunGeometry`: przekrój 2D × długość), ale używa go tylko konstrukcja.
2. **Dwa modele tej samej rzeczy.** Kasetony, otwory, obróbki są liczone w dwóch miejscach. Każdy nowy detal trzeba robić podwójnie
   albo jeden z modeli się rozjedzie (już się rozjechały: `addCassettes` w `build.ts` ma starą siatkę 240 / 2 × 330).
3. **Brak warstwy renderera.** Komponenty React same tworzą meshe element po elemencie. Nie ma miejsca, w którym można by scalić
   geometrię warstwy, przełączyć LOD albo podmienić materiał wg jakości.
4. **Brak biblioteki przekrojów.** Profile (PE52, obróbki, cokół, attyka) są rozrzucone jako liczby w JSX lub prostokąty.
5. **Materiały bez systemu.** Nie da się globalnie podnieść jakości (tekstury 2k, mapy AO, inny model szkła) bez edycji wielu plików;
   klon tekstury na element uniemożliwia scalanie geometrii.
6. **Oświetlenie wnętrza i otoczenie.** Wnętrze dostaje pełne światło nieba (IBL nie zna zasłonięcia), HDRI nie ma kontekstu —
   to ogranicza szkło bardziej niż sam materiał szkła.

---

## 2. Nowa architektura szczegółowości

Zasada: **jeden model danych → warstwy → części z przekrojów → renderer warstw**. BOM, tryb techniczny, laboratorium konstrukcji i
widok produktu czytają ten sam model. Żaden komponent nie udaje kilku warstw naraz.

```
PAVILION (config)                                   src/model/
 ├─ STRUCTURE        rama dolna/górna, słupy, kątowniki, ucha          (build.ts → structure.ts)
 ├─ PIR PANELS       ściany / podłoga / dach: blacha zewn. + rdzeń + blacha wewn., zamki, przetłoczenie
 ├─ FACADE           kasetony (taca), deska, lamele, blacha na rąbek, ornament, daszki Systemu B
 ├─ OPENINGS         otwory w płytach + ościeża (wynik: kontury otworów dla PIR i FACADE)
 ├─ JOINERY          ościeżnica, skrzydło, słupek, ślemię, listwa, uszczelka, szkło, próg, okucia
 ├─ TRIMS            obróbki: korona, narożniki, cokołowa, podokienne (parapety), nadproża, ościeża
 ├─ ROOF             płyta, pokrycie (trapez / rąbek), attyka (konstrukcja + obróbka czapowa), rynna / spust
 ├─ FLOOR            płyty podłogowe, MFP, wykładzina, listwy
 └─ TECHNICAL DETAIL wkręty, nity, uszczelnienia, kotwy — tylko LOD2 / tryb techniczny
```

Każda część (`Part`):

```ts
type Part = {
  id: string
  layer: LayerId                 // jedna z warstw powyżej
  material: MaterialId           // klucz biblioteki materiałów (nie kolor w JSX)
  color?: string                 // RAL części, jeśli materiał jest parametryczny
  geometry: PartGeometry         // patrz niżej
  lod: { min: 0 | 1 | 2 }        // od którego poziomu część istnieje
  bom?: BomRef                   // pozycja zestawienia (długość, masa, kod)
  confidence: Confidence         // jak w spec.ts
  explode: Vec3; stage: Stage    // exploded / montaż (już istnieje)
}
type PartGeometry =
  | { kind: 'extrude'; section: SectionRef; run: Run }          // profil prosty (rama, słupek, listwa, obróbka prosta)
  | { kind: 'sweep'; section: SectionRef; path: Vec3[]; closed: boolean } // rama wokół otworu, obróbka przez narożnik — ucięcia pod kątem
  | { kind: 'panel'; outline: Poly; holes: Poly[]; layers: Ply[] }       // płyta PIR z otworami
  | { kind: 'tray'; w: number; h: number; spec: TraySpec }               // kaseton (rozdz. 5)
  | { kind: 'profiledSheet'; outline: Poly; profile: SheetProfileRef }  // trapez / rąbek / przetłoczenie geometryczne
  | { kind: 'instance'; asset: AssetRef; transforms: Mat4[] }           // zawiasy, klamki, wkręty, kinkiety (GLB)
```

To jest rozszerzenie istniejącego `construction/types.ts` (`Part`, `RunGeometry`), **nie nowy projekt**. `components.ts` przestaje
generować geometrię — zostaje tylko jako adapter BOM / CSV czytający `Part[]` (dla Systemu 1 to już częściowo działa).

**Renderer warstw** (`src/render/LayerRenderer.tsx`):

- dla każdej warstwy: grupowanie części po `(material, color, lod)` → `mergeGeometries` → **1 mesh na grupę**;
  powtarzalne elementy (zawiasy, wkręty, żebra, lamele) → `InstancedMesh`;
- przebudowa tylko warstwy, której dane się zmieniły (memo na wycinku `config` istotnym dla warstwy, np. zmiana koloru stolarki nie
  przelicza dachu);
- UV w metrach zapisane w geometrii (skala i obrót słojów w UV, nie w klonie tekstury) — wtedy elementy drewniane też się scalają;
- identyfikator części w atrybucie wierzchołka (`partIndex`) → podświetlenie / wybór pojedynczego elementu nadal możliwy.

Szacunek: ~400 meshy → **~40–70 draw calli** na przebieg, przy kilkukrotnie większej liczbie trójkątów.

---

## 3. System LOD

| poziom | kiedy | zawartość |
|---|---|---|
| **LOD 0** — daleko | wysokość pawilonu na ekranie < ~250 px, miniatury, LOW | bryła: płyty bez zamków, kasetony jako jedna płyta na pas z fugą w normal mapie, stolarka = rama + szkło, bez okuć i uszczelek, dach bez żeber (normal mapa) |
| **LOD 1** — konfigurator | domyślnie | pełna geometria kasetonów (taca), stolarka z przekroju uproszczonego (rama, skrzydło, listwa), dach z pokryciem i attyką, narożniki L, obróbki z przekrojów |
| **LOD 2** — zbliżenie | element > ~30 % kadru albo HIGH / ULTRA | przekroje szczegółowe (komory, stopnie, zaokrąglenia 1–2 mm), uszczelki EPDM, próg z przekrojem, szczeliny skrzydło–rama, zagięcia z promieniem, wkręty na obrzeżach kasetonów i obróbkach, okucia GLB |

Przełączanie:

- **per strefa**, nie per obiekt: strefa = ściana (front / tył / lewa / prawa) + dach; dla każdej strefy rozmiar na ekranie liczony
  w `useFrame` z bounding box i kamery, z histerezą (np. wejście 30 %, wyjście 22 %), żeby nie migało;
- **sufit z ustawienia jakości**: LOW = maks. LOD 0/1, MEDIUM = LOD 1, HIGH = LOD 1 + LOD 2 przy zbliżeniu, ULTRA = LOD 2 zawsze;
- przekroje mają warianty LOD w bibliotece (ten sam przekrój, mniej wierzchołków), więc LOD nie jest osobnym modelem —
  to ten sam `Part[]` z różnym filtrem `lod.min` i inną rozdzielczością przekroju.

---

## 4. Profile techniczne — przekrój 2D + `ExtrudeGeometry`

Biblioteka `src/sections/` — każdy przekrój to wielokąt w mm, ze źródłem i pewnością (jak `spec.ts`), w wariantach LOD:

```ts
type Section = {
  id: 'pe52-frame' | 'pe52-sash' | 'pe52-mullion' | 'pe52-bead' | 'epdm-gasket' | 'threshold-alu' | 'sill-alu'
    | 'flash-crown' | 'flash-corner-l' | 'flash-base' | 'flash-squares' | 'flash-polturowka' | 'attic-coping'
    | 'angle-50x50x4' | 'plinth' | 'lamella-30x60' | 'cassette-return' | 'trapezoid-t18' | ...
  lod: { 1: Poly; 2: Poly }       // mm, (u = w poprzek, v = w głąb)
  holes?: { 2: Poly[] }           // komory profilu — tylko LOD2
  anchor: 'outer-face' | 'axis'   // punkt wstawienia
  source: string; confidence: Confidence
}
```

- **Stolarka**: ościeżnica, skrzydło, słupek, listwa i uszczelka jako osobne przekroje; rama wokół otworu = `sweep` po prostokącie
  z ucięciem 45° w narożach (połączenie na ucios jak w realnym aluminium). Dzisiejszy `ProfileRing` (pudełka 60/40 %) zastąpiony.
  Źródło przekrojów: karty katalogowe systemu (PE52 lub faktycznie stosowany — **do potwierdzenia przez produkcję**); jeśli producent
  udostępnia DXF, skrypt offline zamienia go na wielokąt (to jest właściwa droga „bliżej CAD”).
- **Obróbki**: już są przekrojami (`thicken(path, th)` w `build.ts`) — przenieść do biblioteki, dodać promień gięcia i kapinos w LOD2.
- **Rama konstrukcyjna**: kątownik już jest przekrojem — dodać zaokrąglenie wewnętrzne w LOD2.
- **Cokół, parapet, attyka**: przekroje zamiast boxów (`BaseBoard` już używa `Shape` — ujednolicić).
- Narożniki obróbek: `sweep` po łamanej (jeden element przez narożnik) zamiast dwóch boxów stykających się na rogu.

Kiedy **nie** używać przekroju: elementy o złożonej bryle i stałym kształcie (klamka, zawias, kinkiet, klimatyzator, ucho) —
modele GLB (meshopt / Draco) wstawiane instancjami.

---

## 5. Kasetony — prawdziwa taca

Własna `BufferGeometry` generowana z parametrów (bez CSG):

```
   lico (w × h)                 zagięcie R≈1,5 mm (LOD2: 3 segmenty łuku, LOD1: fazka 1 segment)
   ┌────────────────────┐       bok tacy (głębokość 25 mm — ASSUMPTION z spec.ts)
   │                    │       obrzeże montażowe (flange) 20–30 mm z otworami / wkrętami (LOD2, widoczne w fudze)
   └────────────────────┘       wnętrze boku ciemniejsze z AO (cień wewnętrzny w fudze — z geometrii, nie z koloru)
```

- generator `trayGeometry(w, h, depth, bendR, flange, lod)`: lico + 4 boki + 4 narożniki z gięciem (narożnik tacy jest zgrzewany /
  zaginany — w LOD2 mała szczelina w rogu, jak na zdjęciach z bliska), normalne liczone analitycznie (ostre / gładkie gdzie trzeba);
- **AO wnętrza fugi** wypalone w kolorze wierzchołka (gradient na boku tacy od lica do płyty) — zastępuje dzisiejszy hack
  `wallCavity = kolor × 0,3`; N8AO dokłada resztę;
- narożnik L = ta sama taca z przekroju L (`sweep` przekroju zagięcia po łamanej) — jedna bryła, prawdziwa krawędź, bez nakładania
  dwóch boxów i bez blach „wnęki narożnika”;
- kaseton drewniany = ta sama taca, inny materiał (UV w metrach);
- wszystkie kasetony ściany scalone w 1 mesh (LOD1) — 60–120 kasetonów to dziś 60–120 draw calli, po zmianie 1.

Układ kasetonów (`cassetteRows`, zamrożony — **KASETONY FINAL**) zostaje bez zmian: zmienia się tylko geometria pojedynczej tacy.

---

## 6. Dach — warstwy

| warstwa | geometria | dziś |
|---|---|---|
| konstrukcja | górna rama z kątownika (jest), płatwie / łaty jeśli występują — **do potwierdzenia** | jest (System 1) |
| panel | płyta PIR z rdzeniem i spadkiem (jest) | jest |
| pokrycie | `profiledSheet`: trapez T18 / rąbek jako przekrój wyciągnięty wzdłuż spadku, zakładki arkuszy, LOD0 = płaska płyta + normal mapa | żebra jako osobne bryły |
| attyka | konstrukcja attyki (kątownik / płyta), obróbka czapowa z przekroju ze spadkiem i kapinosem, narożniki attyki `sweep` | brak jako konstrukcji — attyka to dziś górne rzędy kasetonów |
| obróbki | wiatrownice, okapowa, pas nadrynnowy z przekrojów | częściowo (korona) |
| odwodnienie | rynna + spust (jeśli w ofercie — **do potwierdzenia**), LOD1+ | brak |

---

## 7. Materiały — pełny PBR

Jedna biblioteka `src/materials/library.ts`: `MaterialId → fabryka(params, quality)`, współdzielone instancje, tekstury w 1k (LOW/MEDIUM)
i 2k (HIGH/ULTRA), wszystkie mapy w metrach (UV z geometrii).

| materiał | baseColor | roughness | metalness | normal / bump | AO |
|---|---|---|---|---|---|
| **blacha lakierowana** (kaseton, obróbki, płyta PIR) | RAL (liniowo) | 0,45–0,6 półmat, mat 0,7 + mapa „skórki pomarańczy” ±0,05 | 0,0–0,05 (lakier = dielektryk) | przetłoczenie płyty (jest, z katalogu), mikroziarno lakieru (tileable 1k) | wierzchołki (taca), N8AO |
| **aluminium malowane** (stolarka) | RAL | 0,35–0,45 | 0,0–0,1 (proszek) | drobna faktura proszku, LOD2 | N8AO |
| **aluminium surowe / okucia** | #a9adb0 | 0,25–0,35 + szlif kierunkowy | 1,0 | szlif (anizotropia `MeshPhysicalMaterial.anisotropy`) | — |
| **drewno** (deska, kaseton-deska, lamele) | **skan PBR** (CC0: ambientCG / Poly Haven — sosna, modrzew; licencja do sprawdzenia przy wyborze) | mapa | 0 | mapa normalnych skanu | mapa AO skanu |
| **PIR** (rdzeń, widoczny tylko w przekroju / technice) | #e3cf8f | 0,9 | 0 | szum pianki | — |
| **szkło** | biały | 0 | 0 | — | — | 
| **dach** (trapez, rąbek) | RAL | 0,5 | 0,05 | geometria (LOD1+) / normal (LOD0) | N8AO |
| **cokół** | RAL / beton (skan) | 0,6 / mapa | 0 | blacha: gładka; beton: skan | skan |
| **uszczelka EPDM** | #0c0d0e | 0,85 | 0 | — | — |

Szkło: `MeshPhysicalMaterial` z transmisją (HIGH/ULTRA) lub tańszy wariant bez transmisji (LOW: odbicie env + ciemne wnętrze za szybą,
bez dodatkowego przebiegu transmisji). F0 pakietu ≈ 0,12–0,15 (4 powierzchnie + low-E, ASSUMPTION — jak w obecnym kodzie).

Tekstury proceduralne drewna z `scripts/gen-wood-textures.py` są poprawne skalą i kolorem, ale z bliska wyglądają sztucznie —
**rekomendacja: zastąpić skanami PBR** (diff / normal / rough / AO, 2k, kalibracja koloru do zdjęć 163, 207).

---

## 8. Światło — pipeline fotograficzny, bez przesady z postprocessingiem

- **Color management**: liniowy workflow, `SRGBColorSpace` na wyjściu (jest), kolory RAL konwertowane z sRGB (jest).
- **Tone mapping**: test **AgX** i **Neutral** (three ≥ r162) zamiast ACES — ACES desaturuje i przesuwa barwy, co przy kolorach RAL
  (7016, 9005, drewno) jest wadą konfiguratora produktowego. Wybór na podstawie porównania ze zdjęciami (pomiar sRGB lica jak w audycie).
- **Ekspozycja**: stała, skalibrowana do zdjęć (jest).
- **HDRI**: wymienić / dodać HDRI z **kontekstem** (podwórko, płot, drzewa, zabudowa — jak na zdjęciach Dampol), 4k dla HIGH/ULTRA,
  2k dla LOW; słońce HDRI zgrane z `directionalLight` (jest mechanizm `rotationY`). To da odbicia w szybach i blachach bez zmian w szkle.
- **Słońce i cienie**: jedno słońce, frustum dopasowane do bryły (jest), PCF Soft; mapa 2048 (LOW/MEDIUM), 4096 (HIGH/ULTRA);
  wąskie elementy (ościeża, uszczelki) bez odbierania cienia albo z `normalBias` per materiał.
- **Cienie kontaktowe / AO**: N8AO (jest) z jakością wg progu; na LOW zamiast N8AO — wypalony cień kontaktowy pod pawilonem
  (drei `ContactShadows` raz, `frames={1}`) + AO z wierzchołków.
- **Wnętrze**: materiały wnętrza z jawnie przypisanym `envMap` (ten sam PMREM) i `envMapIntensity ≈ 0,2–0,35` — przy jawnym `envMap`
  three **respektuje** `envMapIntensity` (ignoruje je tylko przy `scene.environment`). Wnętrze robi się ciemniejsze jak w rzeczywistości,
  a szkło może wrócić do fizycznej transmisji LT ≈ 0,78 (dziś tłumienie 0,5 jest obejściem).
- **Postprocessing**: tylko N8AO + antyaliasing (MSAA lub SMAA). Bez bloom, DOF, winiety, ziarna.

---

## 9. Tryb jakości LOW / MEDIUM / HIGH / ULTRA

| parametr | LOW | MEDIUM | HIGH | ULTRA |
|---|---|---|---|---|
| maks. LOD | 0 (1 przy zbliżeniu) | 1 | 1 + 2 przy zbliżeniu | 2 |
| DPR | 1 | 1–1,5 | 1–2 | 2 |
| antyaliasing | FXAA / brak | SMAA | MSAA 4 + SMAA | MSAA 8 |
| mapa cienia | 1024, PCF | 2048, PCF Soft | 4096, PCF Soft | 4096, PCF Soft + mniejszy frustum |
| AO | wierzchołki + ContactShadows | N8AO half-res | N8AO full | N8AO full, więcej próbek |
| szkło | bez transmisji | transmisja | transmisja | transmisja + attenuation |
| tekstury | 1k | 1k | 2k | 2k (4k drewno z bliska) |
| HDRI | 1k | 2k | 4k | 4k |
| okucia, wkręty (GLB / instancje) | nie | nie | przy zbliżeniu | tak |
| render HQ (path tracer) | — | — | przycisk | przycisk (więcej próbek) |

Wybór automatyczny przy starcie (heurystyka: `navigator.hardwareConcurrency`, rozmiar ekranu, ewentualnie `detect-gpu` — nowa zależność,
do decyzji) + **drei `PerformanceMonitor`**: spadek FPS → krok w dół. Użytkownik może nadpisać w UI.

---

## 10. Pozostałe punkty audytu

- **Generowanie geometrii (1)**: dwa modele (pudełka BOM vs przekroje) → ujednolicić na przekrojach (rozdz. 2).
- **Warstwy (2)**: konstrukcja ma 8 warstw (`steel, floor, walls, roof, topFrame, flashings, decor, fasteners`), widok produktu miesza je
  z komponentami `Wall` / `Facade` / `OpeningFrame` → jedno drzewo warstw.
- **Clipping / techniczny (9)**: cięcie działa (`clippingPlanes`), ale **bez wypełnienia przekroju** (brak „cap” stencilem) — przekrój
  wygląda jak pusta skorupa. Z jednym modelem `Part[]` wypełnienie per materiał (stal, PIR, blacha — z kreskowaniem) jest proste
  (stencil caps per warstwa).
- **Optymalizacja / instancing (13, 15)**: scalanie per warstwa + instancje (rozdz. 2); geometrie i materiały współdzielone; przebudowa
  tylko zmienionej warstwy.
- **Normal / roughness maps (17, 18)**: przetłoczenie płyty — jest (z katalogu, dobre); blacha, aluminium, beton — brak → biblioteka (rozdz. 7).
- **Geometria bliższa CAD (19)**: (a) przekroje z DXF producentów → biblioteka `sections/`; (b) okucia i akcesoria jako GLB;
  (c) **nie** proponuję importu pełnych modeli STEP / IFC do przeglądarki — konfigurator musi być parametryczny, a przekrój × długość
  daje dokładność CAD dla profili przy ułamku kosztu; (d) opcjonalnie eksport `Part[]` do glTF / IFC dla produkcji (osobny temat).

---

## 11. Plan wdrożenia — bez przepisywania od zera

Kolejność wynika z zależności; każdy etap kończy się porównaniem ze zdjęciami i `check:system1` bez regresji.

| etap | zakres | ryzyko | efekt widoczny |
|---|---|---|---|
| **E0** renderer warstw | `LayerRenderer` (scalanie, instancje) na istniejących `Part[]` Systemu 1; pomiar draw calli przed / po | niskie — geometria bez zmian | brak (wydajność, zapas na detale) |
| **E1** biblioteka przekrojów + stolarka | `sections/`, stolarka z `sweep` (ucios 45°), uszczelki, próg, parapet | średnie — przekroje PE52 do potwierdzenia | duży (stolarka) |
| **E2** kaseton-taca | `trayGeometry`, AO wierzchołków, narożnik L z przekroju; usunięcie hacka `wallCavity` | średnie — zamrożony układ musi zostać 1:1 (test pozycji fug) | duży (elewacja z bliska) |
| **E3** materiały + światło | biblioteka materiałów, skany PBR drewna, AgX / Neutral, wnętrze z `envMapIntensity`, HDRI z kontekstem | średnie — zmiana wyglądu całej sceny, kalibracja do zdjęć | duży (szkło, kolory) |
| **E4** dach + attyka + obróbki | pokrycie z przekroju, attyka jako konstrukcja, obróbki `sweep` przez narożniki | średnie — detale attyki do potwierdzenia | średni |
| **E5** LOD + progi jakości | strefowy LOD, LOW–ULTRA, `PerformanceMonitor`, LOD2 (wkręty, okucia GLB) | niskie | średni + płynność na telefonach |
| **E6** migracja `components.ts` | BOM / CSV z `Part[]` dla wszystkich elewacji, usunięcie podwójnej logiki kasetonów, ścieżka legacy | średnie — szeroki zakres testów BOM | brak (porządek, mniej błędów) |

Rekomendacja startu: **E0 + E1 na jednym preset (galeria-163)** jako dowód koncepcji — mierzalny wynik (draw calle, porównanie zdjęcie |
render) zanim ruszymy resztę.

## Założenia i niewiadome

- przekroje profili stolarki (PE52 czy inny system), wymiary progu i parapetu — **do potwierdzenia przez produkcję**;
- głębokość tacy kasetonu 25 mm, promień gięcia, obrzeże montażowe — **ASSUMPTION** (spec.ts);
- konstrukcja attyki, rynny i spusty — brak danych;
- wydajność na prawdziwym GPU (telefon / laptop) — niezmierzona; liczba draw calli szacowana (meshe × przebiegi);
- licencje tekstur PBR i HDRI — do sprawdzenia przy wyborze (Poly Haven / ambientCG są CC0).
