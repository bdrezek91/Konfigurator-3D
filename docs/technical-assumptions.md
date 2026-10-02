# Założenia techniczne — model V5

Stan odniesienia: branch `technical-exploded-v1`.

> Ważne: zgodność modelu 3D z BOM oznacza spójność jednego źródła danych, a nie automatycznie poprawność wykonawczą. Poniższe pozycje muszą być zastąpione danymi Dampol / projektanta / systemodawcy tam, gdzie są oznaczone jako szacunek.

## Źródła zewnętrzne użyte do weryfikacji

- Paneltech, **Technical catalog – Sandwich panels 2026.1**: moduły płyt, zakres grubości okładzin, zasada doboru liczby łączników z tabel obciążeń, wkręty zszywające zakład dachu co ok. 300–400 mm.
- Paneltech, **Flashings & accessories / fasteners**: rodzaje łączników do płyt i obróbek; obróbki zgodne kolorystycznie z płytami typowo 0,50–0,75 mm.
- Balex Metal, **Sandwich panel assembly instruction / technical catalogues**: montaż płyt, uszczelnienia styków, obróbki maskujące.
- Projekty Dampol zapisane w `projectGeometries.ts` i presetach — wymiary bryły, otwory i dekoracje tam, gdzie dane są wymiarowane.

## Pełna lista założeń

