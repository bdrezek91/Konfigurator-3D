import { PANEL_THICKNESS_M, type PavilionConfig } from '../../types'
import type { PavilionView } from './views'

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

/**
 * Kadr galerii-03 wyznaczony z perspektywy zdjęcia 03 (reference/gallery/POMIARY.md):
 * stosunek wysokości lewego i prawego końca ściany ≈ 2:1, pawilon wypełnia ~92% szerokości kadru,
 * obiektyw telefonu ≈ 26 mm ekw. (pionowe FOV ≈ 55° przy 4:3), aparat ok. 0,45 m nad gruntem.
 */
export const GALLERY03_PHOTO_POSE: CameraPose = {
  position: [-2.8, 0.45, 4.83],
  target: [-1.0, 1.45, 1.48],
  fov: 55,
}

export function cameraPose(config: PavilionConfig, view: PavilionView): CameraPose {
  if (config.project === 'GALERIA/03' && view === 'perspective') return GALLERY03_PHOTO_POSE

  const floorT = PANEL_THICKNESS_M[config.floorPanel]
  const roofT = PANEL_THICKNESS_M[config.roofPanel]
  const outerAvg = floorT + (config.frontHeight + config.backHeight) / 2 + roofT
  const targetY = Math.min(1.4, outerAvg * 0.47)
  const target: [number, number, number] = [0, targetY, 0]
  const fov = 34
  // dystans tak, by dłuższy gabaryt mieścił się w kadrze z zapasem
  const fit = (span: number) => Math.max(7.5, (span / 2 + 1.2) / Math.tan(((fov * 1.45) / 2) * (Math.PI / 180)))
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
      const d = fit(config.length) * 0.95
      return { position: [d * 0.52, 1.75, d * 0.88], target, fov }
    }
  }
}
