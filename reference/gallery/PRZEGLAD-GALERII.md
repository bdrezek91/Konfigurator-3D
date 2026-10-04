# Przegląd galerii Dampol Investment — wszystkie zdjęcia po kolei (2026-10-04)

Źródło: https://dampol-investment.com/galeria/ — 226 zdjęć w pełnej rozdzielczości, w kolejności ze strony
(lista adresów: `przeglad/zrodla-url.txt`, numer = pozycja na liście). Arkusze zbiorcze po 12 zdjęć: `przeglad/arkusz-01.jpg … arkusz-19.jpg`.
Galeria nie dzieli zdjęć na pawilony — kolejne ujęcia tego samego pawilonu stoją obok siebie.

## Typy wykończenia (co model musi rozróżniać)

| typ | opis | zdjęcia (przykłady) | stan w modelu |
|---|---|---|---|
| **A. goła płyta + pasy kaseton-deska** | płyta warstwowa jako elewacja, pionowe/poziome pasy kasetonu z dekorem deski; **górny kątownik widoczny** (leży na dachu/obróbce korony), **róg zakryty obróbką narożną**, ucha φ16 w narożach (163) | 054, 081, 120, 133, 134, 145, 151, 158, 163, 179, 216–218 | System 1: rama na dachu (na żebrach), korona z kołnierzem pod kątownikiem, obróbka narożna do spodu ramy, ucha — **zgodne** |
| **B. pełna elewacja kasetonowa** | kasetony poziome lub siatka na całej ścianie, **attyka kasetonowa do samej góry — rama zasłonięta**, **kasetony zawinięte na narożu** | 025–029, 049–051, 055–060, 077–079, 083, 085, 087, 093–095, 099–101, 106–111, 114–117, 123, 125–132, 141–144, 155–157, 161, 165–168, 180, 183, 186–193, 195, 204, 207, 209, 211, 213–215 | kasetony do góry ramy, kaseton narożny L tylko gdy obie ściany kasetonowe — **zgodne** |
| **C. blacha na rąbek (pionowa)** | pionowe panele z rąbkiem na całej wysokości lub z attyką kasetonową; akcenty lamel | 030, 033, 044, 045, 062, 064–066, 070–073, 091, 096, 098, 181, 194, 206, 208, 220, 221 | elewacja `vertical-ribbed` (moduł 600 — założenie) — **przybliżone** |
| lamele / deski (akcenty) | pionowe lamele drewnopodobne (alu), deska pozioma, lamele ukośne (023–025, 226), ornament ażurowy (031, 032, 052, 053), żaluzje poziome (142, 143, 184) | prawie wszystkie | lamele 82/45/30 mm, ornament, deska — **zgodne co do rodzaju** |
| domki dwuspadowe | dach dwuspadowy na rąbek, szczyt drewniany | 008–012 (+ wnętrza 013–021) | **poza Systemem 1** — nie modelowane |
| wnętrza | biała okładzina 9010 gładka, podłoga drewnopodobna (PVC), stolarka antracyt; wersje premium z płytą kamienną | 004, 007, 026, 034–043, 047, 063, 074–076, 086, 088–089, 092, 097, 104–105, 112–113, 139–140, 159–160, 200, 202, 219 | 9010 wewnątrz, podłoga drewnopodobna — **zgodne** |
| wizualizacje/rzuty | 147, 148, 169, 175 (rzuty 3D), 170–172, 177 (render) | — | nie są realizacjami — pominięte w pomiarach |

## Walidacja z tym, co wiemy od produkcji

| wiedza (źródło) | co pokazuje galeria | wniosek |
|---|---|---|
| górna rama leży na dachu, kątownik nieprzykryty (produkcja 2026-10-04) | typ A: ciemny pas kątownika na górze, nad obróbką (081, 120, 134, 151, 163) | zgodne; dotyczy typu A. W typie B rama zakryta attyką kasetonową |
| róg zakryty obróbką narożną (produkcja 2026-10-04) | typ A: pionowy ciemny pas na narożu (134, 151, 163); 081 — rama i słupy w kolorze jasnym (inny kolor obróbek) | zgodne dla typu A; w typie B róg = zawinięte kasetony (028, 110, 111) |
| ucha φ16, 250 mm, U (produkcja 2026-10-04) | widoczne w 163 (górne naroża), prawdopodobnie też przy dolnych narożach (163, dół) | górne w modelu; **dolne — do potwierdzenia** |
| kasetony: fuga 20 mm, przykręcane do płyty | fugi wąskie, równe (055, 094, 110, 155) | zgodne |
| kaseton-deska (produkcja 2026-10-04) | pasy deski w 163/134/151 to kasetony z dekorem deski, nie lamele | model: decor `board`/lamele — **nazewnictwo do uporządkowania** |
| moduł płyty 1000, 6 płyt na froncie 6×3 | styki płyt widoczne w typie A (163: 4 płyty nad drzwiami/oknami + pełne) | zgodne |
| dach trapezowy, żebra (zdjęcie z produkcji) | z poziomu ziemi niewidoczny (attyka/korona) | brak sprzeczności |
| prześwit 30–100 mm, podkłady | podkłady/bloczki widoczne (054, 102, 103, 117, 196) — czasem wysokie (102, 103: ~200 mm), czasem podest | zmienne — parametr `foundationGap` |

## Pytania do produkcji (z przeglądu)

1. Ucha φ16 — czy są także w **dolnych** narożach (zdjęcie 163, dolny róg)?
2. Typ B — czy ucha zostają pod attyką kasetonową, czy są odcinane po montażu?
3. Obróbka narożna typu A — szerokość ramion (mm)?
4. Blacha na rąbek (typ C) — producent/profil i szerokość modułu?
5. 081 — rama i słupy jasne: czy to inny kolor obróbek (np. 9006/9010) na życzenie klienta?
