import { useState, type ReactNode } from 'react'
import { Icon } from './icons'

/** Ikona "i" z dymkiem — wyjaśnienie parametrów technicznych. */
export function InfoTip({ text }: { text: string }) {
  return (
    <span className="info-tip" tabIndex={0} role="note" aria-label={text}>
      <Icon.info />
      <span className="info-tip-bubble">{text}</span>
    </span>
  )
}

export function FieldLabel({ label, tip, value }: { label: string; tip?: string; value?: ReactNode }) {
  return (
    <span className="field-label">
      <span>{label}{tip && <InfoTip text={tip} />}</span>
      {value != null && <em>{value}</em>}
    </span>
  )
}

export function Group({ title, tip, children, aside }: { title: string; tip?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="cfg-group">
      <header>
        <h3>{title}{tip && <InfoTip text={tip} />}</h3>
        {aside}
      </header>
      {children}
    </section>
  )
}

const fmt = (value: number, step: number) => {
  const decimals = step >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(step)))
  return value.toFixed(decimals)
}

/** Pole liczbowe z przyciskami −/+ i jednostką. Wartość zatwierdzana na blur/Enter. */
export function NumberField({
  label, value, min, max, step = 1, unit, tip, onChange,
}: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; tip?: string
  onChange: (value: number) => void
}) {
  // szkic wpisywanej wartości — ważny tylko dla wartości, przy której zaczęto pisać
  const [draft, setDraft] = useState<{ source: number; text: string } | null>(null)
  const text = draft && draft.source === value ? draft.text : fmt(value, step)
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step))
  const commit = (raw: string) => {
    const parsed = Number(raw.replace(',', '.'))
    if (Number.isFinite(parsed)) onChange(Number(clamp(parsed).toFixed(4)))
    setDraft(null)
  }
  return (
    <label className="num-field">
      <FieldLabel label={label} tip={tip} />
      <div className="num-input">
        <button type="button" aria-label="Zmniejsz" onClick={() => onChange(Number(clamp(value - step).toFixed(4)))}><Icon.minus /></button>
        <input
          inputMode="decimal"
          value={text}
          onChange={(e) => setDraft({ source: value, text: e.target.value })}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value) }}
        />
        {unit && <span className="unit">{unit}</span>}
        <button type="button" aria-label="Zwiększ" onClick={() => onChange(Number(clamp(value + step).toFixed(4)))}><Icon.plus /></button>
      </div>
    </label>
  )
}

export function SelectField<T extends string>({
  label, value, options, tip, onChange,
}: {
  label: string; value: T; tip?: string
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <label className="select-field">
      <FieldLabel label={label} tip={tip} />
      <div className="select-wrap">
        <select value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon.chevron />
      </div>
    </label>
  )
}

export function Segmented<T extends string>({
  label, value, options, tip, onChange, size = 'md',
}: {
  label?: string; value: T; tip?: string; size?: 'sm' | 'md'
  options: Array<{ value: T; label: string; title?: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="segmented-field">
      {label && <FieldLabel label={label} tip={tip} />}
      <div className={'segmented ' + size} role="radiogroup">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            title={o.title}
            className={o.value === value ? 'on' : ''}
            onClick={() => onChange(o.value)}
          >{o.label}</button>
        ))}
      </div>
    </div>
  )
}

export function Switch({ label, checked, tip, note, onChange }: { label: string; checked: boolean; tip?: string; note?: string; onChange: (value: boolean) => void }) {
  return (
    <label className="switch-row">
      <span className="switch-text">
        <span>{label}{tip && <InfoTip text={tip} />}</span>
        {note && <small>{note}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden="true"><span /></span>
    </label>
  )
}

export function Swatches({
  label, value, options, onChange,
}: {
  label: string; value: string
  /** `swatch` — tło próbki, gdy wartość nie jest kolorem (np. dekor drewna) */
  options: Array<{ value: string; name: string; swatch?: string }>
  onChange: (value: string) => void
}) {
  const current = options.find((o) => o.value === value)
  return (
    <div className="swatch-field">
      <FieldLabel label={label} value={current?.name ?? value} />
      <div className="swatches">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.name}
            aria-label={o.name}
            className={o.value === value ? 'on' : ''}
            style={{ background: o.swatch ?? o.value }}
            onClick={() => onChange(o.value)}
          />
        ))}
      </div>
    </div>
  )
}

export type CardOption<T extends string> = { value: T; label: string; hint?: string; preview: string }

/** Wybór wizualny (np. styl elewacji) — karty z podglądem. */
export function CardPicker<T extends string>({ value, options, onChange }: { value: T; options: Array<CardOption<T>>; onChange: (value: T) => void }) {
  return (
    <div className="card-picker">
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          <span className="card-preview" style={{ background: o.preview }} />
          <strong>{o.label}</strong>
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  )
}
