import type { ReactNode } from 'react'
import { DEFAULT_BAND_HEIGHT, DEFAULT_FACADE_GAP, DEFAULT_GRID_HEIGHT } from '../components'
import {
  CONSTRUCTION_LABELS,
  PANEL_LABELS,
  PANEL_MANUFACTURER_LABELS,
  PANEL_THICKNESS_M,
  RAL_COLORS,
  SURFACE_PROFILE_LABELS,
  type FacadeStyle,
  type PavilionConfig,
} from '../types'
import type { Setter } from './configState'
import { CardPicker, Group, NumberField, Segmented, SelectField, Swatches, Switch, type CardOption } from './controls'
import { Icon } from './icons'
import { OpeningsEditor } from './OpeningsEditor'
import type { TabId } from './tabs'

const WOOD = 'repeating-linear-gradient(90deg,#b88a63 0 5px,#3b2a1e 5px 7px)'
const FACADE_OPTIONS: Array<CardOption<FacadeStyle>> = [
  { value: 'cassette-horizontal', label: 'Kasetony poziome', hint: 'fuga cieniowa', preview: 'repeating-linear-gradient(180deg,#3d4246 0 9px,#121416 9px 10px)' },
  { value: 'cassette-grid', label: 'Kasetony siatka', hint: 'moduł prostokątny', preview: 'repeating-linear-gradient(180deg,transparent 0 13px,#121416 13px 14px),repeating-linear-gradient(90deg,#3d4246 0 17px,#121416 17px 18px)' },
  { value: 'vertical-ribbed', label: 'Blacha pionowa', hint: 'wysoki profil', preview: 'repeating-linear-gradient(90deg,#2a2e31 0 4px,#4a5054 4px 6px,#2a2e31 6px 9px)' },
  { value: 'cassette-lamella', label: 'Kaseton + lamele', hint: 'pola drewniane', preview: 'linear-gradient(90deg,#3d4246 0 35%,transparent 35% 65%,#3d4246 65%),' + WOOD },
  { value: 'lamella-winchester', label: 'Lamele Winchester', hint: 'pionowe 40 mm', preview: WOOD },
  { value: 'lamella-diagonal-winchester', label: 'Lamele ukośne', hint: 'Winchester', preview: 'repeating-linear-gradient(55deg,#b88a63 0 5px,#3b2a1e 5px 7px)' },
  { value: 'lamella-black', label: 'Lamele czarne', hint: 'pionowe', preview: 'repeating-linear-gradient(90deg,#26292b 0 5px,#0b0c0d 5px 7px)' },
  { value: 'wood-horizontal', label: 'Deska pozioma', hint: 'drewnopodobna', preview: 'repeating-linear-gradient(180deg,#a8774f 0 8px,#5d3e28 8px 9px)' },
  { value: 'ornament-panel', label: 'Panel ornamentowy', hint: 'ażur', preview: 'radial-gradient(circle at 30% 30%,#c9a44d 0 3px,transparent 4px) 0 0/10px 10px,#1c1f21' },
  { value: 'cassette-graphite', label: 'Kaseton grafit', hint: 'klasyczny', preview: '#3d4246' },
  { value: 'cassette-black', label: 'Kaseton czarny', hint: 'mat', preview: '#141617' },
  { value: 'silver-rectangle', label: 'Srebrny prostokąt', hint: 'akcent', preview: 'linear-gradient(90deg,#3d4246 0 30%,#b4b4b1 30% 70%,#3d4246 70%)' },
  { value: 'plain', label: 'Goły panel PIR', hint: 'techniczny', preview: 'repeating-linear-gradient(90deg,#55595c 0 22px,#3d4144 22px 23px)' },
]

const isCassette = (f: FacadeStyle) => f === 'cassette-horizontal' || f === 'cassette-grid' || f === 'cassette-lamella' || f === 'cassette-graphite' || f === 'cassette-black' || f === 'silver-rectangle'

