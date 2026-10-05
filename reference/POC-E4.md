# Proof of concept E4 — dach, attyka, obróbki — galeria-163

Zakres: tylko `galeria-163` (bramka `E4_POC_PROJECTS`). Pozostałe presety bez zmian (model i BOM identyczne).

## Co widać na zdjęciach (przegląd galerii) i co z tego wynika

- typ A (163): **dachu z ziemi nie widać** (korona, attyka); widoczne: górna rama z kątownika leżąca na dachu, obróbka korony
  z kołnierzem pod kątownikiem, obróbka narożna 25 cm, cokół, ucha — wszystko już jest w modelu Systemu 1 z przekrojów
  (płyty PIR z rdzeniem, trapez z żebrami, kątowniki, obróbki gięte); stan sprawdzony zbliżeniami (`0-dach-krawedz-stan.png`);
- attyka jako osobna konstrukcja dotyczy typu B (pełna elewacja kasetonowa) — na 163 jej nie ma; w typie B attykę tworzą
  kasetony (KASETONY FINAL), więc zmiana wymaga zgody na ruszenie zamrożonego układu;
- rynna / spust — brak w galerii typu A i brak danych produkcji (bez zmian).

Jedyna realna wada widoczna na 163: **narożniki obróbek**.

## Zmiana

Korona i cokół były wydłużane za narożnik i cięte prosto: zagięcia (kapinos, powrót, kołnierz) obu ścian wystawały spod siebie
na rogu jako „języczki” (`1-cokol-naroznik.jpg`, `2-korona-naroznik.jpg`). Teraz przebieg od narożnika do narożnika z uciosem
45° (`RunGeometry.mitre`, ten sam mechanizm co stolarka i taca): u przekroju obróbki rośnie na zewnątrz, więc k = −1 wydłuża część
zewnętrzną dokładnie do płaszczyzny cięcia; korona boczna po skosie dachu: k = −(długość po skosie / rzut).

BOM: długość obróbki = długość cięcia z uciosem (`runCutLength`, najdłuższa krawędź) — galeria-163: korona / cokół ±1 mm
(6054 → 6055, 2986 → 2985), powierzchnie bez zmian; galeria-207, -13 — CSV identyczne.

## Sprawdzenia

- `check:system1` — 284 przebiegi, OK (w tym kontrola: korona zakrywa krawędź dachu);
- `tsc -p tsconfig.app.json`, `oxlint` — bez błędów.

## Ograniczenia / dalej

- przy różnych wykończeniach ścian (np. front kaseton, bok goły PIR) przekroje korony różnią się — ucios bez wystających
  części, ale linie zagięć nie schodzą się 1:1 (dotyczy innych presetów, poza PoC);
- pokrycie trapezowe: żebra jako osobne bryły bez zakładów arkuszy — z ziemi niewidoczne, bez zmian.
