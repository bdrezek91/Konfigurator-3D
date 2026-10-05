import type { ComponentModel, ModelComponent } from './components'

/**
 * P11 — wycena na żywo. Pozycje cennikowe liczone z modelu komponentów (to samo źródło co BOM): jednostka wg rodzaju
 * elementu (płyty, kasetony, lamele — m²; profile stalowe, obróbki, uszczelnienia — mb; stolarka — m² otworu wg rodzaju;
 * pozostałe — szt.). CENY NIE SĄ W KODZIE: cennik wpisuje użytkownik (zapis w przeglądarce, eksport / import JSON).
 */
export type PriceUnit = 'm²' | 'mb' | 'szt.' | 'kg'
export type PriceItem = { key: string; label: string; unit: PriceUnit; quantity: number }
export type PriceList = Record<string, number>

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d

function itemFor(c: ModelComponent): { key: string; label: string; unit: PriceUnit; q: number } {
  const d = c.dimensions
  const areaM2 = d.netAreaM2 ?? (d.lengthMm * d.widthMm) / 1e6
  const lengthM = d.lengthMm / 1000
  switch (c.category) {
    case 'wall-panels':
    case 'roof-panels':
    case 'floor-panels':
      return { key: c.category + '|' + c.material, label: categoryLabel(c.category) + ' — ' + c.material, unit: 'm²', q: areaM2 * c.quantity }
    case 'floor-frame':
    case 'corner-posts':
    case 'roof-beams':
      return { key: 'steel|' + c.material, label: 'Profil stalowy — ' + c.material, unit: 'mb', q: lengthM * c.quantity }
    case 'flashings':
      return { key: 'flashing|' + c.material, label: 'Obróbka blacharska — ' + c.material, unit: 'mb', q: lengthM * c.quantity }
    case 'seals':
      return { key: 'seal|' + c.material, label: 'Uszczelnienie — ' + c.material, unit: 'mb', q: lengthM * c.quantity }
    case 'joinery': {
      const kind = c.opening?.kind ?? 'joinery'
      const name = c.namePL.replace(/\s+\S+$/, '')
      return { key: 'joinery|' + kind + '|' + (c.opening?.profile ?? '') + '|' + (c.opening?.roller ? 'roleta' : ''), label: 'Stolarka — ' + name + (c.opening?.roller ? ' + roleta' : ''), unit: 'm²', q: areaM2 * c.quantity }
    }
    case 'decor':
      return { key: 'decor|' + c.material, label: c.material, unit: 'm²', q: areaM2 * c.quantity }
    default: {
      // nazwa bez oznaczeń pozycji (FL / FR / BL / BR, numery) — jedna pozycja cennika na rodzaj elementu
      const name = c.namePL.replace(/\s+(?:FL|FR|BL|BR)(?=\s|$|,)/g, '').replace(/\s+\d+$/, '').trim()
      return { key: c.category + '|' + name, label: name, unit: 'szt.', q: c.quantity }
    }
  }
}

function categoryLabel(c: string) {
  return c === 'wall-panels' ? 'Płyta ścienna' : c === 'roof-panels' ? 'Płyta dachowa' : 'Płyta podłogowa'
}

export function priceItems(model: ComponentModel): PriceItem[] {
  const map = new Map<string, PriceItem>()
  for (const c of model.components) {
    if (c.category === 'fasteners') continue // łączniki — w cenie montażu (osobna pozycja ryczałtowa)
    const it = itemFor(c)
    const hit = map.get(it.key)
    if (hit) hit.quantity += it.q
    else map.set(it.key, { key: it.key, label: it.label, unit: it.unit, quantity: it.q })
  }
  const fasteners = model.components.filter((c) => c.category === 'fasteners').reduce((a, c) => a + c.quantity, 0)
  if (fasteners) map.set('fasteners', { key: 'fasteners', label: 'Łączniki (wkręty, nity, kotwy)', unit: 'szt.', quantity: fasteners })
  map.set('labour', { key: 'labour', label: 'Montaż i transport (ryczałt)', unit: 'szt.', quantity: 1 })
  return [...map.values()].map((p) => ({ ...p, quantity: round(p.quantity) }))
}

export function quote(items: PriceItem[], prices: PriceList) {
  let net = 0
  let missing = 0
  const lines = items.map((it) => {
    const price = prices[it.key]
    const value = price === undefined ? null : round(price * it.quantity)
    if (value === null) missing++
    else net += value
    return { ...it, price, value }
  })
  return { lines, net: round(net), missing }
}

/** VAT na pawilony / kontenery — ustawiany w cenniku (domyślnie 23 %, stawka podstawowa). */
export const DEFAULT_VAT = 0.23

const STORAGE = 'dampol3d.prices'
export function loadPrices(): { prices: PriceList; vat: number } {
  try {
    const raw = window.localStorage.getItem(STORAGE)
    if (raw) {
      const v = JSON.parse(raw) as { prices?: PriceList; vat?: number }
      return { prices: v.prices ?? {}, vat: typeof v.vat === 'number' ? v.vat : DEFAULT_VAT }
    }
  } catch {
    // brak pamięci przeglądarki — cennik tylko w tej sesji
  }
  return { prices: {}, vat: DEFAULT_VAT }
}
export function savePrices(prices: PriceList, vat: number) {
  try {
    window.localStorage.setItem(STORAGE, JSON.stringify({ prices, vat }))
  } catch {
    // jw.
  }
}

/** Cennik współdzielony między panelem wyceny a podsumowaniem (zdarzenie po zapisie). */
const EVENT = 'dampol3d-prices'
export function savePricesAndNotify(prices: PriceList, vat: number) {
  savePrices(prices, vat)
  window.dispatchEvent(new Event(EVENT))
}
export function onPricesChange(cb: () => void) {
  window.addEventListener(EVENT, cb)
  return () => window.removeEventListener(EVENT, cb)
}

export const formatPLN = (x: number) => x.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł'
