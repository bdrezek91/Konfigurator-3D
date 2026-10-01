import { useMemo, useState } from 'react'
import Pavilion3D from './Pavilion3D'
import { DEFAULT_CONFIG, RAL_COLORS, type PavilionConfig } from './types'
import './App.css'

type RangeProps = {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (value: number) => void
}

function RangeControl({ label, value, min, max, step, unit, onChange }: RangeProps) {
  return (
    <label className="range-control">
      <span className="control-head">
        <span>{label}</span>
        <strong>{value.toFixed(step < 1 ? 1 : 0)} {unit}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
export default function App() {
  const [config, setConfig] = useState<PavilionConfig>(DEFAULT_CONFIG)
  const [sceneKey, setSceneKey] = useState(0)

  const stats = useMemo(() => {
    const floor = config.length * config.width
    const wallArea = 2 * (config.length + config.width) * config.height
    const roof = floor
    const panelEstimate = Math.ceil(wallArea)
    return { floor, wallArea, roof, panelEstimate }
  }, [config])

  const update = <K extends keyof PavilionConfig>(key: K, value: PavilionConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  const resetAll = () => {
    setConfig(DEFAULT_CONFIG)
    setSceneKey((value) => value + 1)
  }

  const exportConfig = () => {
    const payload = JSON.stringify({ version: 1, config }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pawilon-${config.length}x${config.width}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-row"><span className="brand-mark">D</span><strong>DAMPOL 3D</strong></div>
          <p>Konfigurator pawilonów — wersja rozwojowa V1</p>
        </div>
        <span className="status-pill">MVP ONLINE</span>
      </header>
      <section className="workspace">
        <aside className="sidebar">
          <div className="panel-section">
            <div className="section-title">
              <span>01</span>
              <div><strong>Wymiary bryły</strong><small>Model parametryczny</small></div>
            </div>
            <RangeControl label="Długość" value={config.length} min={4} max={12} step={0.5} unit="m" onChange={(v) => update('length', v)} />
            <RangeControl label="Szerokość" value={config.width} min={2.5} max={4} step={0.1} unit="m" onChange={(v) => update('width', v)} />
            <RangeControl label="Wysokość" value={config.height} min={2.4} max={3.2} step={0.1} unit="m" onChange={(v) => update('height', v)} />
          </div>

          <div className="panel-section">
            <div className="section-title">
              <span>02</span>
              <div><strong>Elewacja</strong><small>Wygląd zewnętrzny</small></div>
            </div>
            <label className="select-control">
              <span>Kolor RAL</span>
              <select value={config.color} onChange={(e) => update('color', e.target.value)}>
                {RAL_COLORS.map((color) => <option key={color.value} value={color.value}>{color.name}</option>)}
              </select>
            </label>
            <label className="switch-row">
              <span><strong>Lamele dekoracyjne</strong><small>Akcent na elewacji frontowej</small></span>
              <input type="checkbox" checked={config.lamella} onChange={(e) => update('lamella', e.target.checked)} />
            </label>
          </div>

          <div className="panel-section">
            <div className="section-title">
              <span>03</span>
              <div><strong>Stolarka</strong><small>Wersja demonstracyjna</small></div>
            </div>
            <RangeControl label="Okna na froncie" value={config.windows} min={0} max={4} step={1} unit="szt." onChange={(v) => update('windows', v)} />
            <label className="switch-row">
              <span><strong>Drzwi wejściowe</strong><small>Front pawilonu</small></span>
              <input type="checkbox" checked={config.door} onChange={(e) => update('door', e.target.checked)} />
            </label>
            <label className="switch-row">
              <span><strong>Rama narożna</strong><small>Podgląd konstrukcji</small></span>
              <input type="checkbox" checked={config.showStructure} onChange={(e) => update('showStructure', e.target.checked)} />
            </label>
          </div>

          <div className="sidebar-actions">
            <button className="primary-btn" type="button" onClick={exportConfig}>Eksport konfiguracji</button>
            <button type="button" onClick={() => setSceneKey((v) => v + 1)}>Reset widoku 3D</button>
            <button type="button" onClick={resetAll}>Reset całości</button>
          </div>
        </aside>

        <section className="viewer-column">
          <div className="viewer-card">
            <div className="viewer-toolbar">
              <div>
                <strong>{config.length.toFixed(1)} × {config.width.toFixed(1)} × {config.height.toFixed(1)} m</strong>
                <small>obrót: LPM • zoom: kółko myszy</small>
              </div>
              <span>Widok zewnętrzny</span>
            </div>
            <div className="canvas-wrap">
              <Pavilion3D key={sceneKey} config={config} />
            </div>
          </div>

          <div className="summary-grid">
            <article><span>Powierzchnia</span><strong>{stats.floor.toFixed(1)} m²</strong><small>podłoga</small></article>
            <article><span>Ściany brutto</span><strong>{stats.wallArea.toFixed(1)} m²</strong><small>przed odjęciem stolarki</small></article>
            <article><span>Dach</span><strong>{stats.roof.toFixed(1)} m²</strong><small>rzut podstawy</small></article>
            <article><span>Panele</span><strong>~{stats.panelEstimate}</strong><small>szacunek demonstracyjny</small></article>
          </div>

          <div className="development-note">
            <strong>Etap V1</strong>
            <p>Geometria i ilości są demonstracyjne. Po wczytaniu projektów technicznych zastąpimy je rzeczywistymi regułami Dampol: profile, podziały PIR, otwory, wzmocnienia, dach, podłoga i BOM.</p>
          </div>
        </section>
      </section>
    </main>
  )
}
