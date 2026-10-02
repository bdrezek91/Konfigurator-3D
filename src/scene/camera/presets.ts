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
 * aparat ok. 0,45 m nad gruntem. FOV 60° (pionowe, kadr 4:3) — skalibrowane porównaniem z renderem HQ
 * (szersze niż nominalne 55° dla 26 mm ekw.; zdjęcie z telefonu jest lekko kadrowane szerzej).
 */
export const GALLERY03_PHOTO_POSE: CameraPose = {
  position: [-2.8, 0.45, 4.83],
  target: [-1.0, 1.45, 1.48],
  fov: 60,
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
