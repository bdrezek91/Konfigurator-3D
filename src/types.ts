export type PanelType = 'PIR100' | 'PIR120' | 'PIR160' | 'EPS100'
export type ConstructionType = 'angle50' | 'full100' | 'static100' | 'truss'
export type SurfaceProfile = 'smooth' | 'ribbed'
export type RoofSlope = 'back' | 'front' | 'flat'
export type FacadeStyle =
  | 'plain'
  | 'cassette-graphite'
  | 'cassette-black'
  | 'lamella-winchester'
  | 'lamella-black'
  | 'cassette-lamella'
  | 'silver-rectangle'
export type GlazingType = 'double' | 'triple'
export type ElectricalType = '1p230' | '3p400' | 'none'
export type InteriorFinish = 'white' | 'concrete' | 'black' | 'oak' | 'walnut'
export type FloorFinish = 'wood' | 'concrete' | 'other'
export type HvacColor = 'white' | 'graphite' | 'black'
export type PavilionConfig = {
  project: string
  length: number
  width: number
  frontHeight: number
  backHeight: number
  roofSlope: RoofSlope
  wallPanel: PanelType
  roofPanel: PanelType
  floorPanel: PanelType
  wallProfile: SurfaceProfile
  roofProfile: SurfaceProfile
  interiorFinish: InteriorFinish
  floorFinish: FloorFinish
  mfpThickness: 12 | 24
  construction: ConstructionType
  exteriorColor: string
  flashingColor: string
  facade: FacadeStyle
  facadeFront: boolean
  facadeLeft: boolean
  facadeRight: boolean
  facadeBack: boolean
  glazing: GlazingType
  aluDoorCount: number
  aluDoorWidth: number
  aluDoorHeight: number
  fixedGlazingCount: number
  fixedGlazingWidth: number
  fixedGlazingHeight: number
  aluWindowCount: number
  aluWindowWidth: number
  aluWindowHeight: number
  pvcWindowCount: number
  pvcWindowWidth: number
  pvcWindowHeight: number
  rollers: boolean
  rollerCount: number
  electrical: ElectricalType
  doubleSockets: number
  singleSockets: number
  ledCeiling: number
  switches: number
  distributionBoard: boolean
  externalConnection: boolean
  externalLights: number
  forceSocket: boolean
  waterConnection: boolean
  sewerConnection: boolean
  kitchenWaterPoint: boolean
  bathroom: boolean
  toiletCompact: boolean
  washbasin: boolean
  shower: boolean
  boilerLiters: 0 | 30 | 50
  heater: boolean
  ventilationGrille: boolean
  kitchen: boolean
  kitchenLength: number
  induction: boolean
  fridge: boolean
  internalDoorCount: number
  partitionWall: boolean
  airConditioning: boolean
  hvacPower: 0 | 3.4 | 3.5 | 4.6 | 5.3
  hvacColor: HvacColor
  gutter: boolean
  attic: boolean
  showStructure: boolean
  showInterior: boolean
}

export type ValidationItem = {
  level: 'ok' | 'warning' | 'error'
  message: string
}
export const DEFAULT_CONFIG: PavilionConfig = {
  project: 'Własna konfiguracja',
  length: 6.03,
  width: 2.96,
  frontHeight: 2.62,
  backHeight: 2.52,
  roofSlope: 'back',
  wallPanel: 'PIR100',
  roofPanel: 'PIR100',
  floorPanel: 'PIR100',
  wallProfile: 'smooth',
  roofProfile: 'smooth',
  interiorFinish: 'white',
  floorFinish: 'wood',
  mfpThickness: 12,
  construction: 'angle50',
  exteriorColor: '#3a3f43',
  flashingColor: '#3a3f43',
  facade: 'cassette-lamella',
  facadeFront: true,
  facadeLeft: false,
  facadeRight: false,
  facadeBack: false,
  glazing: 'double',
  aluDoorCount: 1,
  aluDoorWidth: 1.08,
  aluDoorHeight: 2.10,
  fixedGlazingCount: 2,
  fixedGlazingWidth: 0.97,
  fixedGlazingHeight: 2.00,
  aluWindowCount: 0,
  aluWindowWidth: 0.97,
  aluWindowHeight: 2.10,
  pvcWindowCount: 1,
  pvcWindowWidth: 0.50,
  pvcWindowHeight: 0.50,
  rollers: false,
  rollerCount: 0,
  electrical: '1p230',
  doubleSockets: 2,
  singleSockets: 1,
  ledCeiling: 3,
  switches: 2,
  distributionBoard: true,
  externalConnection: true,
  externalLights: 2,
  forceSocket: false,
  waterConnection: false,
  sewerConnection: false,
  kitchenWaterPoint: false,
  bathroom: false,
  toiletCompact: false,
  washbasin: false,
  shower: false,
  boilerLiters: 0,
  heater: false,
  ventilationGrille: false,
  kitchen: false,
  kitchenLength: 1.20,
  induction: false,
  fridge: false,
  internalDoorCount: 0,
  partitionWall: false,
  airConditioning: false,
  hvacPower: 0,
  hvacColor: 'white',
  gutter: false,
  attic: false,
  showStructure: true,
  showInterior: false,
}

export const RAL_COLORS = [
  { name: 'RAL 7016 — grafit/antracyt', value: '#3a3f43' },
  { name: 'Czarny mat', value: '#121315' },
  { name: 'RAL 9010 — biały', value: '#f2f0e7' },
  { name: 'RAL 9006 — aluminium', value: '#a5a5a3' },
  { name: 'RAL 9007 — szary aluminium', value: '#7d7d7a' },
]

export const PANEL_LABELS: Record<PanelType, string> = {
  PIR100: 'PIR 100 mm',
  PIR120: 'PIR 120 mm',
  PIR160: 'PIR 160 mm',
  EPS100: 'Styropian 100 mm',
}

export const CONSTRUCTION_LABELS: Record<ConstructionType, string> = {
  angle50: 'Kątownik 50×50×4',
  full100: 'Pełna 100×100×3',
  static100: 'Statyka 100×100',
  truss: 'Kratownica',
}
