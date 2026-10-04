/**
 * Generuje reference/VALIDATION.md z jednego źródła: src/physical/spec.ts (+ wymiary wyliczone Systemu 1).
 * Uruchom: npm run validation
 */
import { writeFileSync } from 'node:fs'
import { buildSystem1 } from '../src/construction/system1/build'
import { PHYS, RENDER, type PhysicalParam } from '../src/physical/spec'
import { PRESETS } from '../src/presets'

const RANK = ['', 'zdjęcie', 'film', 'pomiar zdjęcia', 'katalog', 'produkcja', 'rysunek', 'szkic', 'założenie']
const esc = (s: string) => s.replace(/\|/g, '\\|')
const val = (p: PhysicalParam) => (p.unit === '-' ? String(p.value) : `${p.value} ${p.unit ?? 'mm'}`)

const rows: string[] = []
const counts: Record<string, number> = {}
for (const [group, params] of Object.entries(PHYS)) {
  for (const [key, p] of Object.entries(params as Record<string, PhysicalParam>)) {
    counts[p.confidence] = (counts[p.confidence] ?? 0) + 1
    const problem = [p.conflict, p.todo].filter(Boolean).join(' · ')
    const proposed = p.previous != null ? `było ${p.previous} → ${val(p)}` : p.status === 'OPEN' ? 'zmierzyć' : '—'
    rows.push(`| \`${group}.${key}\` ${esc(p.element)} | ${val(p)} | ${RANK[p.rank]}: ${esc(p.source)} | **${p.confidence}** | ${esc(problem) || '—'} | ${esc(proposed)} | ${p.status} |`)
  }
}

const cfg = PRESETS.find((p) => p.id === '722-08-26')!.config
const s1 = buildSystem1(cfg, 'bare')
const derived = s1.derived.map((d) => `| ${d.label} | ${d.valueMm} | ${esc(d.formula)} | **${d.confidence}** | ${d.check ? (d.check.ok ? '✓ ' : '✗ ') + esc(d.check.expected) : '—'} |`)

const md = `# Rejestr walidacji modelu — wartości, źródła, niewiadome

> Plik generowany: \`npm run validation\` (źródło: \`src/physical/spec.ts\`, \`src/construction/system1/build.ts\`). Nie edytuj ręcznie.

Hierarchia źródeł: 1 zdjęcie gotowego pawilonu · 2 film · 3 pomiar zdjęcia ze skalą · 4 katalog · 5 produkcja · 6 rysunek · 7 szkic · 8 założenie.
Przy sprzeczności wygrywa źródło wyżej; sprzeczność opisana w kolumnie „problem”.

Pewność: ${['VERIFIED', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'].map((c) => `${c} ${counts[c] ?? 0}`).join(' · ')}

## Wartości fizyczne

| element | obecna wartość | źródło | pewność | problem | proponowana wartość | status |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## System 1 (kątownik 50×50×4) — wymiary wyliczone z konstrukcji (preset 722/08/26, rama ${Math.round(cfg.length * 1000)} × ${Math.round(cfg.width * 1000)} mm)

| wymiar | wartość | wzór | pewność | kontrola z produkcją |
|---|---|---|---|---|
${derived.join('\n')}

## Niewiadome Systemu 1 (do potwierdzenia na produkcji)

| klucz | stan | co rozstrzygnie |
|---|---|---|
| topFramePosition | HIGH — leży na dachu/obróbce (na żebrach trapezu), dospawana do słupów; nieprzykryta; ucha φ16 w narożach (produkcja 2026-10-02/04, WA0019, zdjęcie) | położenie uch (LOW) |
| topFrameCornerRaise | HIGH — 3–8 mm (silikon + wasserstop, „zależy jak ktoś położy”, produkcja 2026-10-03); w geometrii 0 (poniżej skali) | — |
| cornerAngleHeight | HIGH — słup = rama + podłoga + ściana + dach + ~50 mm (produkcja: „jakieś 5 cm” nad dach; zdjęcie 12–15 cm = przed przycięciem, potwierdzone 2026-10-03) | — |
| roofSupportDetail | MEDIUM — dach leży na ścianach, luz 6 mm/stronę z danych 2,94 m | przekrój/rysunek oparcia dachu |
| sideWallCalculatedLength | HIGH — 2752 mm = W − 2·4 − 2·100, zgodne z produkcją 2740–2760 | — |
| flashingOffset | HIGH — „1,5 / 2,5” to cm: półtorówka 15 mm, na kwadraty 25 mm (produkcja + szkice 2026-10-02) | — |
| squareFlashing („na kwadraty”) | HIGH — szkic produkcji; brak zdjęcia gotowej realizacji; długość powrotu i kapinosu nieznana | zdjęcie/rysunek gięcia |
| baseFlashing (cokół) | odsunięcie 15 mm HIGH (produkcja), skos 16° i kołnierz 16 mm MEDIUM (wyliczone ze zdjęcia, skala z lica 140 mm) | rysunek gięcia |
| intermediateFloorSupports | UNKNOWN — opis wymienia tylko obwód | potwierdzenie produkcji |
| wallModuleVsFrameLength | ROZSTRZYGNIĘTE — rama 6030 × 2960, 6 płyt × 1000 na froncie, ostatnia płyta docinana gdy się nie mieści; ściana boczna 3 płyty (2 × 1000 + 752) | — |
| cornerContact | VERIFIED — blacha płyty skrajnej o ramię słupa, czoło (rdzeń/zamek) o drugie ramię | — |
| flashingBendDrawing | czeka na rysunek gięcia (zapowiedziany przez produkcję) | rysunek gięcia obróbek A/B i „na kwadraty” |
| screwSpacing (podłoga, słupy) | UNKNOWN — wizualizacja co 600 / 500 mm | technologia montażu |
| system_2, system_3 | nie modelowane | opis produkcji |

## Parametry renderingu (nie są wymiarami fizycznymi)

| parametr | wartość | uwaga |
|---|---|---|
${Object.entries(RENDER).map(([k, r]) => `| \`${k}\` | ${r.value} | ${esc(r.note)} |`).join('\n')}

## Pomiary zdjęć i filmów

Szczegóły metody i wyniki: [reference/gallery/POMIARY.md](gallery/POMIARY.md). Konstrukcja Systemu 1: [reference/construction/SYSTEM1.md](construction/SYSTEM1.md).
`
writeFileSync(new URL('../reference/VALIDATION.md', import.meta.url), md)
console.log('reference/VALIDATION.md —', rows.length, 'parametrów,', derived.length, 'wymiarów wyliczonych')
