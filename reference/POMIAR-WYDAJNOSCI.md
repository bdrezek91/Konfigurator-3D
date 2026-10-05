# Pomiar wydajności na urządzeniu (P14)

Dodaj `?perf=1` do adresu konfiguratora (np. `…/konfigurator3d/?preset=galeria-207&perf=1`). W lewym górnym rogu widoku:

- **FPS** i **czas klatki** — mediana i p95 z ostatnich ~10 s (p95 pokazuje przycięcia),
- **draw calls / trójkąty** pełnej klatki (cień + AO + obraz + postprocessing),
- **tryb jakości** (auto obniża przy spadku FPS), **DPR**, liczba tekstur, **GPU** urządzenia.

„Kopiuj wynik” kopiuje JSON (wyniki + model urządzenia, rdzenie, pamięć, ekran) — do wklejenia w raport.

Sugerowany test: telefon (Android / iPhone) i laptop, presety galeria-207, galeria-163, własna konfiguracja; po 15 s obracania
kamery odczytać wynik. Tryby: `&q=low|medium|high|ultra` wymuszają poziom jakości.

W kontenerze CI (render programowy SwiftShader) FPS jest niemiarodajny (~3 FPS) — dlatego pomiar na prawdziwym sprzęcie.
