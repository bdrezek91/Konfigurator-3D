import { useEffect, useMemo, useState } from 'react'
import { CATEGORY_COLORS, type ComponentCategory, type ComponentModel } from '../components'
import { CATEGORY_LABELS } from './labels'
import TechnicalPavilion3D, { type ClipAxis, type TechnicalView } from '../technical/TechnicalPavilion3D'
import type { PavilionConfig } from '../types'
import { Segmented } from './controls'
import { Icon } from './icons'


const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as ComponentCategory[]
const STAGES = 12
const ACCURACY_PL = { exact: 'dokładne', 'project-estimate': 'z projektu', assumption: 'założenie' } as const

const params = () => new URLSearchParams(window.location.search)

export function TechnicalWorkspace({ config, model }: { config: PavilionConfig; model: ComponentModel }) {
  const [view, setView] = useState<TechnicalView>(() => {
    const value = params().get('view') as TechnicalView | null
    const allowed: TechnicalView[] = ['axon', 'front', 'side', 'top', 'perspective', 'detail-a', 'detail-b', 'detail-c', 'detail-d']
    return value && allowed.includes(value) ? value : 'axon'
  })
  const [exploded, setExploded] = useState(() => {
    const value = Number(params().get('explode') ?? 0)
    return Math.max(0, Math.min(1, value > 1 ? value / 100 : value))
  })
  const [stage, setStage] = useState(() => Math.max(1, Math.min(STAGES, Number(params().get('stage') ?? STAGES) || STAGES)))
  const [playing, setPlaying] = useState(false)
  const [visibility, setVisibility] = useState<Record<ComponentCategory, boolean>>(
    () => Object.fromEntries(CATEGORY_KEYS.map((k) => [k, true])) as Record<ComponentCategory, boolean>,
  )
  const [selectedId, setSelectedId] = useState<string>()
  const [hoveredId, setHoveredId] = useState<string>()
  const [isolatedId, setIsolatedId] = useState<string>()
  const [showDimensions, setShowDimensions] = useState(() => params().get('dims') !== '0')
  const [showBalloons, setShowBalloons] = useState(() => params().get('balloons') === '1')
  const [clipAxis, setClipAxis] = useState<ClipAxis>(() => {
    const value = params().get('clip')
    return value === 'x' || value === 'y' || value === 'z' ? value : 'none'
  })
  const [clipOffset, setClipOffset] = useState(() => Number(params().get('clipOffset') ?? 0) || 0)
  const [filter, setFilter] = useState('')

  const selected = useMemo(() => model.components.find((c) => c.id === selectedId), [model, selectedId])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setStage((s) => {
        if (s >= STAGES) {
          window.clearInterval(timer)
          setPlaying(false)
          return STAGES
        }
        return s + 1
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [playing])

  const byCategory = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return CATEGORY_KEYS.map((category) => ({
      category,
      items: model.components.filter((c) => c.category === category && (!q || c.namePL.toLowerCase().includes(q) || String(c.positionNo).includes(q))),
    }))
  }, [model, filter])

  const reach = Math.max(config.length, config.width, 4)

  return (
    <div className="tech-shell">
      <div className="tech-toolbar">
        <Segmented size="sm" value={['axon', 'front', 'side', 'top', 'perspective'].includes(view) ? view : 'axon'} onChange={setView} options={[
          { value: 'axon', label: 'Aksonometria' },
          { value: 'front', label: 'Front' },
          { value: 'side', label: 'Bok' },
          { value: 'top', label: 'Rzut' },
          { value: 'perspective', label: 'Perspektywa' },
        ]} />
        <label className="tech-range">
          <span>Rozsunięcie <b>{Math.round(exploded * 100)}%</b></span>
          <input type="range" min={0} max={1} step={0.01} value={exploded} onChange={(e) => setExploded(Number(e.target.value))} />
        </label>
        <label className="tech-range">
          <span>Etap montażu <b>{stage}/{STAGES}</b></span>
          <input type="range" min={1} max={STAGES} step={1} value={stage} onChange={(e) => setStage(Number(e.target.value))} />
        </label>
        <button type="button" className="btn sm" onClick={() => { if (!playing) setStage(1); setPlaying((v) => !v) }}>
          {playing ? <Icon.pause /> : <Icon.play />}{playing ? 'Stop' : 'Montaż'}
        </button>
        <span className="tb-sep" />
        <button type="button" className={'btn sm toggle' + (showDimensions ? ' on' : '')} onClick={() => setShowDimensions((v) => !v)}>Wymiary</button>
        <button type="button" className={'btn sm toggle' + (showBalloons ? ' on' : '')} onClick={() => setShowBalloons((v) => !v)}>Numery poz.</button>
        <Segmented size="sm" value={clipAxis} onChange={setClipAxis} options={[
          { value: 'none', label: 'Bez przekroju' }, { value: 'x', label: 'X' }, { value: 'y', label: 'Y' }, { value: 'z', label: 'Z' },
        ]} />
        {clipAxis !== 'none' && (
          <label className="tech-range">
            <span>Płaszczyzna <b>{clipOffset.toFixed(2)} m</b></span>
            <input type="range" min={-reach} max={reach} step={0.05} value={clipOffset} onChange={(e) => setClipOffset(Number(e.target.value))} />
          </label>
        )}
      </div>

      <div className="tech-body">
        <aside className="tech-tree">
          <div className="tech-pane-head">
            <strong>Warstwy</strong>
            <small>{model.metrics.componentCount} elementów</small>
          </div>
          <input className="tech-search" placeholder="Szukaj elementu lub nr poz." value={filter} onChange={(e) => setFilter(e.target.value)} />
          <div className="tech-categories">
            {byCategory.map(({ category, items }) => (
              <details key={category} open={!!filter && items.length > 0}>
                <summary>
                  <input
                    type="checkbox"
                    checked={visibility[category]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setVisibility((v) => ({ ...v, [category]: e.target.checked }))}
                    aria-label={'Pokaż ' + CATEGORY_LABELS[category]}
                  />
                  <i className="cat-dot" style={{ background: CATEGORY_COLORS[category] }} />
                  <span>{CATEGORY_LABELS[category]}</span>
                  <small>{items.length}</small>
                </summary>
                <div className="tech-items">
                  {items.slice(0, 400).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={(selectedId === item.id ? 'sel ' : '') + (hoveredId === item.id ? 'hov' : '')}
                      onMouseEnter={() => setHoveredId(item.id)}
                      onMouseLeave={() => setHoveredId(undefined)}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <b>{item.positionNo}</b><span>{item.namePL}</span>
                    </button>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </aside>

        <div className="tech-canvas canvas-wrap">
          <TechnicalPavilion3D
            key={view}
            config={config}
            model={model}
            exploded={exploded}
            assemblyStage={stage}
            categoryVisibility={visibility}
            selectedId={selectedId}
            hoveredId={hoveredId}
            isolatedId={isolatedId}
            view={view}
            showDimensions={showDimensions}
            showBalloons={showBalloons}
            clipAxis={clipAxis}
            clipOffset={clipOffset}
            onSelect={setSelectedId}
            onHover={setHoveredId}
          />
          <div className="title-block">
            <strong>DAMPOL · {config.project}</strong>
            <span>{Math.round(config.length * 1000)} × {Math.round(config.width * 1000)} mm</span>
            <span>{view.toUpperCase()}</span>
          </div>
          <div className="detail-strip">
            {([
              ['detail-a', 'A · narożnik ściana–dach'],
              ['detail-b', 'B · osadzenie drzwi'],
              ['detail-c', 'C · panel–rama podłogi'],
              ['detail-d', 'D · attyka'],
            ] as Array<[TechnicalView, string]>).map(([v, label]) => (
              <button key={v} type="button" className={view === v ? 'on' : ''} onClick={() => setView(v)}>Detal {label}</button>
            ))}
          </div>
        </div>

        <aside className="tech-inspector">
          <div className="tech-pane-head"><strong>Element</strong></div>
          {selected ? (
            <div className="component-card">
              <span className="pos-chip">POZ. {selected.positionNo}</span>
              <h4>{selected.namePL}</h4>
              <dl>
                <dt>Kategoria</dt><dd>{CATEGORY_LABELS[selected.category]}</dd>
                <dt>Materiał</dt><dd>{selected.material}</dd>
                <dt>Kolor</dt><dd><i className="color-dot" style={{ background: selected.color }} />{selected.ral ?? selected.color}</dd>
                <dt>Wymiary</dt><dd>{selected.dimensions.lengthMm} × {selected.dimensions.widthMm} × {selected.dimensions.thicknessMm} mm</dd>
                {selected.dimensions.developedWidthMm && <><dt>Rozwinięcie</dt><dd>{selected.dimensions.developedWidthMm} mm</dd></>}
                <dt>Ilość</dt><dd>{selected.quantity} szt.</dd>
                {selected.massKg != null && <><dt>Masa</dt><dd>{selected.massKg.toFixed(2)} kg</dd></>}
                <dt>Etap montażu</dt><dd>{selected.assemblyStage}/{STAGES}</dd>
                <dt>Dokładność</dt><dd><i className={'acc acc-' + (selected.sourceAccuracy === 'exact' ? 'exact' : selected.sourceAccuracy === 'project-estimate' ? 'project' : 'assumption')}>{ACCURACY_PL[selected.sourceAccuracy]}</i></dd>
              </dl>
              {(selected.assumptionCodes?.length ?? 0) > 0 && (
                <div className="tag-row">{selected.assumptionCodes?.map((code) => <span key={code}>{code}</span>)}</div>
              )}
              <div className="btn-row">
                <button type="button" className="btn sm" onClick={() => setIsolatedId(isolatedId === selected.id ? undefined : selected.id)}>
                  {isolatedId === selected.id ? 'Pokaż wszystko' : 'Izoluj'}
                </button>
                <button type="button" className="btn sm ghost" onClick={() => { setSelectedId(undefined); setIsolatedId(undefined) }}>Wyczyść</button>
              </div>
            </div>
          ) : (
            <p className="muted small pad">Kliknij element w modelu lub na liście warstw.</p>
          )}
          <div className="legend">
            {CATEGORY_KEYS.map((k) => <span key={k}><i style={{ background: CATEGORY_COLORS[k] }} />{CATEGORY_LABELS[k]}</span>)}
          </div>
        </aside>
      </div>
    </div>
  )
}
