import { useMemo, useState } from 'react'
import { PANEL_THICKNESS_M, type OpeningKind, type OpeningPlacement, type PavilionConfig, type WallSide } from '../types'
import {
  editableGeometry,
  freeSlot,
  nextOpeningId,
  OPENING_DEFAULTS,
  OPENING_KIND_LABELS,
  wallSpan,
  WALL_LABELS,
  withOpenings,
} from './configState'
import { NumberField, Segmented, SelectField, Swatches, Switch } from './controls'
import { Icon } from './icons'

const FRAME_COLORS = [
  { value: '#2b3033', name: 'Antracyt (jak elewacja)' },
  { value: '#383e42', name: 'RAL 7016' },
  { value: '#17191b', name: 'Czarny mat' },
  { value: '#f2f0e7', name: 'Biały RAL 9010' },
  { value: '#a5a5a3', name: 'Srebrny RAL 9006' },
]

/**
 * Modularny edytor stolarki. Każdy element ma typ, ścianę, położenie, wymiary, profil, kolor,
 * stronę otwierania, pochwyt i roletę. Zmiany trafiają do `config.geometry.openings` —
 * tej samej listy, z której liczony jest model 3D i BOM. Struktura gotowa pod drag&drop
 * (położenie = `center` w metrach wzdłuż ściany).
 */