export function ConfigPanel({
  tab, config, update, setConfig, techContent,
}: {
  tab: TabId
  config: PavilionConfig
  update: Setter
  setConfig: (next: PavilionConfig) => void
  techContent: ReactNode
}) {
  const floorT = PANEL_THICKNESS_M[config.floorPanel]
  const roofT = PANEL_THICKNESS_M[config.roofPanel]
  const outerFront = floorT + config.frontHeight + roofT
  const outerBack = floorT + config.backHeight + roofT

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
            { value: 'linear' as const, label: 'Liniowane (L)' },
            { value: 'microline' as const, label: 'Mikroprofilowanie (M16)' },
            { value: 'ribbed' as const, label: 'Pogłębione liniowanie (D)' },
          ]
        : Object.entries(SURFACE_PROFILE_LABELS)
            .filter(([value]) => value !== 'trapezoid')
            .map(([value, label]) => ({ value: value as PavilionConfig['wallProfile'], label }))

  switch (tab) {
    case 'dims':
      return (
        <>
          <Group title="Gabaryt">
            <div className="grid-2">
              <NumberField label="Długość" value={config.length} min={4} max={12} step={0.01} unit="m" onChange={(v) => update('length', v)} />
              <NumberField label="Szerokość" value={config.width} min={2.5} max={4} step={0.01} unit="m" onChange={(v) => update('width', v)} />
            </div>
          </Group>
          <Group title="Wysokość w świetle" tip="Wysokość wewnętrzna od podłogi do sufitu. Wysokość zewnętrzna = podłoga + wnętrze + dach.">
            <div className="grid-2">
              <NumberField label="Przód" value={config.frontHeight} min={2.3} max={3.3} step={0.01} unit="m" onChange={(v) => update('frontHeight', v)} />
              <NumberField label="Tył" value={config.backHeight} min={2.3} max={3.3} step={0.01} unit="m" onChange={(v) => update('backHeight', v)} />
            </div>
            <dl className="spec-list">
              <div><dt>Wysokość zewnętrzna</dt><dd>{outerFront.toFixed(2)} → {outerBack.toFixed(2)} m</dd></div>
              <div><dt>Powierzchnia zabudowy</dt><dd>{(config.length * config.width).toFixed(2)} m²</dd></div>
              <div><dt>Spadek wewnętrzny</dt><dd>{Math.round(Math.abs(config.frontHeight - config.backHeight) * 1000)} mm</dd></div>
            </dl>
          </Group>
        </>
      )

    case 'body':
      return (
        <>
          <Group title="Konstrukcja" tip="Rama stalowa pawilonu. Kątownik 50×50×4 — lekka rama standardowa; 100×100 i statyka — większe rozpiętości i obciążenia; kratownica — konstrukcja dachu dla dużych szerokości.">
            <SelectField label="Typ konstrukcji" value={config.construction} onChange={(v) => update('construction', v)}
              options={Object.entries(CONSTRUCTION_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['construction'], label }))} />
            <Switch label="Pokaż konstrukcję" note="przezroczysta powłoka, widoczna rama" checked={config.showStructure} onChange={(v) => update('showStructure', v)} />
          </Group>
          <Group title="Płyty warstwowe" tip="Płyty PIR/EPS tworzą przegrodę ścian, dachu i podłogi. Grubość wpływa na izolacyjność i wysokość zewnętrzną.">
            <SelectField label="Producent" value={config.panelManufacturer} onChange={(v) => update('panelManufacturer', v)}
              options={Object.entries(PANEL_MANUFACTURER_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['panelManufacturer'], label }))} />
            <div className="grid-3">
              <SelectField label="Ściany" value={config.wallPanel} onChange={(v) => update('wallPanel', v)}
                options={Object.entries(PANEL_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['wallPanel'], label }))} />
              <SelectField label="Dach" value={config.roofPanel} onChange={(v) => update('roofPanel', v)}
                options={Object.entries(PANEL_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['roofPanel'], label }))} />
              <SelectField label="Podłoga" value={config.floorPanel} onChange={(v) => update('floorPanel', v)}
                options={Object.entries(PANEL_LABELS).map(([value, label]) => ({ value: value as PavilionConfig['floorPanel'], label }))} />
            </div>
            <SelectField label="Profilacja okładziny płyty ściennej" value={config.wallProfile} onChange={(v) => update('wallProfile', v)} options={wallProfileOptions}
              tip="Przetłoczenie zewnętrznej blachy płyty. Widoczne tylko tam, gdzie płyta nie jest zakryta kasetonami lub lamelami." />
          </Group>
        </>
      )

    case 'facade':
      return (
        <>
          <Group title="Styl elewacji">
            <CardPicker value={config.facade} options={FACADE_OPTIONS} onChange={(v) => update('facade', v)} />
          </Group>
          {isCassette(config.facade) && config.facade !== 'cassette-graphite' && config.facade !== 'cassette-black' && config.facade !== 'silver-rectangle' && (
            <Group title="Kasetony" tip="Wysokość pasa i szerokość fugi wg pomiarów z realizacji: pas 240–330 mm, fuga 12–18 mm. Pasy biegną na całe pole między narożnikiem a otworem.">
              <div className="grid-2">
                <NumberField
                  label={config.facade === 'cassette-grid' ? 'Wysokość modułu' : 'Wysokość pasa'}
                  value={config.facadeBandHeight ?? (config.facade === 'cassette-grid' ? DEFAULT_GRID_HEIGHT : DEFAULT_BAND_HEIGHT)}
                  min={0.2} max={1.0} step={0.01} unit="m"
                  onChange={(v) => setConfig({ ...config, facadeBandHeight: v })}
                />
                <NumberField label="Fuga" value={(config.facadeGap ?? DEFAULT_FACADE_GAP) * 1000} min={5} max={30} step={1} unit="mm"
                  onChange={(v) => setConfig({ ...config, facadeGap: v / 1000 })} />
              </div>
              <Switch label="Attyka" note="2 rzędy kasetonów 315 mm, mijanka 600 mm" checked={config.attic} onChange={(v) => update('attic', v)} />
            </Group>
          )}
          <Group title="Kolory">
            <Swatches label="Elewacja" value={config.exteriorColor} options={RAL_COLORS.map((c) => ({ value: c.value, name: c.name }))} onChange={(v) => update('exteriorColor', v)} />
            <Swatches label="Obróbki blacharskie" value={config.flashingColor} options={RAL_COLORS.map((c) => ({ value: c.value, name: c.name }))} onChange={(v) => update('flashingColor', v)} />
          </Group>
          <Group title="Ściany z okładziną">
            <div className="chip-row">
              {([['facadeFront', 'Front'], ['facadeLeft', 'Lewa'], ['facadeRight', 'Prawa'], ['facadeBack', 'Tył']] as const).map(([key, label]) => (
                <button key={key} type="button" className={'chip' + (config[key] ? ' on' : '')} onClick={() => update(key, !config[key])}>
                  {config[key] && <Icon.check />}{label}
                </button>
              ))}
            </div>
          </Group>
        </>
      )

    case 'joinery':
      return (
        <>
          <Group title="Elementy stolarki" tip="Każdy element można przesunąć, zmienić wymiary, typ, profil i stronę otwierania. Lista jest wspólna dla modelu 3D i BOM.">
            <OpeningsEditor config={config} onChange={setConfig} />
          </Group>
          <Group title="Domyślny pakiet szybowy">
            <Segmented value={config.glazing} onChange={(v) => update('glazing', v)}
              options={[{ value: 'double', label: '2 szyby' }, { value: 'triple', label: '3 szyby' }]} />
          </Group>
        </>
      )

    case 'roof':
      return (
        <>
          <Group title="Spadek dachu" tip="Dach jednospadowy. Kierunek spadku wynika z różnicy wysokości przód/tył (zakładka Wymiary).">
            <Segmented value={config.roofSlope} onChange={(v) => update('roofSlope', v)}
              options={[{ value: 'back', label: 'Na tył' }, { value: 'front', label: 'Na front' }, { value: 'flat', label: 'Płaski' }]} />
          </Group>
          <Group title="Pokrycie">
            <SelectField label="Profil blachy dachowej" value={config.roofProfile} onChange={(v) => update('roofProfile', v)}
              tip="Trapez T — standardowa zewnętrzna okładzina płyty dachowej."
              options={[{ value: 'trapezoid', label: 'Trapez dachowy (T)' }, { value: 'smooth', label: 'Gładka (niestandard)' }]} />
            <Switch label="Rynna i rura spustowa" checked={config.gutter} onChange={(v) => update('gutter', v)} />
            <Switch label="Attyka" note="pas kasetonów zakrywający krawędź dachu" checked={config.attic} onChange={(v) => update('attic', v)} />
          </Group>
        </>
      )

    case 'interior':
      return (
        <>
          <Group title="Wykończenie">
            <div className="grid-2">
              <SelectField label="Ściany i sufit" value={config.interiorFinish} onChange={(v) => update('interiorFinish', v)} options={[
                { value: 'white', label: 'Białe' }, { value: 'concrete', label: 'Beton' }, { value: 'black', label: 'Czarne' },
                { value: 'oak', label: 'Dąb Sonoma' }, { value: 'walnut', label: 'Orzech' },
              ]} />
              <SelectField label="Podłoga PVC" value={config.floorFinish} onChange={(v) => update('floorFinish', v)} options={[
                { value: 'wood', label: 'Deska' }, { value: 'concrete', label: 'Beton' }, { value: 'other', label: 'Inne' },
              ]} />
            </div>
            <NumberField label="Płyta MFP podłogi" value={config.mfpThickness} min={12} max={24} step={12} unit="mm" onChange={(v) => update('mfpThickness', (v >= 18 ? 24 : 12) as PavilionConfig['mfpThickness'])} />
            <Switch label="Podgląd wnętrza" note="przezroczyste ściany" checked={config.showInterior} onChange={(v) => update('showInterior', v)} />
          </Group>
          <Group title="Podział">
            <Switch label="Ścianka działowa" checked={config.partitionWall} onChange={(v) => update('partitionWall', v)} />
            <NumberField label="Drzwi wewnętrzne" value={config.internalDoorCount} min={0} max={6} onChange={(v) => update('internalDoorCount', v)} />
          </Group>
        </>
      )

    case 'install':
      return (
        <>
          <Group title="Elektryka">
            <Segmented value={config.electrical} onChange={(v) => update('electrical', v)}
              options={[{ value: '1p230', label: '230 V' }, { value: '3p400', label: '400 V' }, { value: 'none', label: 'Brak' }]} />
            {config.electrical !== 'none' && (
              <>
                <div className="grid-2">
                  <NumberField label="Gniazda podwójne" value={config.doubleSockets} min={0} max={30} onChange={(v) => update('doubleSockets', v)} />
                  <NumberField label="Gniazda pojedyncze" value={config.singleSockets} min={0} max={30} onChange={(v) => update('singleSockets', v)} />
                  <NumberField label="Oprawy LED" value={config.ledCeiling} min={0} max={20} onChange={(v) => update('ledCeiling', v)} />
                  <NumberField label="Włączniki" value={config.switches} min={0} max={20} onChange={(v) => update('switches', v)} />
                </div>
                <Switch label="Rozdzielnica" checked={config.distributionBoard} onChange={(v) => update('distributionBoard', v)} />
                <Switch label="Przyłącze zewnętrzne" checked={config.externalConnection} onChange={(v) => update('externalConnection', v)} />
                <Switch label="Gniazdo siłowe" tip="Wymaga instalacji 3-fazowej 400 V." checked={config.forceSocket} onChange={(v) => update('forceSocket', v)} />
              </>
            )}
          </Group>
          <Group title="Woda i kanalizacja">
            <Switch label="Przyłącze wody" checked={config.waterConnection} onChange={(v) => update('waterConnection', v)} />
            <Switch label="Odpływ / kanalizacja" checked={config.sewerConnection} onChange={(v) => update('sewerConnection', v)} />
            <Segmented label="Bojler" value={String(config.boilerLiters) as '0' | '30' | '50'} onChange={(v) => update('boilerLiters', Number(v) as PavilionConfig['boilerLiters'])}
              options={[{ value: '0', label: 'Brak' }, { value: '30', label: '30 l' }, { value: '50', label: '50 l' }]} />
          </Group>
          <Group title="Klimatyzacja i wentylacja">
            <Switch label="Klimatyzacja" checked={config.airConditioning} onChange={(v) => update('airConditioning', v)} />
            {config.airConditioning && (
              <div className="grid-2">
                <SelectField label="Moc" value={String(config.hvacPower) as '0' | '3.4' | '3.5' | '4.6' | '5.3'} onChange={(v) => update('hvacPower', Number(v) as PavilionConfig['hvacPower'])}
                  options={[{ value: '0', label: '—' }, { value: '3.4', label: '3,4 kW' }, { value: '3.5', label: '3,5 kW' }, { value: '4.6', label: '4,6 kW' }, { value: '5.3', label: '5,3 kW' }]} />
                <SelectField label="Kolor jednostki" value={config.hvacColor} onChange={(v) => update('hvacColor', v)}
                  options={[{ value: 'white', label: 'Biała' }, { value: 'graphite', label: 'Grafit' }, { value: 'black', label: 'Czarna' }]} />
              </div>
            )}
            <Switch label="Grzejnik" checked={config.heater} onChange={(v) => update('heater', v)} />
            <Switch label="Kratka wentylacyjna" checked={config.ventilationGrille} onChange={(v) => update('ventilationGrille', v)} />
          </Group>
        </>
      )

    case 'equipment':
      return (
        <>
          <Group title="Łazienka">
            <Switch label="Łazienka / WC" checked={config.bathroom} onChange={(v) => update('bathroom', v)} />
            {config.bathroom && (
              <>
                <Switch label="WC kompakt" checked={config.toiletCompact} onChange={(v) => update('toiletCompact', v)} />
                <Switch label="Umywalka z szafką" checked={config.washbasin} onChange={(v) => update('washbasin', v)} />
                <Switch label="Prysznic" checked={config.shower} onChange={(v) => update('shower', v)} />
              </>
            )}
          </Group>
          <Group title="Aneks kuchenny">
            <Switch label="Aneks kuchenny" checked={config.kitchen} onChange={(v) => update('kitchen', v)} />
            {config.kitchen && (
              <>
                <NumberField label="Długość aneksu" value={config.kitchenLength} min={0.8} max={3.5} step={0.05} unit="m" onChange={(v) => update('kitchenLength', v)} />
                <Switch label="Punkt wodny" checked={config.kitchenWaterPoint} onChange={(v) => update('kitchenWaterPoint', v)} />
                <Switch label="Płyta indukcyjna" checked={config.induction} onChange={(v) => update('induction', v)} />
                <Switch label="Lodówka" checked={config.fridge} onChange={(v) => update('fridge', v)} />
              </>
            )}
          </Group>
          <Group title="Na zewnątrz">
            <NumberField label="Kinkiety elewacyjne" value={config.externalLights} min={0} max={12} onChange={(v) => update('externalLights', v)} />
          </Group>
        </>
      )

    case 'tech':
      return <>{techContent}</>
  }
}
