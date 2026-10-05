import type { PavilionConfig } from '../types'

/**
 * Proof of concept — nowe ścieżki tylko na wybranych presetach; pozostałe renderują się dotychczasowo.
 *  - E0 + E1 (renderer warstw + stolarka z przekrojów): galeria-163,
 *  - E2 (kaseton jako taca, renderer warstw elewacji): galeria-207 (wzorzec kasetonów Systemu A),
 *  - E3 (światło i materiały): galeria-163.
 */
export const LAYER_POC_PROJECTS: ReadonlySet<string> = new Set(['GALERIA/163'])
export const TRAY_POC_PROJECTS: ReadonlySet<string> = new Set(['GALERIA/207'])
/** E3 (materiały + światło: HDRI z otoczeniem, słońce zgrane z mapą, tone mapping): galeria-163 (wzorzec zdjęcia 163). */
export const E3_POC_PROJECTS: ReadonlySet<string> = new Set(['GALERIA/163'])

export function isLayerPoc(config: Pick<PavilionConfig, 'project'>) {
  return LAYER_POC_PROJECTS.has(config.project)
}

export function isTrayPoc(config: Pick<PavilionConfig, 'project'>) {
  return TRAY_POC_PROJECTS.has(config.project)
}

/** `?e3=0` wyłącza E3 na presecie PoC (porównanie przed / po w jednym buildzie). */
export function isE3Poc(config: Pick<PavilionConfig, 'project'>) {
  const off = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e3') === '0'
  return !off && E3_POC_PROJECTS.has(config.project)
}
