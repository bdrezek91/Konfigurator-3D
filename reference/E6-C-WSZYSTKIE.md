# E6-C — nowa architektura dla wszystkich pawilonów

Zasada (`src/render/architecture.ts`): **każdy pawilon** — galerie, presety projektów, „Własna konfiguracja” — idzie nową ścieżką
(renderer warstw E0, stolarka z przekrojów E1, kasetony jako tace E2, kaseton-deska jako tace, podkładki z modelu komponentów,
ucios korony / cokołu E4, tryby jakości i LOD E5). Wyjątek: **światło E3 tylko galeria-163** (na 207 oddalało render od
zdjęcia — E6-B, rozdz. 3); `?e3=1` / `?e3=0` do porównań.

## Reguły ogólne (zamiast bramek per preset)
- **stolarka z przekrojów** dla otworów, które biblioteka umie złożyć (`sectionJoinerySupports`): witryna FIX i drzwi przeszklone
  jednoskrzydłowe, profil ALU standard, bez rolety; sąsiednie ramy sprzęgane (½ słupka). Pozostałe — drzwi dwuskrzydłowe / pełne,
  okna otwierane, PVC, ALU slim (galeria-03), rolety — dotychczasowy `OpeningFrame` dla tego otworu, aż biblioteka dostanie ich przekroje;
- **pochwyt** (drzwi przeszklone, domyślny uchwyt) w bibliotece okuć: pręt 26 mm na dwóch wspornikach, wymiary jak dotychczasowy render;
- **kaseton-deska jako tace** tylko na ścianach bez kasetonów poziomych (tam deska to kasetony z dekorem drewna);
- **podkładki** z modelu komponentów, ukryte przy prześwicie < 15 mm (jak dotąd).

## Wynik
| konfiguracja | siatki przed → po | draw calls / klatkę (HIGH) |
|---|---:|---:|
| Własna konfiguracja (domyślna) | 470 → 72 | 1315 → **210** |
| Własna konfiguracja, deska pozioma | 364 → 45 | 997 → **130** |
| galeria-13 | 393 → 25 | 1096 → **77** |
| galeria-03 | 376 → 134 | 1040 → **399** (lamele i stolarka ALU slim — dotychczasowy render) |
| galeria-207 / 163 | bez zmian względem E6-B / E6-A (0 pikseli) | 84 / 66 |

- BOM (CSV) **identyczny** dla wszystkich 18 presetów i własnej konfiguracji;
- `tsc`, `oxlint`, `validation`, `check:system1` (284 przebiegi) — OK;
- zmiany wyglądu: stolarka (przekroje zamiast boxów), kasetony / deska jako tace (deska pozioma: równomierne lico bez plam połysku
  starego materiału), podkładki, ucios korony — porównania w `reference/comparisons/e6-c/`.

## UI
W wyborze projektu: tylko wzorce z galerii i „Własna konfiguracja”. Presety projektów zostają w danych (walidacja, testy,
laboratorium konstrukcji).

## Do zrobienia
- przekroje dla drzwi dwuskrzydłowych / pełnych, okien otwieranych, PVC, ALU slim i rolet — potem `OpeningFrame` do usunięcia;
- BOM i tryb techniczny na `Part[]` (stolarka nadal opisana drugi raz w `components.ts`);
- światło per preset (wariant „pochmurno” dla 207 i innych).
