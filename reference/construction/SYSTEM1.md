# System 1 — konstrukcja z kątownika 50×50×4 mm

Kod: `src/construction/system1/build.ts` (geometria w kolejności produkcji), `src/construction/types.ts` (warstwy, etapy),
parametry: `src/physical/spec.ts → PHYS.system1`. Podgląd: `?lab=construction&preset=722-08-26&view=assembled|exploded|A…G&finish=bare|squares|cassette&step=1…10`.

Zasada: **PRODUKCJA → GEOMETRIA → WYMIAR ZEWNĘTRZNY**. Model buduje ramę, płyty i obróbki w kolejności montażu.
Zewnętrzny obrys wynika z warstw. Nie jest wpisany ręcznie.

Na razie tylko System 1. `ConstructionSystemId` przewiduje `system_2` i `system_3`, ale bez implementacji.

## Dowody (filmy z produkcji)

| Obserwacja | Źródło | Wniosek |
|---|---|---|
| Wewnątrz, w narożnikach pionowych i na styku ściana–sufit, widać L o ramionach ~50–60 mm | `dowod-wa0018-naroznik-wewnatrz.jpg` (WA0018) | narożnik zamknięty profilem L, zgodnie z orientacją „do środka” |
| Z zewnątrz w narożu widać ciemny pionowy pas | `dowod-wa0017-gotowy-goly-pir.jpg` (WA0017) | słup / obróbka narożna na zewnętrznym obrysie |
| Nad jasną obróbką korony jest ciemny pas ~55 mm, a słup kończy się na jego górze | `dowod-wa0019-naroznik-gorny.jpg` (WA0019, w produkcji) | górna rama z kątownika leży ponad dachem i jest spięta ze słupami, które wystają ponad dach |
| Pas korony na gotowym pawilonie ma ~200–220 mm, dolny pas ~135–140 mm | WA0017 | obróbka A korony 215 mm, obróbka cokołowa 140 mm (kątownik 50 + krawędź podłogi + zakład) |
| Cokół w narożniku: lico odsunięte od ściany, u góry skośny powrót do płyty, kołnierz przykręcony; obróbka owija narożnik | `zdjecie-cokol-naroznik.jpg` | cokół: odsunięcie 15 mm (produkcja), skos ≈ 16° (wzniesienie ≈ 4 mm, wyliczony ze zdjęcia), kołnierz ≈ 16 mm z wkrętami; przebiegi wydłużone o odsunięcie w narożach |
| Słup narożny w produkcji wystaje wyraźnie ponad dach | `zdjecie-produkcja-naroznik-slup-nad-dachem.jpg` | ≈ 120–150 mm na zdjęciu — stan przed przycięciem i dospawaniem górnej ramy (potwierdzone); docelowo ~50 mm |

## Budowa (warstwy i etapy)

| Etap | Warstwa | Geometria | Pewność |
|---|---|---|---|
| 1 | dolna rama | 4 × kątownik 50×50×4: piętka na obrysie, ramię pionowe = krawędź, ramię poziome do środka (podparcie podłogi) | HIGH |
| 2 | słupy | kątownik w każdym narożu: piętka w narożu, ramiona w płaszczyznach ścian; od spodu ramy do góry górnej ramy | MEDIUM (długość LOW) |
| 3 | podłoga | płyty PIR wewnątrz ramy (L − 8 × W − 8 mm), oparte na ramieniu poziomym. Długie elementy wzdłuż długości, liczba = ⌈(W − 8) / moduł⌉. Wkręt 125 mm z góry: PIR → blacha → kątownik | HIGH / liczba MEDIUM |
| 4 | ściana tylna | na podłodze, lico zewnętrzne 4 mm za obrysem (za ramieniem słupa), długość L − 8, przykręcona do słupów | HIGH |
| 5 | ściany boczne | **między** ścianą przednią a tylną: długość = W − 2·4 − 2·grubość ściany | HIGH |
| 6 | ściana przednia | jak tylna; otwory wycięte w płytach, stolarka w otworach | HIGH |
| 7 | dach | płyty w poprzek, oparte na ścianach. Długość = W − 2·4 − 2·luz (luz 6 mm wyliczony z danych produkcji 2,94 m), trapez wg katalogu | MEDIUM |
| 8 | górna rama | kątownik na płycie dachowej (ramię pionowe na obrysie, poziome do środka), zespawany ze słupami | LOW |
| 9 | obróbki | półtorówka 15 mm (goły PIR), na kwadraty 25 mm (deska/dekor), płaska techniczna (pod kaseton); cokół 140 mm, odsunięcie 15 mm, skos 16°, kołnierz 16 mm (owija narożnik), narożniki L 124 mm | HIGH / płaska LOW / skos cokołu MEDIUM |
| 10 | elewacja | kasetony przykręcane przez obrzeże do płyty (fuga 20 mm, produkcja); lico = głębokość tacy 25 mm (UNKNOWN). Konstrukcja jest identyczna dla każdej elewacji | MEDIUM |

