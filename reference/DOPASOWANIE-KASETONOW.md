# Dopasowanie kasetonów — zaznacz i przeciągnij

Przycisk na pasku widoku (ikona elewacji) → tryb dopasowania. Działa na ścianach z kasetonami poziomymi (System A / B).

| uchwyt | gest | efekt |
|---|---|---|
| fuga pionowa (korpus, attyka) | w lewo / prawo | zmienia szerokości dwóch sąsiednich kasetonów (min. 200 mm) |
| fuga pozioma korpusu | w górę / w dół | wysokość pasa (200–800 mm) — wspólny rytm wszystkich ścian |
| linia attyki | w górę / w dół | początek attyki — nie niżej niż góra najwyższego otworu |
| pole (deska, lamele, okładzina) — środek | w lewo / prawo | przesunięcie pola; zatrzymuje się na otworach i innych polach |
| pole — krawędź | w lewo / prawo | szerokość pola |

- fugi na krawędziach otworów, pól i końcach ściany są stałe (wynikają z otworów);
- uchwyty tylko na ścianach zwróconych do kamery; podczas przeciągania podpis wymiaru (mm), skok 5 mm;
- zapis po puszczeniu: `config.cassetteEdits` (fugi, pas, attyka) i `config.geometry.decor` (pola); projekt przechodzi na
  „Własna konfiguracja” (wzorce galerii bez zmian), kamera zostaje w kadrze;
- jedno źródło: `cassetteWallLayout` (components.ts) — elewacja, BOM i uchwyty; BOM przelicza wymiary kasetonów;
- „Przywróć fugi” — usuwa `cassetteEdits` (pola zostają w nowym miejscu);
- fuga zapisana jako przesunięcie z położenia automatycznego — po zmianie otworów / wymiarów, gdy fugi tam już nie ma, wraca układ automatyczny.

Bez edycji układ i BOM wszystkich presetów — bez zmian.
