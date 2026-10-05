import { arch } from '../../render/architecture'
import type { PavilionConfig } from '../../types'
import { frameDims } from '../frame'
import { finishForConfig, runCutLength } from '../geometry'
import { buildSystem1 } from '../system1/build'
import type { Part } from '../types'

/**
 * P10: stolarka z JEDNEGO modelu — części stolarki z przekrojów (te same co w widoku 3D i trybie technicznym) →
 * rozkrój profili (długość cięcia z uciosem), szyby (wymiar, m²), okucia. Pozycja zamówieniowa stolarki w BOM
 * (`joinery-*` w components.ts: element na otwór) zostaje — rozkrój jest jej rozpisaniem, liczonym z geometrii modelu.
 */
export type JoineryCutRow = { opening: string; element: string; kind: 'profil' | 'szyba' | 'okucie' | 'panel'; lengthMm?: number; widthMm?: number; areaM2?: number; quantity: number; color: string }

/** Części stolarki z przekrojów pogrupowane po otworze (puste, gdy konfiguracja poza Systemem 1). */
export function joineryPartsByOpening(config: PavilionConfig): Map<string, Part[]> {
  const out = new Map<string, Part[]>()
  if (!frameDims(config).system1 || !arch(config).sectionJoinery) return out
  for (const p of buildSystem1(config, finishForConfig(config), { decor: false }).parts) {
    if (p.layer !== 'joinery') continue
    const m = /^(?:joinery|glass)-(.+?)-(?:frame|mullion|transom|fix|sash|threshold|stop|hinge|handle|roller|sash-l|sash-r)/.exec(p.id)
    const id = m?.[1] ?? p.id
    const list = out.get(id) ?? []
    list.push(p)
    out.set(id, list)
  }
  return out
}

/** Nazwa przekroju z biblioteki → nazwa w rozkroju. */
function profileName(id: string) {
  const sash = /^aluminiumSash-(\d+)/.exec(id)
  if (sash) return 'Skrzydło (lico ' + sash[1] + ' mm)'
  const base = id.replace(/-\d+x\d+$/, '')
  const names: Record<string, string> = {
    aluminiumFrame: 'Ościeżnica FIX', aluminiumFrameCoupled: 'Ościeżnica — styk ram (½ słupka)', aluminiumDoorFrame: 'Ościeżnica skrzydłowa',
    aluminiumDoorFrameCoupled: 'Ościeżnica skrzydłowa — styk ram (½ słupka)', doorStop: 'Przylga skrzydła', doorStopSeal: 'Uszczelka przylgowa',
    glazingBead: 'Listwa przyszybowa', sealInner: 'Uszczelka szyby wewn.', sealOuter: 'Uszczelka szyby zewn.', threshold: 'Próg', mullion: 'Słupek', transom: 'Ślemię',
  }
  return names[base] ?? id
}
/** Okucia złożone z kilku brył (klamka: szyjka + dźwignia, pochwyt: pręt + wsporniki) — liczone jako 1 szt. */
const ONE_PIECE = new Set(['Klamka', 'Pochwyt', 'Klamka okienna'])

export function joineryCutList(config: PavilionConfig): JoineryCutRow[] {
  const rows = new Map<string, JoineryCutRow>()
  const add = (r: JoineryCutRow) => {
    const key = [r.opening, r.element, r.kind, r.lengthMm, r.widthMm, r.color].join('|')
    const hit = rows.get(key)
    if (hit) hit.quantity += r.quantity
    else rows.set(key, { ...r })
  }
  for (const [opening, parts] of joineryPartsByOpening(config)) {
    for (const p of parts) {
      const g = p.geometry
      if (p.material === 'glass' || p.material === 'hardware' || p.name.startsWith('Panel')) {
        // szyba / panel / okucie: prostokąt przekroju (s × y)
        const us = g.section.map(([u]) => u)
        const vs = g.section.map(([, v]) => v)
        const w = Math.round((Math.max(...us) - Math.min(...us)) * 1000)
        const h = Math.round((Math.max(...vs) - Math.min(...vs)) * 1000)
        const kind = p.material === 'glass' ? 'szyba' : p.material === 'hardware' ? 'okucie' : 'panel'
        const element = p.name.replace(' ' + opening, '')
        if (kind === 'okucie') {
          // okucie: sztuki (bez wymiarów); bryły jednego okucia razem
          const key = [opening, element, kind, undefined, undefined, p.color].join('|')
          if (ONE_PIECE.has(element) && rows.has(key)) continue
          add({ opening, element, kind, quantity: 1, color: p.color })
          continue
        }
        add({ opening, element, kind, lengthMm: Math.max(w, h), widthMm: Math.min(w, h), areaM2: Math.round(w * h / 1000) / 1000, quantity: 1, color: p.color })
      } else {
        // profil (ościeżnica, skrzydło, listwa, uszczelka, próg, słupek): długość cięcia z uciosem
        add({ opening, element: profileName(p.name.replace(' ' + opening, '')), kind: 'profil', lengthMm: Math.round(runCutLength(g) * 1000), quantity: 1, color: p.color })
      }
    }
  }
  return [...rows.values()].sort((a, b) => a.opening.localeCompare(b.opening) || a.kind.localeCompare(b.kind) || a.element.localeCompare(b.element) || (b.lengthMm ?? 0) - (a.lengthMm ?? 0))
}

export function joineryCutListCsv(rows: JoineryCutRow[]) {
  const q = (v: string | number | undefined) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const head = ['otwor', 'element', 'rodzaj', 'dl_mm', 'szer_mm', 'pow_m2', 'ilosc', 'kolor']
  return [head.map(q).join(';'), ...rows.map((r) => [r.opening, r.element, r.kind, r.lengthMm, r.widthMm, r.areaM2, r.quantity, r.color].map(q).join(';'))].join('\n')
}
