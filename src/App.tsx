import { lazy, Suspense, useMemo, useState } from 'react'
import { buildComponentModel, componentModelToCsv, geometryOf } from './components'
import { buildBom, validateConfig } from './logic'
import { PRESETS } from './presets'
import { envelope } from './scene/geometry'
import type { LightingMode, PavilionView } from './scene/Pavilion3D'
import { CONSTRUCTION_LABELS, DEFAULT_CONFIG, type PavilionConfig } from './types'
import { ConfigPanel } from './ui/ConfigPanel'
import { TABS, type TabId } from './ui/tabs'
import { applyUpdate, CUSTOM_PROJECT, type Setter } from './ui/configState'
import { Icon } from './ui/icons'
import { MetricGrid, TechnicalTab } from './ui/MetricsPanel'
import { useMetrics } from './ui/metrics'
import { Viewer } from './ui/Viewer'
import './App.css'

// tryb techniczny ładowany na żądanie — nie obciąża pierwszego wczytania konfiguratora
const TechnicalWorkspace = lazy(() => import('./ui/TechnicalWorkspace').then((m) => ({ default: m.TechnicalWorkspace })))

type SceneMode = 'visual' | 'technical'

const FACADE_NAMES: Record<PavilionConfig['facade'], string> = {
  plain: 'Goły panel PIR',
  'cassette-graphite': 'Kaseton grafit',
  'cassette-black': 'Kaseton czarny',
  'lamella-winchester': 'Lamele Winchester',
  'lamella-black': 'Lamele czarne',
  'lamella-diagonal-winchester': 'Lamele ukośne',
  'cassette-lamella': 'Kaseton + lamele',
  'silver-rectangle': 'Srebrny prostokąt',
  'cassette-horizontal': 'Kasetony poziome',
  'cassette-grid': 'Kasetony siatka',
  'vertical-ribbed': 'Blacha pionowa',
  'wood-horizontal': 'Deska pozioma',
  'ornament-panel': 'Panel ornamentowy',
}

