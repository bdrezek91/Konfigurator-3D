import type { PavilionConfig, ValidationItem } from './types'
import { PANEL_THICKNESS_M } from './types'
import { buildComponentModel, groupComponentsForBom } from './components'

export type BomRow = {
  category: string
  item: string
  quantity: string
  basis: 'dokładne' | 'szacunkowe'
}

export function validateConfig(c: PavilionConfig): ValidationItem[] {
  const out: ValidationItem[] = []

  if (c.length < 4 || c.length > 12) out.push({ level: 'warning', message: 'Długość jest poza zakresem projektów referencyjnych 4–9 m.' })
  if (c.width < 2.5 || c.width > 4) out.push({ level: 'warning', message: 'Szerokość jest poza typowym zakresem pawilonów referencyjnych.' })
  if (c.frontHeight <= 2 || c.backHeight <= 2) out.push({ level: 'error', message: 'Wysokość pawilonu jest zbyt mała.' })
  if (c.roofSlope === 'back' && c.backHeight >= c.frontHeight) out.push({ level: 'warning', message: 'Spadek na tył wymaga niższej wysokości tylnej.' })
  if (c.roofSlope === 'front' && c.frontHeight >= c.backHeight) out.push({ level: 'warning', message: 'Spadek na front wymaga niższej wysokości frontowej.' })
  if (c.roofSlope === 'flat' && Math.abs(c.frontHeight - c.backHeight) > 0.02) out.push({ level: 'warning', message: 'Dach płaski powinien mieć zbliżoną wysokość front/tył.' })

  const electricalLoads = c.doubleSockets + c.singleSockets + c.ledCeiling + c.externalLights
  if (c.electrical === 'none' && electricalLoads > 0) out.push({ level: 'error', message: 'Wybrano osprzęt elektryczny przy ustawieniu „brak instalacji”.' })
  if (c.forceSocket && c.electrical !== '3p400') out.push({ level: 'error', message: 'Gniazdo siłowe wymaga instalacji 3-fazowej 400 V.' })
  if (c.airConditioning && c.hvacPower === 0) out.push({ level: 'error', message: 'Klimatyzacja jest włączona, ale nie wybrano mocy.' })
  if (!c.airConditioning && c.hvacPower !== 0) out.push({ level: 'warning', message: 'Wybrano moc klimatyzacji przy wyłączonej klimatyzacji.' })
  const hasWaterFixture = c.toiletCompact || c.washbasin || c.shower || c.kitchenWaterPoint || c.boilerLiters > 0
  if (hasWaterFixture && !c.waterConnection) out.push({ level: 'error', message: 'Wyposażenie wodne wymaga przyłącza wody.' })
  if ((c.toiletCompact || c.shower || c.washbasin) && !c.sewerConnection) out.push({ level: 'error', message: 'Sanitariaty wymagają odpływu/kanalizacji.' })
  if (c.bathroom && !c.partitionWall) out.push({ level: 'warning', message: 'Łazienka/WC zwykle wymaga ścianki działowej.' })
  if (c.shower && !c.bathroom) out.push({ level: 'warning', message: 'Prysznic wybrano bez aktywnej łazienki.' })
  if (c.kitchen && !c.kitchenWaterPoint) out.push({ level: 'warning', message: 'Aneks kuchenny bez punktu wodnego — sprawdź projekt.' })
  if (c.boilerLiters > 0 && !c.waterConnection) out.push({ level: 'error', message: 'Bojler wymaga zasilania wodą.' })

  const openingCount = c.aluDoorCount + c.fixedGlazingCount + c.aluWindowCount + c.pvcWindowCount
  if (c.rollers && c.rollerCount === 0) out.push({ level: 'warning', message: 'Rolety włączone, ale liczba rolet wynosi 0.' })
  if (c.rollerCount > openingCount) out.push({ level: 'warning', message: 'Liczba rolet jest większa niż liczba otworów/stolarki.' })
  if (c.aluDoorCount === 0 && c.fixedGlazingCount === 0 && c.aluWindowCount === 0 && c.pvcWindowCount === 0) {
    out.push({ level: 'warning', message: 'Pawilon nie ma żadnej stolarki zewnętrznej.' })
  }

  if (c.geometry) {
    const floorT = PANEL_THICKNESS_M[c.floorPanel]
    for (const opening of c.geometry.openings) {
      const span = opening.wall === 'front' || opening.wall === 'back' ? c.length : c.width
      const left = opening.center - opening.width / 2
      const right = opening.center + opening.width / 2
      if (left < -span / 2 + 0.08 || right > span / 2 - 0.08) {
        out.push({ level: 'error', message: 'Stolarka ' + opening.id + ' wychodzi poza obrys ściany ' + opening.wall + '.' })
      }
      const sill = opening.sill ?? (opening.kind.startsWith('door-') ? 0 : 0.08)
      const available = floorT + Math.min(c.frontHeight, c.backHeight) + PANEL_THICKNESS_M[c.roofPanel]
      if (floorT + sill + opening.height > available - 0.08) {
        out.push({ level: 'warning', message: 'Stolarka ' + opening.id + ' jest bardzo blisko górnej krawędzi ściany.' })
      }
    }
  }

  if (c.roofProfile !== 'trapezoid') {
    out.push({ level: 'warning', message: 'Dach ustawiono bez typowej zewnętrznej profilacji trapezowej T.' })
  }

  if (out.length === 0) out.push({ level: 'ok', message: 'Brak oczywistych konfliktów w konfiguracji.' })
  else if (!out.some((item) => item.level === 'error')) out.unshift({ level: 'ok', message: 'Konfiguracja nie zawiera błędów blokujących.' })
  return out
}

export function buildBom(c: PavilionConfig): BomRow[] {
  const model = buildComponentModel(c)
  return groupComponentsForBom(model).map((row) => ({
    category: row.category,
    item: row.name + ' · ' + row.material + ' · ' + row.dimensions + (row.massKg > 0 ? ' · ' + row.massKg.toFixed(2) + ' kg' : ''),
    quantity: row.quantity + ' szt.',
    basis: row.basis,
  }))
}
