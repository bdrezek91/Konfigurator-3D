import type { PavilionConfig } from '../types'

/**
 * Proof of concept — nowe ścieżki tylko na wybranych presetach; pozostałe renderują się dotychczasowo.
 *  - E0 + E1 (renderer warstw + stolarka z przekrojów): galeria-163,
 *  - E2 (kaseton jako taca, renderer warstw elewacji): galeria-207 (wzorzec kasetonów Systemu A).
 */
export const LAYER_POC_PROJECTS: ReadonlySet<string> = new Set(['GALERIA/163'])
export const TRAY_POC_PROJECTS: ReadonlySet<string> = new Set(['GALERIA/207'])

export function isLayerPoc(config: Pick<PavilionConfig, 'project'>) {
  return LAYER_POC_PROJECTS.has(config.project)
}

export function isTrayPoc(config: Pick<PavilionConfig, 'project'>) {
  return TRAY_POC_PROJECTS.has(config.project)
}
