import { m, PHYS } from '../physical/spec'
import { ROOF_TRAPEZOIDS } from '../scene/materials/profiles'
import { PANEL_THICKNESS_M, type PavilionConfig } from '../types'

/**
 * Wymiary ramy wspólne dla renderu, BOM i kamery.
 * System 1 (kątownik 50×50×4): obrys config.length × config.width to zewnętrzny wymiar ramy stalowej;
 * lico ściany leży 4 mm (grubość kątownika) za obrysem, podłoga na ramieniu kątownika, górna rama nad dachem.
 * Pozostałe konstrukcje (100×100, statyka, kratownica) — dotychczasowy model uproszczony (ściana w osi obrysu).
 */
export function frameDims(c: PavilionConfig) {
  const system1 = c.construction === 'angle50'
  const t = system1 ? m(PHYS.system1.angleThickness) : 0
  const a = system1 ? m(PHYS.system1.angleLeg) : 0
  const tw = PANEL_THICKNESS_M[c.wallPanel]
  return {
    system1,
    /** grubość kątownika (spód podłogi nad spodem ramy, lico ściany za obrysem) */
    t,
    /** wysokość górnej ramy nad dachem */
    topFrame: a,
    /** górna rama leży na wierzchu żeber trapezu (dach trapezowy) — o tyle wyżej niż płaska blacha płyty */
    roofRib: system1 && c.roofProfile === 'trapezoid' ? ROOF_TRAPEZOIDS[c.panelManufacturer].heightMm / 1000 : 0,
    /** odległość osi ściany od obrysu (do środka) */
    wallCenterInset: system1 ? t + tw / 2 : 0,
    /** odległość lica zewnętrznego ściany od obrysu: dodatnia = do środka */
    wallFaceInset: system1 ? t : -tw / 2,
  }
}

/**
 * Pole ściany na okładzinę (lamele, deska, ornament) — System 1. Układ jak okładziny: y od spodu ramy, x od środka ściany.
 * Okładzina siedzi między obróbkami: nad cokołem (lico + kołnierz), pod koroną, między obróbkami narożnymi 25 cm.
 * Zwraca null dla konstrukcji innych niż System 1 (bez obróbek modelowanych z produkcji).
 */
export function wallField(c: PavilionConfig) {
  const fr = frameDims(c)
  if (!fr.system1) return null
  const tr = PANEL_THICKNESS_M[c.roofPanel]
  const tf = PANEL_THICKNESS_M[c.floorPanel]
  const crownFace = Math.max(m(PHYS.system1.crownFlashingFace), fr.topFrame + fr.roofRib + tr + 0.015)
  const outer = (h: number) => fr.t + tf + h + tr + fr.roofRib + fr.topFrame
  const clear = 0.005
  return {
    bottom: m(PHYS.system1.baseFlashingFace) + m(PHYS.system1.baseFlashingFlange) + clear,
    topFront: outer(c.frontHeight) - crownFace - clear,
    topBack: outer(c.backHeight) - crownFace - clear,
    corner: m(PHYS.system1.cornerFlashingFront) + clear,
  }
}
