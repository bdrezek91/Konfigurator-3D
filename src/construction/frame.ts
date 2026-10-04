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
