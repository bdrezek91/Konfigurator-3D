# Proof of concept E3 — światło i materiały — galeria-163

Zakres: tylko `galeria-163` (bramka `E3_POC_PROJECTS`, `?e3=0` wyłącza do porównań). Pozostałe presety — piksel w piksel jak
dotąd (kontrola galeria-207: różnica 0). Kasetony, geometria, kamera — bez zmian.

## Znalezione błędy (dotyczą WSZYSTKICH presetów — w PoC naprawione tylko na 163)

1. **Brak mapowania tonów w podglądzie.** `EffectComposer` (@react-three/postprocessing) wymusza `NoToneMapping` na rendererze,
   więc ACES z `onCreated` i `exposure` z presetów nie działały w podglądzie od czasu dodania N8AO — obraz był liniowy
   z obcięciem. Tryb HQ (path tracer, bez composera) używał ACES → HQ i podgląd mapowały tony inaczej.
   Poprawka: efekt `<ToneMapping>` w composerze (po AO, przed SMAA).
2. **Słońce HDRI nie zgadzało się ze światłem kierunkowym.** Dotychczasowy preset: tarcza słońca w mapie ~90° w azymucie
   i 18° w wysokości obok kierunku cieni — w szybach i blasze odbijało się słońce z innej strony niż padały cienie,
   a słońce z IBL oświetlało bok (stąd bok jaśniejszy od frontu: 98 vs 95, na zdjęciu odwrotnie 79 vs 104).
   Konwencja three.js (WebGLMaterials / WebGLBackground: `transpose`): azymut świata = azymut mapy − obrót; sprawdzone renderem
   kontrolnym przy obrocie ≠ π (przy obrocie π obie konwencje dają to samo — dlatego dotąd niezauważone).
   Poprawka: `sunAlignedDay()` — światło kierunkowe dokładnie w tarczy słońca mapy (`HDRI_SUN`, pomiar pliku 2k).

## Zmiany E3 (galeria-163)

| element | before | after |
|---|---|---|
| HDRI | kloofendal (otwarte pole, skały) | **pretoria_gardens** (Poly Haven CC0: trawnik, drzewa — odbicia w szybach) |
| słońce | ~90° obok tarczy HDRI | w tarczy HDRI (wysokość 52°, azymut jak dotąd: front z lewej) |
| mapowanie tonów | brak (patrz błąd 1) | **Neutral** (Khronos PBR Neutral — wierne kolory produktu) |
| ekspozycja / niebo / słońce | 0,95* / 1,45 / 2,0 (*nieaktywna) | 1,25 / 2,2 / 1,6 |
| wnętrze | pełne światło nieba (IBL bez zasłonięcia) | jawna mapa otoczenia × 0,2 (≈ udział światła dziennego przy dużym przeszkleniu, ASSUMPTION) |
| szkło | odbicie 3,4, tłumienie 0,5 (obejście „mleka”) | odbicie 2,5, **LT 0,78** (fizyczny pakiet low-E) |

Wybór HDRI i mapowania tonów — pomiarem (6 wariantów; park_parking odrzucone: bliska ciemna ściana drzew, inna niż podwórka Dampol).

## Pomiar: łaty sRGB zdjęcie 163 vs render (widok „Perspektywa”)

| łata | zdjęcie 163 | before | after |
|---|---|---|---|
| lico frontu (słońce) | 95/104/118 | 95/96/96 | **101/111/118** |
| bok (cień) | 79/79/77 | 98/101/107 | **82/85/68** |
| deska | 232/152/67 | 192/126/72 | 248/172/108 |
| szyba drzwi | 92/92/74 | 110/121/126 | **92/94/86** |
| front / bok | 1,35 | 0,94 | **1,41** |
| średni błąd (front, bok, deska, szyba) | — | 22,5 | **10,3** |

## Ograniczenia

- tył w cieniu wychodzi ciemny (23/34/29): w tym kierunku mapa ma bliskie drzewa — fizycznie spójne, ale ciemniej niż typowe
  zdjęcia (brak odbić od płotów / zabudowy z kontekstu zdjęć); kolejny krok: HDRI nagrane na placu Dampol albo lżejsze tło;
- bok lekko ciepły (zielony odblask trawnika z mapy); deska jaśniejsza i mniej nasycona niż na zdjęciu (tekstura generowana —
  skan PBR to osobny krok);
- tło HDRI 2k miękkie z bliska; `?env=`, `?tm=`, `?light=`, `?int=`, `?gls=` — parametry diagnostyczne (kalibracja), jak `?L=`;
- render programowy (swiftshader); tryb HQ z nowym mapowaniem nie sprawdzany.

## Do decyzji

Błędy 1 i 2 dotyczą wszystkich presetów. Poprawka na pozostałych zmieni ich zatwierdzony wygląd (jaśniejsze / ciemniejsze
partie, inne odbicia) — proponuję przenieść E3 po akceptacji tego PoC, preset po presecie z tym samym pomiarem łat.
