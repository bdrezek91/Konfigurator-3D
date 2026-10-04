import type { PavilionConfig } from '../../types'
import { envelope } from '../geometry'
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

  // wysokość z rzeczywistej bryły (podłoga na kątowniku, dach, górna rama) — nie z samych wysokości w świetle
  const env = envelope(config)
  const outerAvg = (env.outerFront + env.outerBack) / 2
  const targetY = Math.min(1.4, outerAvg * 0.47)
  const target: [number, number, number] = [0, targetY, 0]
  // ogniskowa ~ standardowa (35 mm KB ≈ 38° w pionie przy 3:2): bez szerokokątnego zniekształcenia proporcji
  const fov = 36
  // Dopasowanie kadru: zakładamy ostrożnie proporcje widoku ~1,2:1 (panel boczny zabiera szerokość);
  // margines 0,7 m — pawilon wypełnia kadr jak na zdjęciach realizacji (galeria: ~65–75% szerokości kadru)
  const halfV = (fov / 2) * (Math.PI / 180)
  const halfH = Math.atan(Math.tan(halfV) * 1.2)
  const fit = (span: number) => Math.max(
    6,
    (span / 2 + 0.7) / Math.tan(halfH),
    (outerAvg / 2 + 0.7) / Math.tan(halfV),
  )
  // aparat na wysokości oczu (zdjęcia realizacji robione z ręki: ~1,5–1,7 m)
  const eye = 1.6

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
    case 'rear': {
      // tył 3/4 (od tylnego lewego narożnika)
      const d = fit(Math.hypot(config.length, config.width) * 0.92)
      return { position: [-d * 0.5, eye, -d * 0.866], target, fov }
    }
    case 'top': {
      // widok z góry (aksonometryczny, techniczny): dach, górna rama, ucha
      const d = fit(Math.hypot(config.length, config.width)) * 1.15
      return { position: [d * 0.3, d * 0.9, d * 0.55], target: [0, outerAvg * 0.5, 0], fov }
    }
    default: {
      // perspektywa 3/4: przekątna rzutu jako szerokość kadru
      const d = fit(Math.hypot(config.length, config.width) * 0.92)
      return { position: [d * 0.5, eye, d * 0.866], target, fov }
    }
  }
}
