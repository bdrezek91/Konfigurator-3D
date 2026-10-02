import { fallbackGeometry } from '../components'
import type { OpeningKind, OpeningPlacement, PavilionConfig, ProjectGeometry, WallSide } from '../types'

export type Setter = <K extends keyof PavilionConfig>(key: K, value: PavilionConfig[K]) => void

/** Klucze zmieniające układ otworów/dekorów — po ich zmianie geometria projektu jest generowana od nowa. */
export const GEOMETRY_KEYS: Array<keyof PavilionConfig> = [
  'length', 'width',
  'aluDoorCount', 'aluDoorWidth', 'aluDoorHeight',
  'fixedGlazingCount', 'fixedGlazingWidth', 'fixedGlazingHeight',
  'aluWindowCount', 'aluWindowWidth', 'aluWindowHeight',
  'pvcWindowCount', 'pvcWindowWidth', 'pvcWindowHeight',
  'rollers', 'rollerCount',
  'facade', 'facadeFront', 'facadeLeft', 'facadeRight', 'facadeBack',
]

export const CUSTOM_PROJECT = 'Własna konfiguracja'

/**
 * Zmiana parametru. Parametry nie wpływające na geometrię (kolory, instalacje, wnętrze)
 * nie odłączają konfiguracji od projektu referencyjnego.
 */
export function applyUpdate<K extends keyof PavilionConfig>(current: PavilionConfig, key: K, value: PavilionConfig[K]): PavilionConfig {
  const geometryChange = GEOMETRY_KEYS.includes(key)
  return {
    ...current,
    project: geometryChange ? CUSTOM_PROJECT : current.project,
    geometry: geometryChange ? undefined : current.geometry,
    [key]: value,
  }
}

/** Geometria do edycji: projekt lub wygenerowana z parametrów (ta sama, której używa BOM). */
export function editableGeometry(config: PavilionConfig): ProjectGeometry {
  const source = config.geometry ?? fallbackGeometry(config)
  return {
    ...source,
    openings: source.openings.map((o) => ({ ...o })),
    decor: source.decor.map((d) => ({ ...d })),
    exteriorLights: source.exteriorLights?.map((l) => ({ ...l })),
  }
}

/** Liczniki stolarki (używane w walidacji i starych eksportach) wyliczane z listy elementów. */
export function syncOpeningCounts(config: PavilionConfig, openings: OpeningPlacement[]): PavilionConfig {
  const doors = openings.filter((o) => o.kind.startsWith('door-'))
  const fixes = openings.filter((o) => o.kind === 'fixed-glass')
  const alu = openings.filter((o) => o.kind === 'alu-window')
  const pvc = openings.filter((o) => o.kind === 'pvc-window')
  return {
    ...config,
    aluDoorCount: doors.length,
    fixedGlazingCount: fixes.length,
    aluWindowCount: alu.length,
    pvcWindowCount: pvc.length,
    rollers: openings.some((o) => o.roller),
    rollerCount: openings.filter((o) => o.roller).length,
    ...(doors[0] ? { aluDoorWidth: doors[0].width, aluDoorHeight: doors[0].height } : {}),
    ...(fixes[0] ? { fixedGlazingWidth: fixes[0].width, fixedGlazingHeight: fixes[0].height } : {}),
    ...(alu[0] ? { aluWindowWidth: alu[0].width, aluWindowHeight: alu[0].height } : {}),
    ...(pvc[0] ? { pvcWindowWidth: pvc[0].width, pvcWindowHeight: pvc[0].height } : {}),
  }
}

/** Zapis nowej listy stolarki do konfiguracji (z zachowaniem dekorów i elewacji projektu). */
export function withOpenings(config: PavilionConfig, openings: OpeningPlacement[]): PavilionConfig {
  const geometry = editableGeometry(config)
  return syncOpeningCounts({ ...config, geometry: { ...geometry, openings } }, openings)
}

export function wallSpan(config: PavilionConfig, wall: WallSide) {
  return wall === 'front' || wall === 'back' ? config.length : config.width
}

export const OPENING_KIND_LABELS: Record<OpeningKind, string> = {
  'door-glazed': 'Drzwi ALU przeszklone',
  'door-full': 'Drzwi pełne',
  'door-double': 'Drzwi dwuskrzydłowe',
  'fixed-glass': 'Witryna FIX',
  'alu-window': 'Okno ALU',
  'pvc-window': 'Okno PVC',
}

export const OPENING_DEFAULTS: Record<OpeningKind, { width: number; height: number; sill: number }> = {
  'door-glazed': { width: 1.0, height: 2.1, sill: 0 },
  'door-full': { width: 0.9, height: 2.05, sill: 0 },
  'door-double': { width: 1.8, height: 2.1, sill: 0 },
  'fixed-glass': { width: 1.0, height: 2.0, sill: 0.08 },
  'alu-window': { width: 1.0, height: 1.2, sill: 0.9 },
  'pvc-window': { width: 0.6, height: 0.6, sill: 1.35 },
}

export const WALL_LABELS: Record<WallSide, string> = { front: 'Front', back: 'Tył', left: 'Lewa', right: 'Prawa' }

/** Wolne miejsce na ścianie dla nowego elementu (największa przerwa między istniejącymi otworami). */
export function freeSlot(config: PavilionConfig, openings: OpeningPlacement[], wall: WallSide, width: number) {
  const span = wallSpan(config, wall)
  const taken = openings
    .filter((o) => o.wall === wall)
    .map((o) => [o.center - o.width / 2, o.center + o.width / 2] as const)
    .sort((a, b) => a[0] - b[0])
  let cursor = -span / 2 + 0.15
  let best = { gap: -1, center: 0 }
  for (const [a, b] of [...taken, [span / 2 - 0.15, span / 2 - 0.15] as const]) {
    const gap = a - cursor
    if (gap > best.gap) best = { gap, center: cursor + gap / 2 }
    cursor = Math.max(cursor, b + 0.1)
  }
  return { fits: best.gap >= width, center: Number(best.center.toFixed(3)) }
}

export function nextOpeningId(openings: OpeningPlacement[], kind: OpeningKind) {
  const prefix = kind.startsWith('door-') ? 'D' : kind === 'fixed-glass' ? 'W' : kind === 'pvc-window' ? 'P' : 'O'
  let i = 1
  while (openings.some((o) => o.id === prefix + i)) i++
  return prefix + i
}
