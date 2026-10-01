import type { PavilionConfig, ValidationItem } from './types'
import { CONSTRUCTION_LABELS, PANEL_LABELS, PANEL_THICKNESS_M, SURFACE_PROFILE_LABELS } from './types'

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
  const floorT = PANEL_THICKNESS_M[c.floorPanel]
  const roofT = PANEL_THICKNESS_M[c.roofPanel]
  const outerFront = floorT + c.frontHeight + roofT
  const outerBack = floorT + c.backHeight + roofT
  const wallArea = (c.length + c.width) * (outerFront + outerBack)
  const floorArea = c.length * c.width
  const roofArea = c.length * Math.hypot(c.width, outerFront - outerBack)
  const roofModules1050 = Math.ceil(c.length / 1.05)
  const rows: BomRow[] = [
    { category: 'Konstrukcja', item: CONSTRUCTION_LABELS[c.construction], quantity: '1 kpl.', basis: 'dokładne' },
    { category: 'Ściany', item: PANEL_LABELS[c.wallPanel] + ' · ' + SURFACE_PROFILE_LABELS[c.wallProfile], quantity: wallArea.toFixed(1) + ' m² brutto', basis: 'szacunkowe' },
    { category: 'Dach', item: PANEL_LABELS[c.roofPanel] + ' · ' + SURFACE_PROFILE_LABELS[c.roofProfile], quantity: roofArea.toFixed(1) + ' m²', basis: 'szacunkowe' },
    { category: 'Dach', item: 'Moduły dachowe 1050 mm — orientacyjnie', quantity: roofModules1050 + ' szt.', basis: 'szacunkowe' },
    { category: 'Podłoga', item: PANEL_LABELS[c.floorPanel], quantity: floorArea.toFixed(1) + ' m²', basis: 'szacunkowe' },
    { category: 'Podłoga', item: 'MFP/OSB ' + c.mfpThickness + ' mm', quantity: floorArea.toFixed(1) + ' m²', basis: 'szacunkowe' },
  ]
  if (c.geometry) {
    const groups = new Map<string, { item: string; count: number }>()
    for (const opening of c.geometry.openings) {
      const type =
        opening.kind === 'fixed-glass' ? 'Szyba/FIX' :
        opening.kind === 'alu-window' ? 'Okno ALU' :
        opening.kind === 'pvc-window' ? 'Okno PVC' :
        opening.kind === 'door-double' ? 'Drzwi ALU podwójne' :
        opening.kind === 'door-full' ? 'Drzwi ALU pełne' : 'Drzwi ALU przeszklone'
      const item = type + ' ' + Math.round(opening.width * 100) + '×' + Math.round(opening.height * 100) + ' · ' + opening.wall
      const key = opening.kind + ':' + opening.wall + ':' + opening.width + ':' + opening.height
      const current = groups.get(key)
      if (current) current.count += 1
      else groups.set(key, { item, count: 1 })
    }
    for (const group of groups.values()) {
      rows.push({ category: 'Stolarka', item: group.item, quantity: group.count + ' szt.', basis: 'dokładne' })
    }
    const rollerCount = c.geometry.openings.filter((x) => x.roller).length
    if (rollerCount) rows.push({ category: 'Stolarka', item: 'Roleta elektryczna', quantity: rollerCount + ' szt.', basis: 'dokładne' })
  } else {
    if (c.aluDoorCount > 0) rows.push({ category: 'Stolarka', item: 'Drzwi ALU ' + Math.round(c.aluDoorWidth * 100) + '×' + Math.round(c.aluDoorHeight * 100), quantity: c.aluDoorCount + ' szt.', basis: 'dokładne' })
    if (c.fixedGlazingCount > 0) rows.push({ category: 'Stolarka', item: 'Szyba/FIX ' + Math.round(c.fixedGlazingWidth * 100) + '×' + Math.round(c.fixedGlazingHeight * 100), quantity: c.fixedGlazingCount + ' szt.', basis: 'dokładne' })
    if (c.aluWindowCount > 0) rows.push({ category: 'Stolarka', item: 'Okno ALU ' + Math.round(c.aluWindowWidth * 100) + '×' + Math.round(c.aluWindowHeight * 100), quantity: c.aluWindowCount + ' szt.', basis: 'dokładne' })
    if (c.pvcWindowCount > 0) rows.push({ category: 'Stolarka', item: 'Okno PVC ' + Math.round(c.pvcWindowWidth * 100) + '×' + Math.round(c.pvcWindowHeight * 100), quantity: c.pvcWindowCount + ' szt.', basis: 'dokładne' })
    if (c.rollers && c.rollerCount > 0) rows.push({ category: 'Stolarka', item: 'Roleta elektryczna', quantity: c.rollerCount + ' szt.', basis: 'dokładne' })
  }

  if (c.electrical !== 'none') {
    rows.push({ category: 'Elektryka', item: c.electrical === '3p400' ? 'Instalacja 3-fazowa 400 V' : 'Instalacja 1-fazowa 230 V', quantity: '1 kpl.', basis: 'dokładne' })
    if (c.doubleSockets) rows.push({ category: 'Elektryka', item: 'Gniazdo podwójne', quantity: c.doubleSockets + ' szt.', basis: 'dokładne' })
    if (c.singleSockets) rows.push({ category: 'Elektryka', item: 'Gniazdo pojedyncze', quantity: c.singleSockets + ' szt.', basis: 'dokładne' })
    if (c.ledCeiling) rows.push({ category: 'Elektryka', item: 'Lampa LED sufitowa', quantity: c.ledCeiling + ' szt.', basis: 'dokładne' })
    if (c.switches) rows.push({ category: 'Elektryka', item: 'Włącznik', quantity: c.switches + ' szt.', basis: 'dokładne' })
    if (c.externalLights) rows.push({ category: 'Elektryka', item: 'Lampa zewnętrzna', quantity: c.externalLights + ' szt.', basis: 'dokładne' })
    if (c.distributionBoard) rows.push({ category: 'Elektryka', item: 'Rozdzielnica', quantity: '1 szt.', basis: 'dokładne' })
    if (c.externalConnection) rows.push({ category: 'Elektryka', item: 'Przyłącze zewnętrzne', quantity: '1 szt.', basis: 'dokładne' })
    if (c.forceSocket) rows.push({ category: 'Elektryka', item: 'Gniazdo siłowe', quantity: '1 szt.', basis: 'dokładne' })
  }
  if (c.waterConnection) rows.push({ category: 'Hydraulika', item: 'Przyłącze wody', quantity: '1 szt.', basis: 'dokładne' })
  if (c.sewerConnection) rows.push({ category: 'Hydraulika', item: 'Odpływ / kanalizacja', quantity: '1 szt.', basis: 'dokładne' })
  if (c.kitchenWaterPoint) rows.push({ category: 'Hydraulika', item: 'Punkt wodny pod aneks', quantity: '1 szt.', basis: 'dokładne' })
  if (c.toiletCompact) rows.push({ category: 'Sanitariaty', item: 'WC kompakt', quantity: '1 szt.', basis: 'dokładne' })
  if (c.washbasin) rows.push({ category: 'Sanitariaty', item: 'Umywalka + szafka', quantity: '1 kpl.', basis: 'dokładne' })
  if (c.shower) rows.push({ category: 'Sanitariaty', item: 'Prysznic', quantity: '1 kpl.', basis: 'dokładne' })
  if (c.boilerLiters > 0) rows.push({ category: 'Sanitariaty', item: 'Bojler ' + c.boilerLiters + ' l', quantity: '1 szt.', basis: 'dokładne' })
  if (c.heater) rows.push({ category: 'Sanitariaty', item: 'Grzejnik', quantity: '1 szt.', basis: 'dokładne' })
  if (c.ventilationGrille) rows.push({ category: 'Wentylacja', item: 'Kratka wentylacyjna', quantity: '1 szt.', basis: 'dokładne' })

  if (c.kitchen) {
    rows.push({ category: 'Aneks', item: 'Aneks kuchenny', quantity: Math.round(c.kitchenLength * 100) + ' cm', basis: 'dokładne' })
    if (c.induction) rows.push({ category: 'Aneks', item: 'Płyta indukcyjna', quantity: '1 szt.', basis: 'dokładne' })
    if (c.fridge) rows.push({ category: 'Aneks', item: 'Lodówka', quantity: '1 szt.', basis: 'dokładne' })
  }

  if (c.airConditioning) rows.push({ category: 'HVAC', item: 'Klimatyzacja ' + c.hvacPower.toFixed(1) + ' kW ' + c.hvacColor, quantity: '1 kpl.', basis: 'dokładne' })
  if (c.partitionWall) rows.push({ category: 'Wnętrze', item: 'Ścianka działowa', quantity: '1 kpl.', basis: 'szacunkowe' })
  if (c.internalDoorCount > 0) rows.push({ category: 'Wnętrze', item: 'Drzwi wewnętrzne', quantity: c.internalDoorCount + ' szt.', basis: 'dokładne' })
  if (c.gutter) rows.push({ category: 'Dach', item: 'Rynna', quantity: '1 kpl.', basis: 'dokładne' })
  return rows
}
