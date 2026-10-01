import { useMemo, useState } from 'react'
import Pavilion3D from './Pavilion3D'
import { PRESETS } from './presets'
import { buildBom, validateConfig } from './logic'
import {
  CONSTRUCTION_LABELS,
  DEFAULT_CONFIG,
  PANEL_LABELS,
  RAL_COLORS,
  type PavilionConfig,
} from './types'
import './App.css'

type Setter = <K extends keyof PavilionConfig>(key: K, value: PavilionConfig[K]) => void

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <details className="config-section" open>
      <summary><span>{title}</span>{subtitle && <small>{subtitle}</small>}</summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

function Toggle({ label, checked, onChange, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <label className="toggle-row">
      <span><strong>{label}</strong>{note && <small>{note}</small>}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Num({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="number-wrap">
        <input type="number" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        {unit && <em>{unit}</em>}
      </div>
    </label>
  )
}

function Select<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  )
}

function ConfigControls({ config, update }: { config: PavilionConfig; update: Setter }) {
  return (
    <>
      <Section title="Bryła i konstrukcja" subtitle="wymiary, dach, profile">
        <div className="field-grid">
          <Num label="Długość" value={config.length} min={4} max={12} step={0.01} unit="m" onChange={(v) => update('length', v)} />
          <Num label="Szerokość" value={config.width} min={2.5} max={4} step={0.01} unit="m" onChange={(v) => update('width', v)} />
          <Num label="Wysokość front" value={config.frontHeight} min={2.3} max={3.3} step={0.01} unit="m" onChange={(v) => update('frontHeight', v)} />
          <Num label="Wysokość tył" value={config.backHeight} min={2.3} max={3.3} step={0.01} unit="m" onChange={(v) => update('backHeight', v)} />
        </div>
        <Select label="Spadek dachu" value={config.roofSlope} onChange={(v) => update('roofSlope', v)} options={[
          { value: 'back', label: 'Na tył' }, { value: 'front', label: 'Na front' }, { value: 'flat', label: 'Płaski' },
        ]} />
        <Select label="Konstrukcja" value={config.construction} onChange={(v) => update('construction', v)} options={
          Object.entries(CONSTRUCTION_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['construction'], label }))
        } />
        <div className="toggle-pair">
          <Toggle label="Pokaż konstrukcję" checked={config.showStructure} onChange={(v) => update('showStructure', v)} />
          <Toggle label="Podgląd wnętrza" checked={config.showInterior} onChange={(v) => update('showInterior', v)} />
        </div>
      </Section>

      <Section title="Płyty i wykończenie" subtitle="ściana, dach, podłoga">
        <Select label="Ściany" value={config.wallPanel} onChange={(v) => update('wallPanel', v)} options={
          Object.entries(PANEL_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['wallPanel'], label }))
        } />
        <Select label="Dach" value={config.roofPanel} onChange={(v) => update('roofPanel', v)} options={
          Object.entries(PANEL_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['roofPanel'], label }))
        } />
        <Select label="Podłoga" value={config.floorPanel} onChange={(v) => update('floorPanel', v)} options={
          Object.entries(PANEL_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['floorPanel'], label }))
        } />
        <div className="field-grid">
          <Select label="Profil ścian" value={config.wallProfile} onChange={(v) => update('wallProfile', v)} options={[
            { value: 'smooth', label: 'Gładkie' }, { value: 'ribbed', label: 'Ryflowane' },
          ]} />
          <Select label="Profil dachu" value={config.roofProfile} onChange={(v) => update('roofProfile', v)} options={[
            { value: 'smooth', label: 'Gładkie' }, { value: 'ribbed', label: 'Ryflowane' },
          ]} />
          <Select label="Wnętrze" value={config.interiorFinish} onChange={(v) => update('interiorFinish', v)} options={[
            { value: 'white', label: 'Białe' }, { value: 'concrete', label: 'Beton' }, { value: 'black', label: 'Czarne' },
            { value: 'oak', label: 'Dąb Sonoma' }, { value: 'walnut', label: 'Orzech' },
          ]} />
          <Select label="PVC podłogi" value={config.floorFinish} onChange={(v) => update('floorFinish', v)} options={[
            { value: 'wood', label: 'Deska' }, { value: 'concrete', label: 'Beton' }, { value: 'other', label: 'Inne' },
          ]} />
        </div>
      </Section>

      <Section title="Elewacja" subtitle="kolor, kasetony, lamele, obróbki">
        <div className="field-grid">
          <label className="field">
            <span>Kolor zewnętrzny</span>
            <select value={config.exteriorColor} onChange={(e) => update('exteriorColor', e.target.value)}>
              {RAL_COLORS.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Kolor obróbek</span>
            <select value={config.flashingColor} onChange={(e) => update('flashingColor', e.target.value)}>
              {RAL_COLORS.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <Select label="Styl elewacji" value={config.facade} onChange={(v) => update('facade', v)} options={[
          { value: 'plain', label: 'Bez dekoru / gładka' },
          { value: 'cassette-graphite', label: 'Kaseton grafit' },
          { value: 'cassette-black', label: 'Kaseton czarny mat' },
          { value: 'lamella-winchester', label: 'Lamele Winchester' },
          { value: 'lamella-black', label: 'Lamele czarne' },
          { value: 'cassette-lamella', label: 'Kaseton + lamele' },
          { value: 'silver-rectangle', label: 'Srebrny prostokąt' },
        ]} />
        <div className="toggle-pair">
          <Toggle label="Front" checked={config.facadeFront} onChange={(v) => update('facadeFront', v)} />
          <Toggle label="Lewy bok" checked={config.facadeLeft} onChange={(v) => update('facadeLeft', v)} />
          <Toggle label="Prawy bok" checked={config.facadeRight} onChange={(v) => update('facadeRight', v)} />
          <Toggle label="Tył" checked={config.facadeBack} onChange={(v) => update('facadeBack', v)} />
        </div>
      </Section>

      <Section title="Stolarka i szyby" subtitle="ALU, PVC, FIX, rolety">
        <Select label="Pakiet szybowy" value={config.glazing} onChange={(v) => update('glazing', v)} options={[
          { value: 'double', label: '2 szyby / zimne' }, { value: 'triple', label: '3 szyby / ciepłe' },
        ]} />
        <h4>Drzwi ALU</h4>
        <div className="field-grid">
          <Num label="Ilość" value={config.aluDoorCount} min={0} max={4} onChange={(v) => update('aluDoorCount', v)} />
          <Num label="Szerokość" value={config.aluDoorWidth} min={0.7} max={3.0} step={0.01} unit="m" onChange={(v) => update('aluDoorWidth', v)} />
          <Num label="Wysokość" value={config.aluDoorHeight} min={1.8} max={2.4} step={0.01} unit="m" onChange={(v) => update('aluDoorHeight', v)} />
        </div>
        <h4>Witryny / FIX</h4>
        <div className="field-grid">
          <Num label="Ilość" value={config.fixedGlazingCount} min={0} max={10} onChange={(v) => update('fixedGlazingCount', v)} />
          <Num label="Szerokość" value={config.fixedGlazingWidth} min={0.3} max={3.0} step={0.01} unit="m" onChange={(v) => update('fixedGlazingWidth', v)} />
          <Num label="Wysokość" value={config.fixedGlazingHeight} min={0.3} max={2.4} step={0.01} unit="m" onChange={(v) => update('fixedGlazingHeight', v)} />
        </div>
        <h4>Okna ALU</h4>
        <div className="field-grid">
          <Num label="Ilość" value={config.aluWindowCount} min={0} max={8} onChange={(v) => update('aluWindowCount', v)} />
          <Num label="Szerokość" value={config.aluWindowWidth} min={0.3} max={3} step={0.01} unit="m" onChange={(v) => update('aluWindowWidth', v)} />
          <Num label="Wysokość" value={config.aluWindowHeight} min={0.3} max={2.4} step={0.01} unit="m" onChange={(v) => update('aluWindowHeight', v)} />
        </div>
        <h4>Okna PVC</h4>
        <div className="field-grid">
          <Num label="Ilość" value={config.pvcWindowCount} min={0} max={8} onChange={(v) => update('pvcWindowCount', v)} />
          <Num label="Szerokość" value={config.pvcWindowWidth} min={0.3} max={2} step={0.01} unit="m" onChange={(v) => update('pvcWindowWidth', v)} />
          <Num label="Wysokość" value={config.pvcWindowHeight} min={0.3} max={2.2} step={0.01} unit="m" onChange={(v) => update('pvcWindowHeight', v)} />
        </div>
        <div className="toggle-pair">
          <Toggle label="Rolety" checked={config.rollers} onChange={(v) => update('rollers', v)} />
          <Num label="Liczba rolet" value={config.rollerCount} min={0} max={12} onChange={(v) => update('rollerCount', v)} />
        </div>
      </Section>

      <Section title="Elektryka" subtitle="230/400 V, gniazda, oświetlenie">
        <Select label="Instalacja" value={config.electrical} onChange={(v) => update('electrical', v)} options={[
          { value: '1p230', label: '1 faza · 230 V' },
          { value: '3p400', label: '3 fazy · 400 V' },
          { value: 'none', label: 'Brak' },
        ]} />
        <div className="field-grid">
          <Num label="Gniazda podwójne" value={config.doubleSockets} min={0} max={30} onChange={(v) => update('doubleSockets', v)} />
          <Num label="Gniazda pojedyncze" value={config.singleSockets} min={0} max={30} onChange={(v) => update('singleSockets', v)} />
          <Num label="Lampy LED" value={config.ledCeiling} min={0} max={20} onChange={(v) => update('ledCeiling', v)} />
          <Num label="Włączniki" value={config.switches} min={0} max={20} onChange={(v) => update('switches', v)} />
          <Num label="Lampy zewnętrzne" value={config.externalLights} min={0} max={12} onChange={(v) => update('externalLights', v)} />
        </div>
        <div className="toggle-pair">
          <Toggle label="Rozdzielnica" checked={config.distributionBoard} onChange={(v) => update('distributionBoard', v)} />
          <Toggle label="Przyłącze zewnętrzne" checked={config.externalConnection} onChange={(v) => update('externalConnection', v)} />
          <Toggle label="Gniazdo siłowe" checked={config.forceSocket} onChange={(v) => update('forceSocket', v)} />
        </div>
      </Section>

      <Section title="Hydraulika i sanitariaty" subtitle="woda, odpływ, WC, łazienka">
        <div className="toggle-pair">
          <Toggle label="Przyłącze wody" checked={config.waterConnection} onChange={(v) => update('waterConnection', v)} />
          <Toggle label="Odpływ / kanalizacja" checked={config.sewerConnection} onChange={(v) => update('sewerConnection', v)} />
          <Toggle label="Punkt wodny aneks" checked={config.kitchenWaterPoint} onChange={(v) => update('kitchenWaterPoint', v)} />
          <Toggle label="Łazienka / WC" checked={config.bathroom} onChange={(v) => update('bathroom', v)} />
          <Toggle label="WC kompakt" checked={config.toiletCompact} onChange={(v) => update('toiletCompact', v)} />
          <Toggle label="Umywalka + szafka" checked={config.washbasin} onChange={(v) => update('washbasin', v)} />
          <Toggle label="Prysznic" checked={config.shower} onChange={(v) => update('shower', v)} />
          <Toggle label="Grzejnik" checked={config.heater} onChange={(v) => update('heater', v)} />
          <Toggle label="Kratka wentylacyjna" checked={config.ventilationGrille} onChange={(v) => update('ventilationGrille', v)} />
        </div>
        <Select label="Bojler" value={String(config.boilerLiters) as '0' | '30' | '50'} onChange={(v) => update('boilerLiters', Number(v) as PavilionConfig['boilerLiters'])} options={[
          { value: '0', label: 'Brak' }, { value: '30', label: '30 l' }, { value: '50', label: '50 l' },
        ]} />
      </Section>

      <Section title="Aneks i wnętrze" subtitle="meble, ścianki, drzwi">
        <div className="toggle-pair">
          <Toggle label="Aneks kuchenny" checked={config.kitchen} onChange={(v) => update('kitchen', v)} />
          <Toggle label="Indukcja" checked={config.induction} onChange={(v) => update('induction', v)} />
          <Toggle label="Lodówka" checked={config.fridge} onChange={(v) => update('fridge', v)} />
          <Toggle label="Ścianka działowa" checked={config.partitionWall} onChange={(v) => update('partitionWall', v)} />
        </div>
        <div className="field-grid">
          <Num label="Długość aneksu" value={config.kitchenLength} min={0.8} max={3.5} step={0.01} unit="m" onChange={(v) => update('kitchenLength', v)} />
          <Num label="Drzwi wewnętrzne" value={config.internalDoorCount} min={0} max={6} onChange={(v) => update('internalDoorCount', v)} />
        </div>
      </Section>

      <Section title="Klimatyzacja i dach" subtitle="HVAC, rynna, attyka">
        <Toggle label="Klimatyzacja" checked={config.airConditioning} onChange={(v) => update('airConditioning', v)} />
        <div className="field-grid">
          <Select label="Moc" value={String(config.hvacPower) as '0' | '3.4' | '3.5' | '4.6' | '5.3'} onChange={(v) => update('hvacPower', Number(v) as PavilionConfig['hvacPower'])} options={[
            { value: '0', label: 'Brak' }, { value: '3.4', label: '3,4 kW' }, { value: '3.5', label: '3,5 kW' },
            { value: '4.6', label: '4,6 kW' }, { value: '5.3', label: '5,3 kW' },
          ]} />
          <Select label="Kolor" value={config.hvacColor} onChange={(v) => update('hvacColor', v)} options={[
            { value: 'white', label: 'Biała' }, { value: 'graphite', label: 'Grafit' }, { value: 'black', label: 'Czarna' },
          ]} />
        </div>
        <div className="toggle-pair">
          <Toggle label="Rynna" checked={config.gutter} onChange={(v) => update('gutter', v)} />
          <Toggle label="Attyka" checked={config.attic} onChange={(v) => update('attic', v)} />
        </div>
      </Section>
    </>
  )
}

