import { useEffect, useMemo, useState } from 'react'
import Pavilion3D, { type PavilionView } from './Pavilion3D'
import TechnicalPavilion3D, { type ClipAxis, type TechnicalView } from './TechnicalPavilion3D'
import { PRESETS } from './presets'
import { buildBom, validateConfig } from './logic'
import { buildComponentModel, CATEGORY_COLORS, componentModelToCsv, type ComponentCategory } from './components'
import {
  CONSTRUCTION_LABELS,
  DEFAULT_CONFIG,
  PANEL_LABELS,
  PANEL_MANUFACTURER_LABELS,
  PANEL_THICKNESS_M,
  RAL_COLORS,
  SURFACE_PROFILE_LABELS,
  type PavilionConfig,
} from './types'
import './App.css'

type Setter = <K extends keyof PavilionConfig>(key: K, value: PavilionConfig[K]) => void

type SceneMode = 'realistic' | 'technical'

const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  'floor-frame': 'Rama podłogi',
  structure: 'Konstrukcja nośna',
  'corner-posts': 'Słupy narożne',
  'roof-beams': 'Belki / płatwie dachowe',
  'floor-panels': 'Panele podłogowe',
  'wall-panels': 'Panele ścienne',
  'roof-panels': 'Panele dachowe',
  flashings: 'Obróbki blacharskie',
  joinery: 'Stolarka ALU / PVC',
  decor: 'Okładziny dekoracyjne',
  fasteners: 'Łączniki / wkręty / nity',
  seals: 'Uszczelnienia / taśmy',
  installations: 'Instalacje',
  interior: 'Wykończenie wnętrza',
}

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as ComponentCategory[]

