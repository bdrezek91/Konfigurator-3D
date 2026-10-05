# P1 — światło „pochmurno” (E3)

- HDRI `cloudy_vondelpark_2k` (Poly Haven, CC0): pełne zachmurzenie, park jesienią — ten sam typ dnia co zdjęcie 207.
  Najjaśniejsze niebo przy zenicie (el. ≈ 84°, 3,2 × mediana nieba) → światło kierunkowe słabe i wysokie, miękkie cienie.
- Mapowanie tonów Neutral (jak E3 „słońce”), ekspozycja 0,8, otoczenie 3,0, tło 0,9, słońce 0,3; mnożnik drewna 0,78,
  trawa jak E3.
- Zasada (`render/architecture.ts`): wszystkie pawilony — „pochmurno”; galeria-163 — „słońce” (zdjęcie 163).
  Diagnostyka: `?e3=overcast|sun|0`, `?light=ekspozycja,otoczenie,tło,słońce`.

## Kalibracja (łaty sRGB, ten sam kadr galerii-207)

| łata | zdjęcie 207 | dotychczas (bez E3) | E3 słońce | **pochmurno** |
|---|---|---|---|---|
| kaseton front | 47 / 52 / 60 | 63 / 66 / 68 | 94 / 104 / 110 | **41 / 49 / 59** |
| attyka | 49 / 53 / 62 | 68 / 70 / 73 | 104 / 113 / 119 | **43 / 52 / 62** |
| deska | 157 / 100 / 53 | 184 / 123 / 74 | 242 / 169 / 109 | **157 / 97 / 26** |
| średni błąd | — | 17,3 | — | **5,2** |

Deska: kanał niebieski niższy niż na zdjęciu (dekor 207 to ciemniejszy „złoty dąb” niż sosna 163) — do ewentualnej
osobnej tekstury dekoru.

Rozmiar: +7,2 MB (HDRI 2k) w `public/hdri`.

## P4 — podgląd vs HQ (galeria-207, światło pochmurne, HQ 12 próbek)

| łata | podgląd | HQ | śr. \|Δ\| |
|---|---|---|---|
| szyba | 43 / 43 / 35 | 46 / 51 / 40 | **5,6** (przed: 49 przy świetle słonecznym 163) |
| kaseton | 39 / 47 / 56 | 32 / 43 / 53 | 4,8 |
| deska | 155 / 95 / 26 | 136 / 85 / 23 | 10,8 |

Rozproszone światło pochmurne (bez słońca) zbliża IBL podglądu do GI path tracera — szkło bez zmian parametrów.
Obrzeże kasetonu z wkrętami: przełącznik w panelu Elewacja → Kasetony (`config.cassetteFlange`, domyślnie wyłączony).