function initialConfig(): PavilionConfig {
  const presetId = new URLSearchParams(window.location.search).get('preset')
  const preset = PRESETS.find((item) => item.id === presetId)
  const base = preset ? { ...preset.config } : { ...DEFAULT_CONFIG }
  // ?mfr=paneltech|balex&wall=microwave — szybki podgląd profilu okładziny (testy wizualne, linki)
  const q = new URLSearchParams(window.location.search)
  const mfr = q.get('mfr') as PavilionConfig['panelManufacturer'] | null
  const wall = q.get('wall') as PavilionConfig['wallProfile'] | null
  if (mfr && ['paneltech', 'balex', 'generic'].includes(mfr)) base.panelManufacturer = mfr
  if (wall && ['smooth', 'linear', 'microline', 'microrib', 'microwave', 'carbon', 'ribbed'].includes(wall)) base.wallProfile = wall
  if (q.get('facade') === 'plain') base.facade = 'plain'
  return base
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const query = new URLSearchParams(window.location.search)
  const [config, setConfig] = useState<PavilionConfig>(initialConfig)
  const [tab, setTab] = useState<TabId>('dims')
  const [mode, setMode] = useState<SceneMode>(() => (query.get('mode') === 'technical' ? 'technical' : 'visual'))
  const [lighting, setLighting] = useState<LightingMode>(() => (query.get('light') === 'evening' ? 'evening' : 'day'))
  const [view, setView] = useState<PavilionView>(() => {
    const v = query.get('rview') as PavilionView | null
    return v && ['perspective', 'front', 'back', 'left', 'right', 'front-left', 'front-right'].includes(v) ? v : 'perspective'
  })

  const model = useMemo(() => buildComponentModel(config), [config])
  const validation = useMemo(() => validateConfig(config), [config])
  const bom = useMemo(() => buildBom(config), [config])
  const metrics = useMetrics(config, model)
  const preset = PRESETS.find((p) => p.config.project === config.project)
  const openings = useMemo(() => geometryOf(config).openings, [config])

  const update: Setter = (key, value) => setConfig((current) => applyUpdate(current, key, value))

  const loadPreset = (id: string) => {
    const next = PRESETS.find((p) => p.id === id)
    setConfig(next ? { ...next.config } : { ...DEFAULT_CONFIG })
    setView('perspective')
  }

  // widok konstrukcji Systemu 1 dla bieżącej konfiguracji (przekazanej przez sessionStorage)
  const openConstruction = () => {
    try {
      window.sessionStorage.setItem('dampol3d.construction.config', JSON.stringify(config))
    } catch {
      // brak sessionStorage — widok konstrukcji użyje presetu z adresu
    }
    const presetId = PRESETS.find((p) => p.config.project === config.project)?.id
    window.open('?lab=construction&from=app' + (presetId ? '&preset=' + presetId : ''), '_blank')
  }

  const slug = config.project.replaceAll('/', '-')
  const exportJson = () => download(
    new Blob([JSON.stringify({ version: 8, generatedAt: new Date().toISOString(), config, validation, bom, componentModel: model }, null, 2)], { type: 'application/json' }),
    'pawilon-' + slug + '.json',
  )
  const exportCsv = () => download(new Blob(['﻿' + componentModelToCsv(model)], { type: 'text/csv;charset=utf-8' }), 'pawilon-' + slug + '-bom.csv')
  const exportPng = () => {
    const root = window as typeof window & { __DAMPOL3D_CAPTURE__?: () => string; __DAMPOL3D_REAL_CAPTURE__?: () => string }
    const data = mode === 'technical' ? root.__DAMPOL3D_CAPTURE__?.() : root.__DAMPOL3D_REAL_CAPTURE__?.()
    if (!data) return
    const link = document.createElement('a')
    link.download = 'pawilon-' + slug + '.png'
    link.href = data
    link.click()
  }

  // wysokość zewnętrzna z konstrukcji (System 1: kątownik + podłoga + ściana + dach + górna rama) — ta sama co w panelu Wymiary
  const outerH = envelope(config).outerFront
  const errors = validation.filter((v) => v.level === 'error').length
  const warnings = validation.filter((v) => v.level === 'warning').length

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">D</span>
          <div>
            <strong>DAMPOL</strong>
            <small>Konfigurator pawilonów</small>
          </div>
        </div>

        <div className="project-picker">
          <label htmlFor="preset">Projekt</label>
          <div className="select-wrap">
            <select id="preset" value={preset?.id ?? ''} onChange={(e) => loadPreset(e.target.value)}>
              <option value="">{CUSTOM_PROJECT}</option>
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <Icon.chevron />
          </div>
        </div>

        <div className="mode-switch" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'visual'} className={mode === 'visual' ? 'on' : ''} onClick={() => setMode('visual')}>
            <Icon.camera /> Wizualizacja
          </button>
          <button type="button" role="tab" aria-selected={mode === 'technical'} className={mode === 'technical' ? 'on' : ''} onClick={() => setMode('technical')}>
            <Icon.layers /> Technika
          </button>
        </div>

        <div className="topbar-actions">
          {config.construction === 'angle50' && (
            <button type="button" className="btn ghost" onClick={openConstruction} title="Konstrukcja z kątownika 50×50×4: przekroje A–G, montaż krok po kroku, wymiary wyliczone">
              <Icon.layers /> Konstrukcja
            </button>
          )}
          <button type="button" className="btn ghost" onClick={exportPng} title="Zrzut widoku"><Icon.camera /> PNG</button>
          <button type="button" className="btn ghost" onClick={exportCsv} title="Zestawienie materiałów"><Icon.download /> BOM</button>
          <button type="button" className="btn" onClick={exportJson}><Icon.download /> Zapisz konfigurację</button>
        </div>
      </header>

      <main className={'workspace mode-' + mode}>
        <section className="stage">
          {mode === 'visual' ? (
            <Viewer config={config} lighting={lighting} onLighting={setLighting} view={view} onView={setView} />
          ) : (
            <Suspense fallback={<div className="stage-loading">Ładowanie widoku technicznego…</div>}>
              <TechnicalWorkspace config={config} model={model} />
            </Suspense>
          )}
          {mode === 'visual' && (
            <div className="stage-caption">
              <strong>{preset ? preset.label.split('·')[0].trim() : config.project}</strong>
              <span>{config.length.toFixed(2)} × {config.width.toFixed(2)} m</span>
              <span>H {outerH.toFixed(3)} m</span>
            </div>
          )}
        </section>

        <aside className="panel">
          <div className="panel-main">
          <nav className="tabs" aria-label="Kategorie konfiguracji">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id}>
                <t.icon />
                <span>{t.label}</span>
              </button>
            ))}
          </nav>

          <div className="panel-body">
            <ConfigPanel
              tab={tab}
              config={config}
              update={update}
              setConfig={setConfig}
              techContent={
                <TechnicalTab
                  config={config}
                  model={model}
                  metrics={metrics}
                  validation={validation}
                  bom={bom}
                  onExportCsv={exportCsv}
                  onExportJson={exportJson}
                  onOpenTechnical={() => setMode('technical')}
                />
              }
            />
          </div>
          </div>

          <footer className="summary">
            <div className="summary-head">
              <div>
                <span className="eyebrow">Twoja konfiguracja</span>
                <strong>{config.length.toFixed(2)} × {config.width.toFixed(2)} m · {(config.length * config.width).toFixed(1)} m²</strong>
              </div>
              <span className={'status ' + (errors ? 'err' : warnings ? 'warn' : 'ok')} title={validation.map((v) => v.message).join('\n')}>
                {errors ? <Icon.alert /> : <Icon.check />}
                {errors ? errors + ' błędy' : warnings ? warnings + ' uwagi' : 'Poprawna'}
              </span>
            </div>
            <ul className="summary-specs">
              <li><span>Konstrukcja</span>{CONSTRUCTION_LABELS[config.construction]}</li>
              <li><span>Elewacja</span>{FACADE_NAMES[config.facade]}</li>
              <li><span>Stolarka</span>{openings.length} elem. · {config.glazing === 'triple' ? '3 szyby' : '2 szyby'}</li>
              <li><span>Instalacje</span>{config.electrical === 'none' ? 'bez elektryki' : config.electrical === '3p400' ? '400 V' : '230 V'}{config.waterConnection ? ' · woda' : ''}{config.airConditioning ? ' · klima' : ''}</li>
            </ul>
            <MetricGrid metrics={metrics.slice(0, 4)} compact />
          </footer>
        </aside>
      </main>
    </div>
  )
}