const DEFAULT_CATEGORY_VISIBILITY = Object.fromEntries(
  CATEGORY_KEYS.map((key) => [key, true]),
) as Record<ComponentCategory, boolean>

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
  const wallProfileOptions =
    config.panelManufacturer === 'paneltech'
      ? [
          { value: 'smooth' as const, label: 'Gładka (G)' },
          { value: 'linear' as const, label: 'Linia (L)' },
          { value: 'microwave' as const, label: 'Mikrofala (MF)' },
          { value: 'microline' as const, label: 'Mikrolinia (ML)' },
          { value: 'microrib' as const, label: 'Mikrorowek (MR)' },
          { value: 'carbon' as const, label: 'Carbon (C)' },
        ]
      : config.panelManufacturer === 'balex'
        ? [
            { value: 'smooth' as const, label: 'Gładka (F)' },
            { value: 'linear' as const, label: 'Liniowanie (L)' },
            { value: 'microline' as const, label: 'Mikroprofilowanie (M16)' },
            { value: 'ribbed' as const, label: 'Rowkowanie / głębokie liniowanie' },
          ]
        : Object.entries(SURFACE_PROFILE_LABELS)
            .filter(([value]) => value !== 'trapezoid')
            .map(([value, label]) => ({ value: value as PavilionConfig['wallProfile'], label }))

  return (
    <>
      <Section title="Bryła i konstrukcja" subtitle="wymiary, dach, profile">
        <div className="field-grid">
          <Num label="Długość" value={config.length} min={4} max={12} step={0.01} unit="m" onChange={(v) => update('length', v)} />
          <Num label="Szerokość" value={config.width} min={2.5} max={4} step={0.01} unit="m" onChange={(v) => update('width', v)} />
          <Num label="Wysokość wewn. przód" value={config.frontHeight} min={2.3} max={3.3} step={0.01} unit="m" onChange={(v) => update('frontHeight', v)} />
          <Num label="Wysokość wewn. tył" value={config.backHeight} min={2.3} max={3.3} step={0.01} unit="m" onChange={(v) => update('backHeight', v)} />
        </div>
        <Select label="Kierunek spadku" value={config.roofSlope} onChange={(v) => update('roofSlope', v)} options={[
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
        <Select label="Producent płyt" value={config.panelManufacturer} onChange={(v) => update('panelManufacturer', v)} options={
          Object.entries(PANEL_MANUFACTURER_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['panelManufacturer'], label }))
        } />
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
          <Select label="Profilacja ściany" value={config.wallProfile} onChange={(v) => update('wallProfile', v)} options={wallProfileOptions} />
          <Select label="Profilacja dachu" value={config.roofProfile} onChange={(v) => update('roofProfile', v)} options={[
            { value: 'trapezoid', label: 'Trapez dachowy (T)' },
            { value: 'smooth', label: 'Gładka — tylko wariant niestandardowy' },
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
          { value: 'plain', label: 'Goły panel PIR / techniczny' },
          { value: 'cassette-graphite', label: 'Kaseton grafit' },
          { value: 'cassette-black', label: 'Kaseton czarny mat' },
          { value: 'lamella-winchester', label: 'Lamele Winchester' },
          { value: 'lamella-black', label: 'Lamele czarne' },
          { value: 'lamella-diagonal-winchester', label: 'Lamele ukośne · Winchester' },
          { value: 'cassette-lamella', label: 'Kaseton + lamele' },
          { value: 'silver-rectangle', label: 'Srebrny prostokąt' },
          { value: 'cassette-horizontal', label: 'Kasetony poziome · fuga cieniowa' },
          { value: 'cassette-grid', label: 'Kasetony · siatka prostokątna' },
          { value: 'vertical-ribbed', label: 'Blacha pionowa · wysoki profil' },
          { value: 'wood-horizontal', label: 'Deska drewnopodobna · pozioma' },
          { value: 'ornament-panel', label: 'Panel ażurowy · ornament' },
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

function initialConfig(): PavilionConfig {
  const presetId = new URLSearchParams(window.location.search).get('preset')
  const preset = PRESETS.find((item) => item.id === presetId)
  return preset ? { ...preset.config } : { ...DEFAULT_CONFIG }
}

export default function App() {
  const [config, setConfig] = useState<PavilionConfig>(initialConfig)
  const [sceneKey, setSceneKey] = useState(0)
  const [showHQ, setShowHQ] = useState(() => new URLSearchParams(window.location.search).get('hq') === '1')
  const [viewMode, setViewMode] = useState<PavilionView>(() => {
    const value = new URLSearchParams(window.location.search).get('rview') as PavilionView | null
    const allowed: PavilionView[] = ['perspective', 'front', 'front-left', 'front-right', 'left', 'right', 'back']
    return value && allowed.includes(value) ? value : 'perspective'
  })
  const [sceneMode, setSceneMode] = useState<SceneMode>(() =>
    new URLSearchParams(window.location.search).get('mode') === 'technical' ? 'technical' : 'realistic',
  )
  const [technicalView, setTechnicalView] = useState<TechnicalView>(() => {
    const value = new URLSearchParams(window.location.search).get('view') as TechnicalView | null
    const allowed: TechnicalView[] = ['axon', 'front', 'side', 'top', 'perspective', 'detail-a', 'detail-b', 'detail-c', 'detail-d']
    return value && allowed.includes(value) ? value : 'axon'
  })
  const [exploded, setExploded] = useState(() => {
    const value = Number(new URLSearchParams(window.location.search).get('explode') ?? 0)
    return Math.max(0, Math.min(1, value > 1 ? value / 100 : value))
  })
  const [assemblyStage, setAssemblyStage] = useState(() => {
    const value = Number(new URLSearchParams(window.location.search).get('stage') ?? 12)
    return Math.max(1, Math.min(12, Number.isFinite(value) ? value : 12))
  })
  const [playingAssembly, setPlayingAssembly] = useState(false)
  const [categoryVisibility, setCategoryVisibility] = useState<Record<ComponentCategory, boolean>>({ ...DEFAULT_CATEGORY_VISIBILITY })
  const [selectedId, setSelectedId] = useState<string>()
  const [hoveredId, setHoveredId] = useState<string>()
  const [isolatedId, setIsolatedId] = useState<string>()
  const [showDimensions, setShowDimensions] = useState(() => new URLSearchParams(window.location.search).get('dims') !== '0')
  const [showBalloons, setShowBalloons] = useState(() => new URLSearchParams(window.location.search).get('balloons') === '1')
  const [clipAxis, setClipAxis] = useState<ClipAxis>(() => {
    const value = new URLSearchParams(window.location.search).get('clip')
    return value === 'x' || value === 'y' || value === 'z' ? value : 'none'
  })
  const [clipOffset, setClipOffset] = useState(() => Number(new URLSearchParams(window.location.search).get('clipOffset') ?? 0) || 0)

  const componentModel = useMemo(() => buildComponentModel(config), [config])
  const validation = useMemo(() => validateConfig(config), [config])
  const bom = useMemo(() => buildBom(config), [config])
  const selectedComponent = useMemo(
    () => componentModel.components.find((item) => item.id === selectedId),
    [componentModel, selectedId],
  )

  useEffect(() => {
    if (!playingAssembly) return
    const timer = window.setInterval(() => {
      setAssemblyStage((stage) => {
        if (stage >= 12) {
          window.clearInterval(timer)
          setPlayingAssembly(false)
          return 12
        }
        return stage + 1
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [playingAssembly])

  const stats = useMemo(() => {
    const floorT = PANEL_THICKNESS_M[config.floorPanel]
    const roofT = PANEL_THICKNESS_M[config.roofPanel]
    const outerFront = floorT + config.frontHeight + roofT
    const outerBack = floorT + config.backHeight + roofT
    return {
      floor: config.length * config.width,
      walls: (config.length + config.width) * (outerFront + outerBack),
      roof: config.length * Math.hypot(config.width, outerFront - outerBack),
      roofDrop: Math.round(Math.abs(config.frontHeight - config.backHeight) * 1000),
      outerFront,
      outerBack,
      openings: config.aluDoorCount + config.fixedGlazingCount + config.aluWindowCount + config.pvcWindowCount,
    }
  }, [config])

  const update: Setter = (key, value) => {
    const geometryKeys: Array<keyof PavilionConfig> = [
      'length', 'width',
      'aluDoorCount', 'aluDoorWidth', 'aluDoorHeight',
      'fixedGlazingCount', 'fixedGlazingWidth', 'fixedGlazingHeight',
      'aluWindowCount', 'aluWindowWidth', 'aluWindowHeight',
      'pvcWindowCount', 'pvcWindowWidth', 'pvcWindowHeight',
      'rollers', 'rollerCount',
      'facade', 'facadeFront', 'facadeLeft', 'facadeRight', 'facadeBack',
    ]
    setConfig((current) => ({
      ...current,
      project: 'Własna konfiguracja',
      geometry: geometryKeys.includes(key) ? undefined : current.geometry,
      [key]: value,
    }))
  }

  const loadPreset = (id: string) => {
    const preset = PRESETS.find((item) => item.id === id)
    if (!preset) return
    setConfig({ ...preset.config })
    setShowHQ(false)
    setViewMode('perspective')
    if (id === 'galeria-03') setSceneMode('realistic')
    setTechnicalView('axon')
    setSelectedId(undefined)
    setHoveredId(undefined)
    setIsolatedId(undefined)
    setExploded(0)
    setAssemblyStage(12)
    setSceneKey((value) => value + 1)
  }

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportConfig = () => {
    const payload = JSON.stringify({
      version: 7,
      generatedAt: new Date().toISOString(),
      config,
      validation,
      bom,
      componentModel,
    }, null, 2)
    downloadBlob(
      new Blob([payload], { type: 'application/json' }),
      'pawilon-' + config.project.replaceAll('/', '-') + '-components.json',
    )
  }

  const exportCsv = () => {
    downloadBlob(
      new Blob(['\uFEFF' + componentModelToCsv(componentModel)], { type: 'text/csv;charset=utf-8' }),
      'pawilon-' + config.project.replaceAll('/', '-') + '-bom.csv',
    )
  }

  const exportPng = () => {
    const root = window as typeof window & {
      __DAMPOL3D_CAPTURE__?: () => string
      __DAMPOL3D_REAL_CAPTURE__?: () => string
    }
    const canvas = document.querySelector<HTMLCanvasElement>('.canvas-wrap canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'pawilon-' + config.project.replaceAll('/', '-') + '-' + sceneMode + '.png'
    link.href =
      sceneMode === 'technical' && root.__DAMPOL3D_CAPTURE__
        ? root.__DAMPOL3D_CAPTURE__()
        : sceneMode === 'realistic' && root.__DAMPOL3D_REAL_CAPTURE__
          ? root.__DAMPOL3D_REAL_CAPTURE__()
          : canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-row"><span className="brand-mark">D</span><strong>DAMPOL 3D</strong></div>
          <p>Konfigurator techniczno-sprzedażowy · 15 projektów referencyjnych</p>
        </div>
        <span className="status-pill">V7</span>
      </header>

      <section className="preset-bar">
        <label>
          <span>Projekt referencyjny</span>
          <select value={PRESETS.find((p) => p.config.project === config.project)?.id ?? ''} onChange={(e) => e.target.value ? loadPreset(e.target.value) : setConfig(DEFAULT_CONFIG)}>
            <option value="">Własna konfiguracja</option>
            {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
        </label>
        <div className="preset-meta">
          <strong>{config.project}</strong>
          <small>{PRESETS.find((p) => p.config.project === config.project)?.notes ?? 'Konfiguracja własna — parametry zmieniane ręcznie.'}</small>
        </div>
        <button onClick={() => { setConfig(DEFAULT_CONFIG); setViewMode('perspective'); setSceneKey((v) => v + 1) }}>Reset</button>
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <ConfigControls config={config} update={update} />
        </aside>

        <section className="viewer-column">
          <div className="viewer-card">
            <div className="viewer-toolbar">
              <div>
                <strong>{config.length.toFixed(2)} × {config.width.toFixed(2)} m · zew. {stats.outerFront.toFixed(2)}→{stats.outerBack.toFixed(2)} m · wew. {config.frontHeight.toFixed(2)}→{config.backHeight.toFixed(2)} m</strong>
                <small>{sceneMode === 'realistic' ? 'widok realistyczny · obrót LPM · zoom kółko' : 'widok techniczny 3D · BOM i scena z jednego modelu danych'}</small>
              </div>
              <div className="mode-switch">
                <button className={sceneMode === 'realistic' ? 'active' : ''} onClick={() => setSceneMode('realistic')}>Realistyczny</button>
                <button className={sceneMode === 'technical' ? 'active' : ''} onClick={() => setSceneMode('technical')}>Rozbiórka / techniczny</button>
              </div>
            </div>

            <div className="viewer-toolbar sub-toolbar">
              <div className="viewer-actions">
                {sceneMode === 'realistic' ? (
                  <>
                    {([
                      ['perspective', 'Perspektywa'],
                      ['front', 'Front'],
                      ['left', 'Lewy'],
                      ['right', 'Prawy'],
                      ['back', 'Tył'],
                    ] as Array<[PavilionView, string]>).map(([view, label]) => (
                      <button
                        key={view}
                        className={viewMode === view ? 'active' : ''}
                        onClick={() => { setViewMode(view); setSceneKey((v) => v + 1) }}
                      >
                        {label}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {([
                      ['axon', 'Aksonometria'],
                      ['front', 'Front'],
                      ['side', 'Bok'],
                      ['top', 'Góra'],
                      ['perspective', 'Perspektywa'],
                    ] as Array<[TechnicalView, string]>).map(([view, label]) => (
                      <button key={view} className={technicalView === view ? 'active' : ''} onClick={() => setTechnicalView(view)}>{label}</button>
                    ))}
                  </>
                )}
              </div>
              <div className="viewer-actions">
                <button onClick={exportPng}>PNG</button>
                <button onClick={exportCsv}>CSV BOM</button>
                <button onClick={exportConfig}>JSON</button>
              </div>
            </div>

            {sceneMode === 'technical' && (
              <div className="tech-controls">
                <label className="range-control">
                  <span>Rozsunięcie <strong>{Math.round(exploded * 100)}%</strong></span>
                  <input type="range" min="0" max="1" step="0.01" value={exploded} onChange={(e) => setExploded(Number(e.target.value))} />
                </label>
                <label className="range-control">
                  <span>Etap montażu <strong>{assemblyStage}/12</strong></span>
                  <input type="range" min="1" max="12" step="1" value={assemblyStage} onChange={(e) => setAssemblyStage(Number(e.target.value))} />
                </label>
                <button
                  className="play-button"
                  onClick={() => {
                    if (!playingAssembly) setAssemblyStage(1)
                    setPlayingAssembly((v) => !v)
                  }}
                >{playingAssembly ? 'Stop' : '▶ Odtwórz montaż'}</button>
                <label className="mini-toggle"><input type="checkbox" checked={showDimensions} onChange={(e) => setShowDimensions(e.target.checked)} /> Wymiary</label>
                <label className="mini-toggle"><input type="checkbox" checked={showBalloons} onChange={(e) => setShowBalloons(e.target.checked)} /> Balony poz.</label>
                <label className="clip-control">
                  <span>Przekrój</span>
                  <select value={clipAxis} onChange={(e) => setClipAxis(e.target.value as ClipAxis)}>
                    <option value="none">Wył.</option>
                    <option value="x">X</option>
                    <option value="y">Y</option>
                    <option value="z">Z</option>
                  </select>
                </label>
                {clipAxis !== 'none' && (
                  <label className="range-control compact">
                    <span>Płaszczyzna {clipAxis.toUpperCase()} <strong>{clipOffset.toFixed(2)} m</strong></span>
                    <input
                      type="range"
                      min={-Math.max(config.length, config.width, 4)}
                      max={Math.max(config.length, config.width, 4)}
                      step="0.05"
                      value={clipOffset}
                      onChange={(e) => setClipOffset(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>
            )}

            {sceneMode === 'realistic' ? (
              config.project === 'GALERIA/03' ? (
                <div className="gallery-compare gallery-compare-3up">
                  <figure className="gallery-reference-pane">
                    <img src="./reference/gallery-03.jpg" alt="Zdjęcie referencyjne 03 z galerii Dampol" />
                    <figcaption>ZDJĘCIE 03 · REFERENCJA</figcaption>
                  </figure>
                  <div className="gallery-render-pane">
                    <div className="gallery-pane-label">RENDER · INTERAKTYWNY</div>
                    <div className="canvas-wrap gallery-render-canvas">
                      <Pavilion3D key={sceneKey} config={config} view={viewMode} />
                    </div>
                  </div>
                  <div className="gallery-render-pane gallery-hq-pane">
                    <div className="gallery-pane-label">RENDER HQ · PATH TRACER</div>
                    {showHQ ? (
                      <div className="canvas-wrap gallery-render-canvas">
                        <Pavilion3D key={'hq-' + sceneKey} config={config} view={viewMode} hq />
                      </div>
                    ) : (
                      <button className="gallery-hq-button" type="button" onClick={() => setShowHQ(true)}>
                        Render HQ
                        <small>three-gpu-pathtracer · ten sam kadr</small>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="canvas-wrap">
                  <Pavilion3D key={sceneKey} config={config} view={viewMode} />
                </div>
              )
            ) : (
              <div className="technical-workspace">
                <aside className="technical-tree">
                  <div className="tech-pane-title">
                    <strong>Elementy</strong>
                    <small>{componentModel.metrics.componentCount} obiektów</small>
                  </div>
                  <div className="category-tree">
                    {CATEGORY_KEYS.map((category) => {
                      const items = componentModel.components.filter((item) => item.category === category)
                      return (
                        <details key={category} open={category !== 'fasteners'}>
                          <summary>
                            <span className="category-dot" style={{ background: CATEGORY_COLORS[category] }} />
                            <input
                              type="checkbox"
                              checked={categoryVisibility[category]}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setCategoryVisibility((current) => ({ ...current, [category]: e.target.checked }))}
                            />
                            <span>{CATEGORY_LABELS[category]}</span>
                            <small>{items.length}</small>
                          </summary>
                          <div className="tree-items">
                            {items.map((item) => (
                              <button
                                key={item.id}
                                className={(selectedId === item.id ? 'selected ' : '') + (hoveredId === item.id ? 'hovered' : '')}
                                onMouseEnter={() => setHoveredId(item.id)}
                                onMouseLeave={() => setHoveredId(undefined)}
                                onClick={() => setSelectedId(item.id)}
                              >
                                <b>{item.positionNo}</b>
                                <span>{item.namePL}</span>
                              </button>
                            ))}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                </aside>

                <div className="canvas-wrap technical-canvas">
                  <TechnicalPavilion3D
                    key={technicalView}
                    config={config}
                    model={componentModel}
                    exploded={exploded}
                    assemblyStage={assemblyStage}
                    categoryVisibility={categoryVisibility}
                    selectedId={selectedId}
                    hoveredId={hoveredId}
                    isolatedId={isolatedId}
                    view={technicalView}
                    showDimensions={showDimensions}
                    showBalloons={showBalloons}
                    clipAxis={clipAxis}
                    clipOffset={clipOffset}
                    onSelect={setSelectedId}
                    onHover={setHoveredId}
                  />
                  <div className="drawing-title-block">
                    <strong>DAMPOL · {config.project}</strong>
                    <span>{Math.round(config.length * 1000)}×{Math.round(config.width * 1000)} mm</span>
                    <span>{technicalView.toUpperCase()} · 3D TECH</span>
                  </div>
                </div>

                <aside className="technical-inspector">
                  <div className="tech-pane-title"><strong>Karta elementu</strong></div>
                  {selectedComponent ? (
                    <div className="component-card">
                      <div className="position-chip">POZ. {selectedComponent.positionNo}</div>
                      <h3>{selectedComponent.namePL}</h3>
                      <dl>
                        <dt>Kategoria</dt><dd>{CATEGORY_LABELS[selectedComponent.category]}</dd>
                        <dt>Materiał</dt><dd>{selectedComponent.material}</dd>
                        <dt>Kolor / RAL</dt><dd>{selectedComponent.ral ?? selectedComponent.color}</dd>
                        <dt>Wymiary</dt>
                        <dd>{selectedComponent.dimensions.lengthMm} × {selectedComponent.dimensions.widthMm} × {selectedComponent.dimensions.thicknessMm} mm</dd>
                        {selectedComponent.dimensions.developedWidthMm && <><dt>Rozwinięcie</dt><dd>{selectedComponent.dimensions.developedWidthMm} mm</dd></>}
                        <dt>Ilość</dt><dd>{selectedComponent.quantity} szt.</dd>
                        {selectedComponent.massKg != null && <><dt>Masa</dt><dd>{selectedComponent.massKg.toFixed(2)} kg</dd></>}
                        <dt>Etap</dt><dd>{selectedComponent.assemblyStage}/12</dd>
                        <dt>Dokładność</dt><dd>{selectedComponent.sourceAccuracy}</dd>
                      </dl>
                      <div className="component-actions">
                        <button onClick={() => setIsolatedId(isolatedId === selectedComponent.id ? undefined : selectedComponent.id)}>
                          {isolatedId === selectedComponent.id ? 'Pokaż wszystko' : 'Izoluj'}
                        </button>
                        <button onClick={() => { setSelectedId(undefined); setIsolatedId(undefined) }}>Wyczyść</button>
                      </div>
                      {(selectedComponent.assumptionCodes?.length ?? 0) > 0 && (
                        <div className="assumption-tags">{selectedComponent.assumptionCodes?.map((code) => <span key={code}>{code}</span>)}</div>
                      )}
                    </div>
                  ) : (
                    <p className="empty-selection">Kliknij element w modelu lub na liście, aby zobaczyć jego dane.</p>
                  )}

                  <div className="legend">
                    <strong>Legenda</strong>
                    {CATEGORY_KEYS.map((category) => (
                      <span key={category}><i style={{ background: CATEGORY_COLORS[category] }} />{CATEGORY_LABELS[category]}</span>
                    ))}
                  </div>
                </aside>
              </div>
            )}

            {sceneMode === 'technical' && (
              <div className="detail-toolbar">
                {([
                  ['detail-a', 'Detal A · narożnik ściana–dach'],
                  ['detail-b', 'Detal B · osadzenie drzwi'],
                  ['detail-c', 'Detal C · panel–rama podłogi'],
                  ['detail-d', 'Detal D · attyka'],
                ] as Array<[TechnicalView, string]>).map(([view, label]) => (
                  <button key={view} className={technicalView === view ? 'active' : ''} onClick={() => setTechnicalView(view)}>{label}</button>
                ))}
              </div>
            )}
          </div>

          <div className="summary-grid">
            <article><span>Podłoga</span><strong>{componentModel.metrics.floorAreaM2.toFixed(1)} m²</strong><small>z modelu elementów</small></article>
            <article><span>Ściany netto</span><strong>{componentModel.metrics.netWallAreaM2.toFixed(1)} m²</strong><small>po odjęciu otworów</small></article>
            <article><span>Dach</span><strong>{componentModel.metrics.roofAreaM2.toFixed(1)} m²</strong><small>po spadku</small></article>
            <article><span>Obróbki</span><strong>{componentModel.metrics.flashingLengthM.toFixed(1)} m</strong><small>łączna długość</small></article>
            <article><span>Łączniki</span><strong>{componentModel.metrics.fastenerCount}</strong><small>wkręty / nity / kotwy</small></article>
            <article><span>Elementy</span><strong>{componentModel.metrics.componentCount}</strong><small>obiektów 3D/BOM</small></article>
          </div>

          <div className="lower-grid">
            <section className="info-card">
              <div className="card-head"><strong>Walidacja</strong></div>
              <div className="validation-list">
                {validation.map((item, i) => <div key={i} className={'validation ' + item.level}><span>{item.level === 'error' ? '×' : item.level === 'warning' ? '!' : '✓'}</span>{item.message}</div>)}
                <div className="validation ok"><span>✓</span>Model paneli ściennych: {componentModel.metrics.modeledWallPanelAreaM2.toFixed(2)} m² / wymagane netto {componentModel.metrics.netWallAreaM2.toFixed(2)} m².</div>
                <div className={Math.abs(componentModel.metrics.modeledWallPanelAreaM2 - componentModel.metrics.netWallAreaM2) < 0.05 ? 'validation ok' : 'validation warning'}>
                  <span>{Math.abs(componentModel.metrics.modeledWallPanelAreaM2 - componentModel.metrics.netWallAreaM2) < 0.05 ? '✓' : '!'}</span>
                  Różnica powierzchni paneli: {Math.abs(componentModel.metrics.modeledWallPanelAreaM2 - componentModel.metrics.netWallAreaM2).toFixed(3)} m².
                </div>
              </div>
            </section>

            <section className="info-card">
              <div className="card-head">
                <strong>BOM z modelu 3D</strong>
                <div className="card-actions">
                  <button onClick={exportCsv}>CSV</button>
                  <button onClick={exportConfig}>JSON</button>
                </div>
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
            <strong>Założenia techniczne V5</strong>
            <p>Pozycje oznaczone jako „assumption” nie są przedstawiane jako dane projektowe. Rozstaw łączników, rozwinięcia obróbek, masa blach i część położeń instalacji są jawnie parametryzowane i mogą zostać podmienione po dostarczeniu detali wykonawczych.</p>
            <details>
              <summary>Pokaż {componentModel.assumptions.length} założeń</summary>
              <ul>{componentModel.assumptions.map((item) => <li key={item.code}><b>{item.code}</b> — {item.description}</li>)}</ul>
            </details>
          </div>
        </section>
      </section>
    </main>
  )
}
