import type { PavilionConfig } from '../types'

/**
 * Proof of concept E0 (renderer warstw) + E1 (stolarka z przekrojów): tylko preset galeria-163.
 * Pozostałe presety renderują się dotychczasową ścieżką (System1Body część-po-części + OpeningFrame).
 */
export const LAYER_POC_PROJECTS: ReadonlySet<string> = new Set(['GALERIA/163'])

export function isLayerPoc(config: Pick<PavilionConfig, 'project'>) {
  return LAYER_POC_PROJECTS.has(config.project)
}