export function OpeningsEditor({ config, onChange }: { config: PavilionConfig; onChange: (next: PavilionConfig) => void }) {
  const openings = useMemo(() => editableGeometry(config).openings, [config])
  const [openId, setOpenId] = useState<string | undefined>(openings[0]?.id)
  const [addKind, setAddKind] = useState<OpeningKind>('fixed-glass')
  const [addWall, setAddWall] = useState<WallSide>('front')
  const floorT = PANEL_THICKNESS_M[config.floorPanel]
  const wallHeight = floorT + Math.min(config.frontHeight, config.backHeight) + PANEL_THICKNESS_M[config.roofPanel]

  const commit = (next: OpeningPlacement[]) => onChange(withOpenings(config, next))
  const patch = (id: string, change: Partial<OpeningPlacement>) =>
    commit(openings.map((o) => (o.id === id ? { ...o, ...change, sourceAccuracy: 'drawing-estimate' } : o)))

  const add = () => {
    const d = OPENING_DEFAULTS[addKind]
    const slot = freeSlot(config, openings, addWall, d.width)
    const id = nextOpeningId(openings, addKind)
    commit([...openings, {
      id, wall: addWall, center: slot.center, width: d.width, height: d.height, sill: d.sill,
      kind: addKind, glazing: config.glazing, frameColor: '#2b3033', sourceAccuracy: 'drawing-estimate',
    }])
    setOpenId(id)
  }

  return (
    <div className="openings-editor">
      <div className="openings-list">
        {openings.length === 0 && <p className="muted">Brak stolarki. Dodaj pierwszy element poniżej.</p>}
        {openings.map((o) => {
          const span = wallSpan(config, o.wall)
          const limit = Math.max(0, span / 2 - o.width / 2 - 0.08)
          const outside = Math.abs(o.center) > limit + 0.001
          const tooHigh = floorT + (o.sill ?? 0) + o.height > wallHeight - 0.08
          const isDoor = o.kind.startsWith('door-')
          const expanded = openId === o.id
          return (
            <article key={o.id} className={'opening-card' + (expanded ? ' open' : '') + (outside || tooHigh ? ' warn' : '')}>
              <button type="button" className="opening-head" onClick={() => setOpenId(expanded ? undefined : o.id)}>
                <span className="opening-badge">{o.id}</span>
                <span className="opening-title">
                  <strong>{OPENING_KIND_LABELS[o.kind]}</strong>
                  <small>{WALL_LABELS[o.wall]} · {Math.round(o.width * 1000)} × {Math.round(o.height * 1000)} mm{o.roller ? ' · roleta' : ''}</small>
                </span>
                {(outside || tooHigh) && <span className="opening-flag" title="Element koliduje z obrysem ściany"><Icon.alert /></span>}
                <Icon.chevron />
              </button>
              {expanded && (
                <div className="opening-body">
                  <div className="grid-2">
                    <SelectField label="Typ" value={o.kind} onChange={(kind) => patch(o.id, { kind, sill: OPENING_DEFAULTS[kind].sill })}
                      options={(Object.keys(OPENING_KIND_LABELS) as OpeningKind[]).map((k) => ({ value: k, label: OPENING_KIND_LABELS[k] }))} />
                    <Segmented label="Ściana" value={o.wall} size="sm" onChange={(wall) => patch(o.id, { wall, center: 0 })}
                      options={(Object.keys(WALL_LABELS) as WallSide[]).map((w) => ({ value: w, label: WALL_LABELS[w].slice(0, 1), title: WALL_LABELS[w] }))} />
                  </div>
                  <label className="range-field">
                    <span className="field-label"><span>Położenie na ścianie</span><em>{o.center >= 0 ? '+' : ''}{o.center.toFixed(2)} m od osi</em></span>
                    <input type="range" min={-limit} max={limit} step={0.01} value={Math.max(-limit, Math.min(limit, o.center))}
                      onChange={(e) => patch(o.id, { center: Number(e.target.value) })} />
                  </label>
                  <div className="grid-3">
                    <NumberField label="Szerokość" value={o.width} min={0.3} max={Math.max(0.4, span - 0.2)} step={0.01} unit="m" onChange={(width) => patch(o.id, { width })} />
                    <NumberField label="Wysokość" value={o.height} min={0.3} max={2.6} step={0.01} unit="m" onChange={(height) => patch(o.id, { height })} />
                    <NumberField label="Parapet" value={o.sill ?? 0} min={0} max={2} step={0.01} unit="m" tip="Wysokość dolnej krawędzi otworu nad podłogą. Dla drzwi 0."
                      onChange={(sill) => patch(o.id, { sill })} />
                  </div>
                  <div className="grid-2">
                    <SelectField label="Profil" value={o.profile ?? (o.kind === 'pvc-window' ? 'pvc' : 'alu-standard')}
                      tip="System profili — wpływa na widoczną szerokość ramy (ALU slim ≈ 50 mm, standard ≈ 62 mm, PVC ≈ 75 mm)."
                      onChange={(profile) => patch(o.id, { profile })}
                      options={[{ value: 'alu-slim', label: 'ALU slim' }, { value: 'alu-standard', label: 'ALU standard' }, { value: 'pvc', label: 'PVC' }]} />
                    <SelectField label="Szyba" value={o.glazing ?? config.glazing} onChange={(glazing) => patch(o.id, { glazing })}
                      options={[{ value: 'double', label: '2-szybowa' }, { value: 'triple', label: '3-szybowa' }]} />
                  </div>
                  {isDoor && (
                    <div className="grid-2">
                      <Segmented label="Zawiasy" value={o.hinge ?? 'left'} size="sm" onChange={(hinge) => patch(o.id, { hinge })}
                        tip="Strona zawiasów patrząc od zewnątrz."
                        options={[{ value: 'left', label: 'Lewe' }, { value: 'right', label: 'Prawe' }]} />
                      <Segmented label="Pochwyt" value={o.handle ?? (o.kind === 'door-full' ? 'lever' : 'bar')} size="sm" onChange={(handle) => patch(o.id, { handle })}
                        options={[{ value: 'bar', label: 'Pochwyt' }, { value: 'lever', label: 'Klamka' }, { value: 'none', label: 'Brak' }]} />
                    </div>
                  )}
                  <Swatches label="Kolor ramy" value={o.frameColor ?? '#2b3033'} options={FRAME_COLORS} onChange={(frameColor) => patch(o.id, { frameColor })} />
                  <Switch label="Roleta zewnętrzna" checked={!!o.roller} onChange={(roller) => patch(o.id, { roller })} />
                  <div className="opening-actions">
                    <button type="button" className="btn ghost" onClick={() => {
                      const id = nextOpeningId(openings, o.kind)
                      const slot = freeSlot(config, openings, o.wall, o.width)
                      commit([...openings, { ...o, id, center: slot.center }])
                      setOpenId(id)
                    }}><Icon.copy /> Duplikuj</button>
                    <button type="button" className="btn ghost danger" onClick={() => commit(openings.filter((x) => x.id !== o.id))}><Icon.trash /> Usuń</button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="opening-add">
        <SelectField label="Nowy element" value={addKind} onChange={setAddKind}
          options={(Object.keys(OPENING_KIND_LABELS) as OpeningKind[]).map((k) => ({ value: k, label: OPENING_KIND_LABELS[k] }))} />
        <Segmented label="Ściana" value={addWall} size="sm" onChange={setAddWall}
          options={(Object.keys(WALL_LABELS) as WallSide[]).map((w) => ({ value: w, label: WALL_LABELS[w].slice(0, 1), title: WALL_LABELS[w] }))} />
        <button type="button" className="btn primary" onClick={add}><Icon.plus /> Dodaj</button>
      </div>
    </div>
  )
}
