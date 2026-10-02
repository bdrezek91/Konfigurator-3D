import { useMemo } from 'react'
import type { ComponentModel } from '../components'
import { ACCURACY_HELP, ACCURACY_LABELS, type Metric } from './metrics'
import type { BomRow } from '../logic'
import type { PavilionConfig, ValidationItem } from '../types'
import { Group } from './controls'
import { Icon } from './icons'

export function MetricGrid({ metrics, compact = false }: { metrics: Metric[]; compact?: boolean }) {
  return (
    <div className={'metric-grid' + (compact ? ' compact' : '')}>
      {metrics.map((item) => (
        <div key={item.label} className="metric">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          <i className={'acc acc-' + item.accuracy} title={ACCURACY_HELP[item.accuracy]}>{ACCURACY_LABELS[item.accuracy]}</i>
        </div>
      ))}
    </div>
  )
}

export function ValidationList({ items }: { items: ValidationItem[] }) {
  return (
    <ul className="validation-list">
      {items.map((item, i) => (
        <li key={i} className={'v-' + item.level}>
          <span>{item.level === 'ok' ? <Icon.check /> : <Icon.alert />}</span>
          {item.message}
        </li>
      ))}
    </ul>
  )
}

/** Zawartość zakładki "Techniczne": metryki, struktura dokładności, walidacja, BOM, założenia, eksport. */
export function TechnicalTab({
  config, model, metrics, validation, bom, onExportCsv, onExportJson, onOpenTechnical,
}: {
  config: PavilionConfig
  model: ComponentModel
  metrics: Metric[]
  validation: ValidationItem[]
  bom: BomRow[]
  onExportCsv: () => void
  onExportJson: () => void
  onOpenTechnical: () => void
}) {
  const breakdown = useMemo(() => {
    const counts = { exact: 0, 'project-estimate': 0, assumption: 0 }
    for (const c of model.components) counts[c.sourceAccuracy] += 1
    return counts
  }, [model])
  const total = model.components.length || 1

  return (
    <>
      <Group title="Metryki z modelu" tip="Wszystkie wartości liczone z tego samego modelu komponentów co widok 3D i BOM.">
        <MetricGrid metrics={metrics} />
        <div className="accuracy-bar" aria-label="Struktura dokładności elementów">
          <span className="acc-exact" style={{ width: (breakdown.exact / total) * 100 + '%' }} />
          <span className="acc-project" style={{ width: (breakdown['project-estimate'] / total) * 100 + '%' }} />
          <span className="acc-assumption" style={{ width: (breakdown.assumption / total) * 100 + '%' }} />
        </div>
        <div className="accuracy-legend">
          <span><i className="dot acc-exact" />dokładne {breakdown.exact}</span>
          <span><i className="dot acc-project" />z projektu {breakdown['project-estimate']}</span>
          <span><i className="dot acc-assumption" />założenia {breakdown.assumption}</span>
        </div>
      </Group>
      <Group title="Walidacja">
        <ValidationList items={validation} />
      </Group>
      <Group title="Zestawienie materiałów" aside={<span className="muted">{bom.length} pozycji</span>}>
        <div className="bom-table">
          <table>
            <thead><tr><th>Pozycja</th><th>Ilość</th><th>Podstawa</th></tr></thead>
            <tbody>
              {bom.map((row, i) => (
                <tr key={i}>
                  <td><small>{row.category}</small>{row.item}</td>
                  <td>{row.quantity}</td>
                  <td><i className={'acc ' + (row.basis === 'dokładne' ? 'acc-exact' : 'acc-assumption')}>{row.basis}</i></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={onExportCsv}><Icon.download /> CSV</button>
          <button type="button" className="btn" onClick={onExportJson}><Icon.download /> JSON</button>
          <button type="button" className="btn primary" onClick={onOpenTechnical}><Icon.layers /> Widok techniczny</button>
        </div>
      </Group>
      <Group title="Założenia modelu" aside={<span className="muted">{model.assumptions.length}</span>}>
        <ul className="assumption-list">
          {model.assumptions.map((a) => <li key={a.code}><b>{a.code}</b>{a.description}</li>)}
        </ul>
        <p className="muted small">Projekt: {config.project}. Pozycje „założenie” nie są danymi projektowymi — do podmiany po dostarczeniu detali wykonawczych.</p>
      </Group>
    </>
  )
}