| Kod / element | Wartość w modelu | Pochodzenie | Wpływ na ilości | Jak zweryfikować |
|---|---|---|---|---|
| A-WALL-MODULE | 1000 mm | **Katalog + wybór modelu**. Paneltech dopuszcza 1130, 1000, opcjonalnie 1050 mm; projekt nie koduje typu zamka/modułu | **Bardzo wysoki**: liczba paneli, styków, wkrętów, odpady | Podać faktyczny kod płyty ściennej i szerokość modularną stosowaną przez Dampol |
| A-ROOF-MODULE | 1050 mm | **Katalog + produkcja**. Paneltech PWPIR-D: 1050 mm modularnie | **Wysoki**: liczba płyt dachowych i zakładów | Potwierdzić konkretny typ płyty dachowej na zamówieniu/fakturze |
| FLOOR-MODULE | 1000 mm | **Szacunek** | Średni: liczba obiektów podłogi, odpady | Podać rzeczywisty sposób cięcia/układ płyty podłogowej |
| PIR100 masa | 12,5 kg/m² | **Szacunek modelu**; Paneltech PWPIR-S 100 z okładziną 0,5 mm podaje ok. 12,3 kg/m² | Tylko masa | Podmienić z karty dokładnie kupowanej płyty |
| PIR120 masa | 13,3 kg/m² | **Szacunek modelu**; katalog Paneltech dla PWPIR-S 120 ok. 13,1 kg/m² | Tylko masa | jw. |
| PIR160 / EPS100 masa | 14,9 / 10,8 kg/m² | **Szacunek** | Tylko masa | Karta produktu/faktura producenta |
| A-SHEET | blacha obróbek 0,50 mm, stal 7850 kg/m³ | **Katalog + własność materiału**. Paneltech podaje obróbki kompatybilne z płytami m.in. 0,50–0,75 mm | Masa, nie mb | Specyfikacja giętarki / zamówienie blachy Dampol |
| Okładzina PIR | model nie rozdziela dokładnie 0,5/0,4–0,6 mm obu stron | **Katalog** zakresu; brak dokładnego wariantu w projekcie | Masa i detal przekroju | Kod zamawianej płyty |
| Kątownik angle50 | 50×50×4 mm | **Projekt/nazwa konfiguracji + założenie grubości** | **Wysoki**: masa i konstrukcja | Rysunek warsztatowy / karta profilu |
| Profil full100 | 100×100×3 mm | **Projekt/nazwa + założenie 3 mm** | **Wysoki** | Rysunek konstrukcyjny / faktura profilu |
| Poprzeczki ramy podłogi | około co 1,0 m | **Szacunek** | **Wysoki**: stal, śruby, masa | Rysunek ramy/spawania 722 |
| Belki/płatwie dachowe | około co 1,0 m wzdłuż długości | **Szacunek** | **Wysoki**: stal, punkty mocowania dachu | Rysunek konstrukcji dachowej |
| A-WALL-FASTENERS | 4 szt. na panel: 2 góra + 2 dół | **Szacunek**. Katalog Paneltech wymaga doboru z tabel obciążeń; przykład katalogowy może wymagać 3 na podporę | **Bardzo wysoki**: wkręty panelowe | Typ panelu, rozstaw podpór, strefa wiatrowa/obciążenie i tabela producenta; najlepiej rzeczywista norma produkcyjna Dampol |
| A-ROOF-SUPPORTS | linie podparcia max 1500 mm; 2 wkręty/panel/podporę | **Szacunek** | **Bardzo wysoki** | Rysunek konstrukcji + tabela nośności wybranego PWPIR-D |
| Zszycie zakładów dachu | **obecnie brak osobnej kategorii BOM** | **Brak w modelu / luka**. Paneltech podaje wkręt samowiercący z uszczelką co ok. 300–400 mm na zakładzie | **Wysoki**: model może zaniżać konkretną kategorię wkrętów dachowych o kilkadziesiąt sztuk | Potwierdzić, czy Dampol zszywa każdy zakład i z jakim rozstawem |
| A-FLASHING-SCREWS | 300 mm, jedna linia; model naprzemiennie klasyfikuje screw/rivet | **Szacunek**. Paneltech podaje typy wkrętów/nitów, ale nie jedną uniwersalną podziałkę dla wszystkich obróbek | **Bardzo wysoki**: obecnie setki sztuk | Norma warsztatowa Dampol osobno dla cokołu, attyki, narożnika, ościeża i dachu |
| Kotwy/śruby ramy | model daje łącznik na co drugi element listy konstrukcyjnej | **Czyste założenie wizualne** | **Wysoki** i nie nadaje się jeszcze do zakupów | Rysunek spawany/skręcany ramy; podać które węzły są spawane, które skręcane |
| Narożnik zewnętrzny | rozwinięcie 250 mm | **Szacunek** | Średni dla masy/blachy; niski dla mb | Rysunek gięcia Dampol |
| Attyka/pas górny | rozwinięcie 280 mm | **Szacunek** | Średni | Rysunek gięcia / rzeczywisty pas kasetonowy |
| Opierzenie/okap dachu | rozwinięcie 185 mm | **Szacunek** | Średni | Rysunek gięcia |
| Obróbka cokołowa | rozwinięcie 155 mm | **Szacunek** | Średni | Rysunek gięcia |
| Ościeża/nadproże | rozwinięcie 160 mm | **Szacunek** | Średni | Detal stolarki |
| Parapet zewnętrzny | rozwinięcie 195 mm | **Szacunek** | Średni | Detal parapetu |
| Listwa na każdym styku paneli | rozwinięcie 120 mm; każdy styk co moduł | **Szacunek, obecnie podejrzany**. Standardowy zamek płyty nie oznacza automatycznie zewnętrznej listwy na każdym styku | **Krytyczny**: dla 722 dodaje 44,32 mb obróbek i dużą część wkrętów/nitów | Powiedzieć, czy Dampol faktycznie zakłada taką listwę na każdym pionowym styku PIR; jeśli nie — usunąć z BOM |
| Rynna | szer. 125 mm, rozwinięcie 280 mm, blacha 0,6 mm | **Szacunek** | Średni | Typ systemu rynnowego Dampol |
| Rura spustowa | Ø/width 80 mm, 0,6 mm | **Szacunek** | Niski/średni | jw. |
| A-SEALS | taśma 20×3 mm, ciągła przy podwalinie i obwodzie stolarki | **Szacunek zgodny z zasadą systemową, nie konkretnym produktem** | Średni: mb taśm | Karta używanej taśmy/uszczelki i detal wykonawczy |
| Stolarka — głębokość modelowa | 70 mm | **Szacunek wizualny** | Niski dla obecnego BOM, wysoki dla dokładnego detalu | System ALU/PVC używany przez Dampol |
| Dekor — kaseton | grubość modelowa 50 mm | **Szacunek wizualny** | Niski dla obecnych ilości | Przekrój podkonstrukcji kasetonu |
| Dekor — lamele | grubość modelowa 52 mm | **Szacunek wizualny** | Niski/średni | Faktyczna listwa i podkonstrukcja |
| Szczelina fallback między otworami | 100 mm | **Szacunek tylko dla własnej konfiguracji bez projektu** | Wysoki dla geometrii fallback; nie wpływa na wymiarowane presety | Dla produkcji używać wymiarowanych otworów, nie fallback |
| Osprzęt instalacyjny — pozycje | rozmieszczenie proceduralne, jeśli projekt nie podaje współrzędnych | **Szacunek wizualny** | Niski dla materiałów, wysoki dla rysunku wykonawczego | Projekt elektryki/hydrauliki |
| Wykończenie podłogi | 4 mm | **Szacunek** | Niski | Specyfikacja wykładziny/paneli |

