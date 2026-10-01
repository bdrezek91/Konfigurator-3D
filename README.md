# Konfigurator 3D — Dampol Investment

Pierwsza działająca wersja webowego konfiguratora pawilonów.

## V1
- React + TypeScript + Vite
- Three.js przez React Three Fiber
- parametryczna długość, szerokość i wysokość
- kolory RAL
- drzwi i okna frontowe
- podziały paneli
- rama narożna
- opcjonalne lamele
- obrót i zoom modelu 3D
- podstawowe podsumowanie powierzchni
- eksport konfiguracji do JSON

## Uruchomienie
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

## Następne etapy
Reguły konstrukcyjne i materiałowe zostaną zastąpione danymi wynikającymi z projektów technicznych Dampol. Docelowo: BOM, cennik, zapis projektów, PDF i integracja z ERP.
