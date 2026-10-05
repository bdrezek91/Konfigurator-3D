import { useMemo, useRef } from 'react'
import type { ComponentModel } from '../components'
import { formatPLN, priceItems, quote, savePricesAndNotify, type PriceList } from '../pricing'
import { usePrices } from './usePrices'
import { Group } from './controls'
import { Icon } from './icons'

/**
 * Wycena na żywo (P11): pozycje z modelu komponentów × ceny jednostkowe z cennika użytkownika. Brak ceny = pozycja
 * pominięta w sumie i oznaczona (bez zgadywania cen). Cennik: zapis w przeglądarce, eksport / import JSON.
 */
export function PricingPanel({ model }: { model: ComponentModel }) {
  const { prices, vat } = usePrices()
  const items = useMemo(() => priceItems(model), [model])
  const q = useMemo(() => quote(items, prices), [items, prices])
  const file = useRef<HTMLInputElement>(null)
  const set = (next: PriceList, v = vat) => savePricesAndNotify(next, v)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ version: 1, vat, prices, labels: Object.fromEntries(items.map((i) => [i.key, i.label + ' [' + i.unit + ']'])) }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'cennik-dampol.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importJson = async (f: File) => {
    try {
      const v = JSON.parse(await f.text()) as { prices?: PriceList; vat?: number }
      if (v.prices) set({ ...prices, ...v.prices }, typeof v.vat === 'number' ? v.vat : vat)
    } catch {
      window.alert('Nie udało się wczytać cennika (oczekiwany plik JSON z eksportu).')
    }
  }

  return (
    <Group title="Wycena" tip="Ilości z modelu (to samo źródło co BOM i widok 3D). Ceny jednostkowe wpisujesz Ty — zapisują się w tej przeglądarce; eksport / import JSON przenosi cennik."
      aside={<span className="muted">{q.missing ? 'brak cen: ' + q.missing : 'komplet'}</span>}>
      <div className="table-wrap">
        <table className="pricing">
          <colgroup><col /><col style={{ width: 72 }} /><col style={{ width: 88 }} /></colgroup>
          <thead><tr><th>Pozycja</th><th>Ilość</th><th>Cena / j.m.</th></tr></thead>
          <tbody>
            {q.lines.map((l) => (
              <tr key={l.key} className={l.price === undefined ? 'missing' : ''}>
                <td>{l.label}</td>
                <td className="num">{l.quantity.toLocaleString('pl-PL')} {l.unit}</td>
                <td>
                  <input type="number" min={0} step={0.01} inputMode="decimal" aria-label={'Cena: ' + l.label} value={l.price ?? ''} placeholder="—"
                    onChange={(e) => {
                      const next = { ...prices }
                      if (e.target.value === '') delete next[l.key]
                      else next[l.key] = Number(e.target.value)
                      set(next)
                    }} />
                  <small>{l.value === null ? '—' : formatPLN(l.value)}</small>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={2}>Netto{q.missing ? ' (bez ' + q.missing + ' poz.)' : ''}</td><td className="num">{formatPLN(q.net)}</td></tr>
            <tr>
              <td colSpan={2}>VAT <input type="number" min={0} max={100} step={1} aria-label="Stawka VAT" value={Math.round(vat * 100)} onChange={(e) => set(prices, Number(e.target.value) / 100)} /> %</td>
              <td className="num">{formatPLN(q.net * vat)}</td>
            </tr>
            <tr className="total"><td colSpan={2}>Brutto</td><td className="num">{formatPLN(q.net * (1 + vat))}</td></tr>
          </tfoot>
        </table>
      </div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={exportJson}><Icon.download /> Cennik JSON</button>
        <button type="button" className="btn" onClick={() => file.current?.click()}>Wczytaj cennik</button>
        <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importJson(f); e.target.value = '' }} />
      </div>
    </Group>
  )
}