## 722/08/26 — audyt praktyczności aktualnego modelu

Preset: 6,03 × 2,96 m, PIR100, konstrukcja angle50.

### Aktualny model

- panele ścienne: 20 szt.
- panele dachowe: 6 szt.
- wkręty paneli ściennych: 80 szt.
- wkręty konstrukcyjne dachu: 36 szt.
- wkręty obróbek: 257 szt.
- nity obróbek: 222 szt.
- kotwy/śruby konstrukcyjne: 12 szt.
- razem łączniki w modelu: **607 szt.**
- obróbki: **122,568 mb**
- z tego listwy na stykach paneli: **44,320 mb**

### Szacowane widełki praktyczne — do konfrontacji z produkcją Dampol

To nie jest norma projektowa ani gotowy zakup. To kontrola zdroworozsądkowa oparta na geometrii 6×3 i katalogowych zasadach montażu.

#### Obróbki

Elementy, które najczęściej rzeczywiście występują przy takiej bryle:
- cokół: ok. 18 mb,
- naroża: ok. 11 mb,
- krawędzie/okap dachu: ok. 18 mb,
- ościeża/nadproża/parapety dla obecnej stolarki: ok. 13 mb,
- pas/attyka: zależnie od technologii ok. 0–18 mb jako osobna obróbka.

Daje **około 60–78 mb netto**. Po doliczeniu zakładów, docinek i zapasu rozsądny zakres kontrolny to **około 65–90 mb**.

Aktualne **122,6 mb jest powyżej tego zakresu o ok. 32,6–57,6 mb**. Główną przyczyną jest 44,32 mb automatycznych listew na wszystkich stykach paneli. Status: **DO KOREKTY / wymaga danych z produkcji**.

#### Łączniki

Kontrolny rozkład dla 6×3:
- panele ścienne: ok. **80–120 szt.** zależnie od liczby łączników na podporę,
- mocowanie paneli dachowych do podpór: ok. **18–36 szt.**,
- zszycie zakładów dachowych co 300–400 mm: ok. **40–50 szt.** dla ~5 zakładów po ok. 3 m,
- obróbki: przy ~65–90 mb i podziałce zależnej od detalu ok. **150–280 szt.** wkrętów/nitów,
- pozostałe śruby/kotwy konstrukcyjne: roboczo **12–30 szt.**, ale ta pozycja wymaga rysunku ramy.

Razem kontrolnie: **około 300–515 szt. wszystkich łączników**.

Aktualne **607 szt. jest powyżej tego roboczego zakresu**. Nie uznaję 607 za poprawne. Jednocześnie skład liczby jest niewiarygodny: aż 479 szt. przypisano obróbkom, a osobne zszycie zakładów dachowych nie jest jeszcze wydzielone.

### Dane potrzebne od produkcji, żeby zamknąć temat

1. Ile wkrętów do ścian zużywacie na typowy 6×3 PIR100?
2. Ile wkrętów głównych + zszywających idzie na dach 6×3?
3. Czy na pionowych stykach płyt ściennych montujecie osobną listwę/obróbkę? Jeśli tak: jaką i na których elewacjach?
4. Ile mb obróbek wychodzi realnie z listy cięcia na 6×3: cokół, naroża, attyka, dach, stolarka?
5. Jaki jest typowy rozstaw wkrętów/nitów na każdej z tych obróbek?
6. Czy rama angle50 jest spawana, skręcana czy mieszana; ile rzeczywistych śrub/kotew trafia do BOM?
