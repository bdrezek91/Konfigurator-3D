import { DEFAULT_CONFIG, type PavilionConfig } from './types'
import { PROJECT_GEOMETRIES } from './projectGeometries'

export type PavilionPreset = {
  id: string
  label: string
  source: string
  notes: string
  config: PavilionConfig
}

const p = (project: string, overrides: Partial<PavilionConfig>): PavilionConfig => {
  const geometry = PROJECT_GEOMETRIES[project]
  const config: PavilionConfig = {
    ...DEFAULT_CONFIG,
    project,
    geometry,
    ...overrides,
  }
  if (geometry) {
    config.aluDoorCount = geometry.openings.filter((x) => x.kind.startsWith('door-')).length
    config.fixedGlazingCount = geometry.openings.filter((x) => x.kind === 'fixed-glass').length
    config.aluWindowCount = geometry.openings.filter((x) => x.kind === 'alu-window').length
    config.pvcWindowCount = geometry.openings.filter((x) => x.kind === 'pvc-window').length
    config.rollers = geometry.openings.some((x) => x.roller)
    config.rollerCount = geometry.openings.filter((x) => x.roller).length
  }
  return config
}

export const PRESETS: PavilionPreset[] = [
  {
    id: 'galeria-03',
    label: 'galeria-03 · zdjęcie 03 · wzorzec 1:1',
    source: 'reference/gallery/03-front-kasetony-poziome-zblizenie.jpg',
    notes: 'Wzorzec kalibracyjny: najpierw dopasowujemy ten pawilon 1:1 do zdjęcia 03. Pomiary z POMIARY.md.',
    config: p('GALERIA/03', {
      length: 6.67, width: 2.96,
      frontHeight: 2.62, backHeight: 2.62, roofSlope: 'flat',
      construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'smooth',
      interiorFinish: 'white', floorFinish: 'wood',
      facade: 'cassette-horizontal',
      facadeFront: true, facadeLeft: false, facadeRight: false, facadeBack: false,
      exteriorColor: '#383E42', flashingColor: '#383E42',
      glazing: 'double',
      electrical: 'none', doubleSockets: 0, singleSockets: 0, ledCeiling: 0, switches: 0,
      distributionBoard: false, externalConnection: false, externalLights: 0,
      bathroom: false, toiletCompact: false, washbasin: false, shower: false,
      boilerLiters: 0, heater: false, partitionWall: false, internalDoorCount: 0,
      kitchen: false, kitchenWaterPoint: false,
      airConditioning: false, hvacPower: 0, gutter: false, attic: true,
      showStructure: false, showInterior: false,
    }),
  },
  {
    id: '722-08-26',
    label: '722/08/26 · 6×3 · Ostrzeszów',
    source: 'projekt 722/08/26',
    notes: 'PIR100, kątownik, kaseton grafit + Winchester, łazienka, aneks, rolety, klima.',
    config: p('722/08/26', {
      length: 6.03, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      facade: 'cassette-lamella',
      electrical: '1p230', doubleSockets: 4, singleSockets: 2, ledCeiling: 3, switches: 2,
      distributionBoard: true, externalConnection: true, externalLights: 2,
      bathroom: true, toiletCompact: true, washbasin: true, shower: true,
      boilerLiters: 50, heater: true, waterConnection: true, sewerConnection: true,
      partitionWall: true, internalDoorCount: 1,
      kitchen: true, kitchenLength: 1.20, kitchenWaterPoint: true,
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '81-08-26',
    label: '81/08/26 · 9×3 · Darek',
    source: 'projekt 81/08/26',
    notes: 'PIR100, pełna konstrukcja 100×100, lamele Winchester, bez elektryki.',
    config: p('81/08/26', {
      length: 9.03, width: 2.96, construction: 'full100',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      facade: 'lamella-winchester', facadeFront: true, facadeLeft: true, facadeRight: true,
      glazing: 'double',
      electrical: 'none', doubleSockets: 0, singleSockets: 0, ledCeiling: 0, switches: 0,
      distributionBoard: false, externalConnection: false, externalLights: 0,
      airConditioning: false, hvacPower: 0,
    }),
  },
  {
    id: '24-08-26',
    label: '24/08/26 · 8×3 · Jacek · II gat.',
    source: 'projekt 24/08/26',
    notes: 'Styropian ściana/dach, PIR100 podłoga, łazienka, aneks, klima 3.4.',
    config: p('24/08/26', {
      length: 8.03, width: 2.96, wallPanel: 'EPS100', roofPanel: 'EPS100',
      floorPanel: 'PIR100', construction: 'angle50',
      wallProfile: 'ribbed', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      facade: 'cassette-lamella', exteriorColor: '#383e42',
      electrical: '1p230', distributionBoard: true, externalConnection: true,
      bathroom: true, toiletCompact: true, washbasin: true, shower: true,
      boilerLiters: 50, heater: false, waterConnection: true, sewerConnection: true,
      partitionWall: true, internalDoorCount: 1,
      kitchen: true, kitchenLength: 1.20, kitchenWaterPoint: true,
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '120-08-26',
    label: '120/08/26 · 6×3 · D1 B2B',
    source: 'projekt 120/08/26',
    notes: 'PIR100, kaseton kwadrat antracyt + Winchester, zestaw ALU 305×210, klima 3.4.',
    config: p('120/08/26', {
      length: 6.03, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      facade: 'cassette-lamella', exteriorColor: '#383e42',
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
      electrical: '1p230', ledCeiling: 2, doubleSockets: 2, singleSockets: 1,
      switches: 1, distributionBoard: true, externalConnection: true,
    }),
  },
  {
    id: '82-08-26',
    label: '82/08/26 · 4×3 · Karolina',
    source: 'projekt 82/08/26',
    notes: 'Styropian ściany/dach, PIR100 podłoga, grafit + Winchester, 2 witryny, klima.',
    config: p('82/08/26', {
      length: 4.03, width: 2.96, wallPanel: 'EPS100', roofPanel: 'EPS100',
      floorPanel: 'PIR100', construction: 'angle50',
      wallProfile: 'ribbed', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'concrete',
      facade: 'cassette-lamella', exteriorColor: '#383e42',
      electrical: '1p230', doubleSockets: 1, singleSockets: 0, ledCeiling: 1, switches: 1,
      distributionBoard: true, externalConnection: true,
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '09-09-26',
    label: '09/09/26 · 8×3 · Paulina',
    source: 'projekt 09/09/26',
    notes: 'PIR100, czarny mat, brak klimy, drzwi ALU na ścianie bocznej.',
    config: p('09/09/26', {
      length: 8.03, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      exteriorColor: '#0e0e10', flashingColor: '#0e0e10', facade: 'plain',
      electrical: '1p230', doubleSockets: 3, singleSockets: 0, ledCeiling: 3, switches: 1,
      distributionBoard: true, externalConnection: true, externalLights: 0,
      airConditioning: false, hvacPower: 0,
    }),
  },
  {
    id: '13-08-26',
    label: '13/08/26 · 9×3 · Monika',
    source: 'projekt 13/08/26',
    notes: 'PIR100, czarny, Winchester na froncie/boku, łazienka, aneks LUX, 2 rolety, 2 klimy.',
    config: p('13/08/26', {
      length: 9.03, width: 2.96, exteriorColor: '#0e0e10', flashingColor: '#0e0e10',
      construction: 'angle50', wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', floorFinish: 'wood',
      facade: 'cassette-lamella', facadeLeft: true,
      electrical: '3p400', doubleSockets: 6, singleSockets: 2, ledCeiling: 4, switches: 4,
      distributionBoard: true, externalConnection: true, externalLights: 3,
      bathroom: true, toiletCompact: true, washbasin: true, shower: true,
      boilerLiters: 50, heater: true, waterConnection: true, sewerConnection: true,
      partitionWall: true, internalDoorCount: 2,
      kitchen: true, kitchenLength: 1.55, induction: false, fridge: true, kitchenWaterPoint: true,
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '94-08-26',
    label: '94/08/26 · 7×3 · Karolina',
    source: 'projekt 94/08/26',
    notes: 'PIR100, kaseton grafit + srebrny narożny, WC, aneks 144, rolety, klima.',
    config: p('94/08/26', {
      length: 7.03, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      exteriorColor: '#383e42', facade: 'cassette-graphite',
      electrical: '1p230', distributionBoard: true, externalConnection: true,
      bathroom: true, toiletCompact: true, washbasin: true,
      waterConnection: true, sewerConnection: true, partitionWall: true, internalDoorCount: 1,
      kitchen: true, kitchenLength: 1.44, kitchenWaterPoint: true,
      ventilationGrille: true, airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '120-07-26',
    label: '120/07/26 · 6×3 · Patrycja',
    source: 'projekt 120/07/26',
    notes: 'PIR100, kaseton Winchester/grafit, 2 witryny 97×200, drzwi 108×210, okno PVC.',
    config: p('120/07/26', {
      length: 6.01, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      exteriorColor: '#383e42', facade: 'cassette-lamella',
      electrical: '1p230', doubleSockets: 4, singleSockets: 0, ledCeiling: 2, switches: 1,
      distributionBoard: true, externalConnection: true, externalLights: 2,
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '49-08-26',
    label: '49/08/26 · 9×3 · Karolina · Anglia',
    source: 'projekt 49/08/26',
    notes: 'EPS100 ściany/dach, PIR100 podłoga, 500×210 front ALU, 200×210 bok, 3 LED zewn.',
    config: p('49/08/26', {
      length: 9.03, width: 2.96, wallPanel: 'EPS100', roofPanel: 'EPS100',
      floorPanel: 'PIR100', construction: 'angle50', exteriorColor: '#383e42',
      wallProfile: 'ribbed', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      facade: 'cassette-lamella', glazing: 'double',
      electrical: '1p230', doubleSockets: 3, singleSockets: 0, ledCeiling: 3, switches: 1,
      distributionBoard: true, externalConnection: true, externalLights: 3,
      airConditioning: true, hvacPower: 3.4, hvacColor: 'white',
    }),
  },
  {
    id: '114-08-26',
    label: '114/08/26 · 7×3 · Iza · leasing',
    source: 'projekt 114/08/26',
    notes: 'PIR100, czarne wnętrze/obróbki, Winchester front, WC, aneks, klima grafit 3.5.',
    config: p('114/08/26', {
      length: 7.03, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'concrete', floorFinish: 'concrete',
      exteriorColor: '#0e0e10', flashingColor: '#0e0e10', facade: 'lamella-winchester',
      electrical: '1p230', doubleSockets: 2, singleSockets: 2, ledCeiling: 3, switches: 2,
      distributionBoard: true, externalConnection: true,
      bathroom: true, toiletCompact: true, washbasin: true, shower: false,
      waterConnection: true, sewerConnection: true, partitionWall: true, internalDoorCount: 1,
      kitchen: true, kitchenLength: 1.20, kitchenWaterPoint: true,
      airConditioning: true, hvacPower: 3.5, hvacColor: 'graphite',
    }),
  },
  {
    id: '109-08-26',
    label: '109/08/26 · 6×3 · Tomek',
    source: 'projekt 109/08/26',
    notes: 'PIR100, kaseton grafit + WĄŻ Winchester, WC 120×120, bez klimy.',
    config: p('109/08/26', {
      length: 6.03, width: 2.96, construction: 'angle50',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      exteriorColor: '#383e42', facade: 'cassette-lamella',
      electrical: '1p230', doubleSockets: 2, singleSockets: 1, ledCeiling: 3, switches: 2,
      distributionBoard: true, externalConnection: true,
      bathroom: true, toiletCompact: true, washbasin: true, shower: false,
      waterConnection: true, sewerConnection: true, partitionWall: true,
      internalDoorCount: 1, kitchen: false, kitchenWaterPoint: true,
      airConditioning: false, hvacPower: 0,
    }),
  },
  {
    id: '28-03-26',
    label: '28/03/26 · 9×3 · Tomek',
    source: 'projekt 28/03/26',
    notes: 'PIR100, pełna 100×100, 9005 mat, kaseton + lamele czarne/palisander, klima 3.5.',
    config: p('28/03/26', {
      length: 9.03, width: 2.96, construction: 'full100',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'concrete', floorFinish: 'wood',
      exteriorColor: '#0e0e10', flashingColor: '#0e0e10',
      facade: 'cassette-lamella', facadeFront: true, facadeLeft: true,
      electrical: '1p230', doubleSockets: 4, singleSockets: 1,
      ledCeiling: 4, switches: 2, distributionBoard: true, externalConnection: true,
      externalLights: 4, airConditioning: true,
      hvacPower: 3.5, hvacColor: 'graphite',
    }),
  },
  {
    id: '104-01-26',
    label: '104/01/26 · 7×3 · Gosia',
    source: 'projekt 104/01/26',
    notes: 'PIR100, statyka, 3 szyby, kaseton czarny mat 4 strony, 400V, klima 3.4.',
    config: p('104/01/26', {
      length: 7.03, width: 2.96, construction: 'static100',
      wallPanel: 'PIR100', roofPanel: 'PIR100', floorPanel: 'PIR100',
      wallProfile: 'smooth', roofProfile: 'trapezoid', interiorFinish: 'white', floorFinish: 'wood',
      facade: 'cassette-black', facadeFront: true, facadeLeft: true,
      facadeRight: true, facadeBack: true, exteriorColor: '#0e0e10',
      flashingColor: '#0e0e10', glazing: 'triple',
      electrical: '3p400', doubleSockets: 10, singleSockets: 0, ledCeiling: 2,
      switches: 1, distributionBoard: true, externalConnection: true,
      externalLights: 2, airConditioning: true, hvacPower: 3.4,
      rollers: false, gutter: true,
    }),
  },
]