## Wymiary wyliczone (rama 6030 × 2960 mm, PIR 100, preset 722/08/26)

| Wymiar | Wartość | Wzór | Kontrola |
|---|---|---|---|
| ściana boczna | **2752 mm** | 2960 − 2·4 − 2·100 | ✓ produkcja 2740–2760 mm |
| element dachowy | **2942 mm** | 2960 − 2·4 − 2·6 (po skosie) | ✓ produkcja ≈ 2940 mm |
| ściana przednia / tylna | 6022 mm między słupami = 6 × 1000 + 22 mm | 6030 − 2·4 | ✓ produkcja: 6 płyt w module metrowym; 22 mm = zamek/tolerancja płyt skrajnych |
| ściana boczna — płyty | 3 szt.: 2 × 1000 + docięta 752 mm | 2752 / 1000 | ✓ produkcja |
| płyty podłogowe | 3 szt. | ⌈2952 / 1000⌉, ostatnia 952 mm | zgodne z opisem „np. 3” |
| poziom podłogi | 104 mm nad spodem ramy | 4 + 100 | — |
| słup przedni / tylny | 2874 / 2774 mm | 4 + 100 + ściana + 100 + 50 | ✓ produkcja: słup wystaje ~5 cm nad dach pod dospawanie górnej ramy |
| obróbka narożna — ramię boczne | 124 mm | 4 + 100 + 20 (zakłada czoło ściany przedniej) | MEDIUM |

**Wniosek:** nominalny pawilon „3 m” ma ramę zewnętrzną **2,96 m**. Przy 3,00 m ściana boczna miałaby 2792 mm, czyli poza zakresem produkcji.

## Potwierdzenia produkcji (2026-10-02)

- Rama zewnętrzna **6030 × 2960 mm** (VERIFIED).
- Płyty ścienne w **module 1000 mm**; front pawilonu 6 × 3 = **6 płyt** (VERIFIED).
- Dach zakrywa górę ściany przedniej i bocznej. Słup narożny wystaje **~5 cm nad dach**, do dospawania górnej ramy.
- Narożnik: blacha płyty skrajnej opiera się o jedno ramię kątownika, a czoło (rdzeń albo zamek, jeśli nie był odcięty) dotyka drugiego ramienia.
- Ostatnia płyta ściany jest docinana, gdy się nie mieści; zależy to od złożenia zamków.
- Ściana boczna: 3 płyty (2 × 1000 + 752).
- Górna rama leży na dachu. W narożnikach jest wyżej, bo pod nią jest silikon i wasserstop (wartość UNKNOWN).
- Obróbki (szkice: `szkic-obrobka-poltorowka-15mm.jpg`, `szkic-obrobka-na-kwadraty-25mm.jpg`):
  - **„półtorówka”**: lico 15 mm od ściany, na dole załamanie pod kątem do ściany i przykręcony kołnierz; wykończenie gołego PIR (przekrój E).
  - **„na kwadraty”**: lico 25 mm od ściany, przechodzi przez ostatnie żebro dachu, na dole powrót poziomy do ściany i kapinos; pod deskę, lamele i dekor wymagające większego odsunięcia (przekrój G).
  - Jednostki „1,5 / 2,5” to **cm**.
- Materiały:
  - obróbki: RAL 7016M (faktura, mat);
  - płyty zewnątrz: RAL 7016, półmat, poliester 25 µm;
  - wewnątrz zawsze RAL 9010 gładka (styropian: linia);
  - płyty czarne: RAL 9005 mat, gładkie.

## BOM

Dla Systemu 1 zestawienie (`buildComponentModel` → BOM/CSV, tryb techniczny) liczone jest z tego samego modelu co render:
stal (dolna rama, słupy, górna rama), płyty podłogowe wzdłuż długości, MFP 12 mm, płyty ścienne w module 1000 (szerokość zamawiana = moduł,
ostatnia docinana), płyty dachowe po skosie, obróbki obwodowe z rozwinięciem z przekroju. Brak poprzeczek (niepotwierdzone przez produkcję).
Spójność sprawdza `npm run check:system1`.

## Niewiadome

Lista `topFramePosition`, `cornerAngleHeight`, `roofSupportDetail`, `flashingOffset`, „na kwadraty”, poprzeczki podłogi i rozstawy mocowań jest w [`../VALIDATION.md`](../VALIDATION.md).

## Zrzuty

- `schemat-stal-krok2.jpg` — konstrukcja stalowa (dolna rama + słupy)
- `exploded-montaz.jpg` — exploded w kolejności montażu 1–10
- `exploded-krok3-mocowania.jpg` — rama, słupy i podłoga z mocowaniami
- `przekroj-A.jpg` … `przekroj-F.jpg`, `przekroj-G-na-kwadraty.jpg` — przekroje (kamera ortogonalna)
- `model-bez-elewacji.jpg`, `model-z-kasetonami.jpg`