export default function App() {
  const [config, setConfig] = useState<PavilionConfig>(DEFAULT_CONFIG)
  const [sceneKey, setSceneKey] = useState(0)

  const validation = useMemo(() => validateConfig(config), [config])
  const bom = useMemo(() => buildBom(config), [config])

  const stats = useMemo(() => {
    const avgHeight = (config.frontHeight + config.backHeight) / 2
    return {
      floor: config.length * config.width,
      walls: 2 * (config.length + config.width) * avgHeight,
      roof: config.length * Math.hypot(config.width, config.frontHeight - config.backHeight),
      roofDrop: Math.round(Math.abs(config.frontHeight - config.backHeight) * 1000),
      openings: config.aluDoorCount + config.fixedGlazingCount + config.aluWindowCount + config.pvcWindowCount,
    }
  }, [config])

  const update: Setter = (key, value) => {
    setConfig((current) => ({ ...current, project: 'Własna konfiguracja', [key]: value }))
  }

  const loadPreset = (id: string) => {
    const preset = PRESETS.find((item) => item.id === id)
    if (!preset) return
    setConfig({ ...preset.config })
    setSceneKey((value) => value + 1)
  }

  const exportConfig = () => {
    const payload = JSON.stringify({ version: 3, generatedAt: new Date().toISOString(), config, validation, bom }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'pawilon-' + config.project.replaceAll('/', '-') + '.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-row"><span className="brand-mark">D</span><strong>DAMPOL 3D</strong></div>
          <p>Konfigurator techniczno-sprzedażowy · 14 projektów referencyjnych</p>
        </div>
        <span className="status-pill">V3</span>
      </header>

      <section className="preset-bar">
        <label>
          <span>Projekt referencyjny</span>
          <select value={config.project === 'Własna konfiguracja' ? '' : config.project} onChange={(e) => loadPreset(e.target.value)}>
            <option value="">Własna konfiguracja</option>
            {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
        </label>
        <div className="preset-meta">
          <strong>{config.project}</strong>
          <small>{PRESETS.find((p) => p.id === config.project)?.notes ?? 'Konfiguracja własna — parametry zmieniane ręcznie.'}</small>
        </div>
        <button onClick={() => { setConfig(DEFAULT_CONFIG); setSceneKey((v) => v + 1) }}>Reset</button>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <ConfigControls config={config} update={update} />
        </aside>

        <section className="viewer-column">
          <div className="viewer-card">
            <div className="viewer-toolbar">
              <div>
                <strong>{config.length.toFixed(2)} × {config.width.toFixed(2)} m · {config.frontHeight.toFixed(2)}→{config.backHeight.toFixed(2)} m</strong>
                <small>obrót: LPM · zoom: kółko · podgląd wnętrza przełącza przezroczystość ścian</small>
              </div>
              <button onClick={() => setSceneKey((v) => v + 1)}>Reset widoku</button>
            </div>
            <div className="canvas-wrap">
              <Pavilion3D key={sceneKey} config={config} />
            </div>
          </div>

          <div className="summary-grid">
            <article><span>Podłoga</span><strong>{stats.floor.toFixed(1)} m²</strong><small>rzut</small></article>
            <article><span>Ściany brutto</span><strong>{stats.walls.toFixed(1)} m²</strong><small>przed odjęciem otworów</small></article>
            <article><span>Dach</span><strong>{stats.roof.toFixed(1)} m²</strong><small>po spadku</small></article>
            <article><span>Spadek</span><strong>{stats.roofDrop} mm</strong><small>różnica wysokości</small></article>
            <article><span>Stolarka</span><strong>{stats.openings}</strong><small>elementów</small></article>
            <article><span>BOM</span><strong>{bom.length}</strong><small>pozycji</small></article>
          </div>

          <div className="lower-grid">
            <section className="info-card">
              <div className="card-head"><strong>Walidacja</strong></div>
              <div className="validation-list">
                {validation.map((item, i) => <div key={i} className={'validation ' + item.level}><span>{item.level === 'error' ? '×' : item.level === 'warning' ? '!' : '✓'}</span>{item.message}</div>)}
              </div>
            </section>

            <section className="info-card">
              <div className="card-head">
                <strong>Wstępny BOM</strong>
                <button onClick={exportConfig}>Eksport JSON</button>
              </div>
              <div className="bom-wrap">
                <table>
                  <thead><tr><th>Kategoria</th><th>Pozycja</th><th>Ilość</th><th>Podstawa</th></tr></thead>
                  <tbody>{bom.map((row, i) => <tr key={i}><td>{row.category}</td><td>{row.item}</td><td>{row.quantity}</td><td>{row.basis}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="development-note">
            <strong>Zakres V3</strong>
            <p>Konfigurator obejmuje parametry potwierdzone w projektach: konstrukcję, płyty, dach, podłogę, stolarkę i szyby, elewacje, elektrykę, hydraulikę, sanitariaty, aneks, HVAC, rolety i podstawowe wyposażenie. Ilości materiałów powierzchniowych i konstrukcyjnych oznaczone jako „szacunkowe” wymagają jeszcze docelowych reguł produkcyjnych.</p>
          </div>
        </section>
      </section>
    </main>
  )
}
