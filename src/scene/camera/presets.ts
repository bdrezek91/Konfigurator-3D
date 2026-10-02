import { PANEL_THICKNESS_M, type PavilionConfig } from '../../types'
import type { PavilionView } from './views'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

/**
 * Kadr galerii-03 wyznaczony fotogrametrycznie ze zdjęcia 03 (punkty zbiegu poziomu i pionu fasady):
 * ogniskowa ≈ 1221 px przy 1600×1200 → pionowe FOV ≈ 52°, aparat 0,72 m nad gruntem,
 * 3,6 m od lica fasady, przy lewym końcu pawilonu, patrzy wzdłuż fasady i lekko w górę.
 */
export const GALLERY03_PHOTO_POSE: CameraPose = {
  position: [-3.295, 0.715, 5.168],
  target: [-1.314, 1.255, 1.735],
  fov: 52.3,
}

export function cameraPose(config: PavilionConfig, view: PavilionView): CameraPose {
  if (config.project === 'GALERIA/03' && view === 'perspective') return GALLERY03_PHOTO_POSE

  const floorT = PANEL_THICKNESS_M[config.floorPanel]
  const roofT = PANEL_THICKNESS_M[config.roofPanel]
  const outerAvg = floorT + (config.frontHeight + config.backHeight) / 2 + roofT
  const targetY = Math.min(1.4, outerAvg * 0.47)
  const target: [number, number, number] = [0, targetY, 0]
  const fov = 34
  // Dopasowanie kadru: zakładamy ostrożnie proporcje widoku ~1,2:1 (panel boczny zabiera szerokość),
  // żeby pawilon zawsze mieścił się w kadrze z marginesem — zarówno w poziomie, jak i w pionie.
  const halfV = (fov / 2) * (Math.PI / 180)
  const halfH = Math.atan(Math.tan(halfV) * 1.2)
  const fit = (span: number) => Math.max(
    7,
    (span / 2 + 1.4) / Math.tan(halfH),
    (outerAvg / 2 + 0.9) / Math.tan(halfV),
  )
  const eye = 1.65

  switch (view) {
    case 'front':
      return { position: [0, eye, config.width / 2 + fit(config.length)], target, fov }
    case 'back':
      return { position: [0, eye, -config.width / 2 - fit(config.length)], target, fov }
    case 'left':
      return { position: [-config.length / 2 - fit(config.width + 2), eye, 0], target, fov }
    case 'right':
      return { position: [config.length / 2 + fit(config.width + 2), eye, 0], target, fov }
    case 'front-left': {
      const d = fit(config.length) * 0.92
      return { position: [-d * 0.5, eye, d * 0.86], target, fov }
    }
    case 'front-right': {
      const d = fit(config.length) * 0.92
      return { position: [d * 0.5, eye, d * 0.86], target, fov }
    }
    default: {
      // perspektywa 3/4: przekątna rzutu jako szerokość kadru
      const d = fit(Math.hypot(config.length, config.width) * 0.92)
      return { position: [d * 0.5, 1.8, d * 0.866], target, fov }
    }
  }
}
