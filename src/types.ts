export type PanelType = 'PIR100' | 'PIR120' | 'PIR160' | 'EPS100'
export type PanelManufacturer = 'paneltech' | 'balex' | 'generic'
export type ConstructionType = 'angle50' | 'full100' | 'static100' | 'truss'
export type SurfaceProfile = 'smooth' | 'linear' | 'microline' | 'microrib' | 'microwave' | 'carbon' | 'ribbed' | 'trapezoid'
export type RoofSlope = 'back' | 'front' | 'flat'
export type FacadeStyle =
  | 'plain'
  | 'cassette-graphite'
  | 'cassette-black'
  | 'lamella-winchester'
  | 'lamella-black'
  | 'lamella-diagonal-winchester'
  | 'cassette-lamella'
  | 'silver-rectangle'
  | 'cassette-horizontal'
  | 'cassette-blocks'
  | 'cassette-grid'
  | 'vertical-ribbed'
  | 'wood-horizontal'
  | 'ornament-panel'
export type GlazingType = 'double' | 'triple'
export type ElectricalType = '1p230' | '3p400' | 'none'
export type InteriorFinish = 'white' | 'concrete' | 'black' | 'oak' | 'walnut'
export type FloorFinish = 'wood' | 'concrete' | 'other'
export type HvacColor = 'white' | 'graphite' | 'black'
export type WallSide = 'front' | 'back' | 'left' | 'right'
export type FacadeCladdingKind = 'cassette-horizontal' | 'cassette-grid' | 'vertical-ribbed' | 'none'
export type FacadeCladdingSpec = {
  kind: FacadeCladdingKind
  color?: string
  gap?: number
  bandHeight?: number
  moduleWidth?: number
  moduleHeight?: number
  staggered?: boolean
  /** Wysokość rzędu attyki [m] (2 rzędy). Domyślnie 0,315. */
  atticRowHeight?: number
  /** System kasetonów: A — poziome pasy + attyka 2 rzędy (zdjęcia 207/110/11/12), B — duże bloki + attyka 1 rząd (zdjęcie 13). */
  cassetteSystem?: 'A' | 'B'
  /** Daszki nad grupami przeszkleń stałych (System B — zdjęcie 13). */
  canopy?: boolean
}
/**
 * Ręczne dopasowanie układu kasetonów (System A / B). Fuga pionowa zapisana jako przesunięcie z położenia automatycznego
 * (`from`) — po zmianie otworów / wymiarów, gdy fugi już nie ma w tym miejscu, edycja jest pomijana (układ automatyczny).
 */
export type CassetteEdits = {
  joints?: Array<{ wall: WallSide; row: 'body' | 'attic'; from: number; to: number }>
  /** wysokość pasa korpusu [m] — wspólny rytm wszystkich ścian */
  bandPitch?: number
  /** początek attyki nad spodem ramy [m] — wspólny dla wszystkich ścian */
  atticStart?: number
}
export type OpeningKind = 'door-glazed' | 'door-full' | 'door-double' | 'fixed-glass' | 'alu-window' | 'pvc-window'
export type DecorKind =
  | 'cassette-square-graphite'
  | 'cassette-rect-graphite'
  | 'cassette-black'
  | 'cassette-white'
  | 'cassette-winchester'
  | 'snake-winchester'
  | 'lamella-winchester'
  | 'lamella-graphite'
  | 'lamella-black'
  | 'lamella-palisander'
  | 'board-natural'
  | 'silver-rect'
  | 'steel-plate'
  | 'led-strip'
  | 'lamella-diagonal-winchester'
  | 'board-horizontal-winchester'
  | 'ornament-panel'

export type OpeningPlacement = {
  id: string
  wall: WallSide
  center: number
  width: number
  height: number
  sill?: number
  kind: OpeningKind
  glazing?: GlazingType
  frameColor?: string
  roller?: boolean
  label?: string
  sourceAccuracy?: 'dimensioned' | 'drawing-estimate'
  /** Strona zawiasów (patrząc z zewnątrz). Domyślnie: lewa. */
  hinge?: OpeningHinge
  /** Rodzaj pochwytu / klamki. Domyślnie: pochwyt dla drzwi przeszklonych, klamka dla pełnych. */
  handle?: OpeningHandle
  /** System profili — wpływa na szerokość widocznej ramy. */
  profile?: OpeningProfile
}

export type OpeningHinge = 'left' | 'right'
export type OpeningHandle = 'bar' | 'lever' | 'none'
export type OpeningProfile = 'alu-slim' | 'alu-standard' | 'pvc'

export type DecorPlacement = {
  id: string
  wall: WallSide
  center: number
  width: number
  yCenter: number
  height: number
  kind: DecorKind
  shape?: 'rect' | 'wedge-left' | 'wedge-right'
  sourceAccuracy?: 'dimensioned' | 'drawing-estimate'
}

export type LightPlacement = {
  wall: WallSide
  center: number
  y: number
}

export type ProjectGeometry = {
  externalHeight: number
  facadeCladding?: Partial<Record<WallSide, FacadeCladdingSpec>>
  foundationGap?: number
  roofEdgeFlashing?: boolean
  openings: OpeningPlacement[]
  decor: DecorPlacement[]
  exteriorLights?: LightPlacement[]
  notes?: string[]
}

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
  panelManufacturer: PanelManufacturer
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
  /** Wysokość pasa kasetonu poziomego / wysokość modułu siatki [m]. Domyślnie 0,30 (poziome) / 0,65 (siatka). */
  facadeBandHeight?: number
  /** Szerokość fugi między kasetonami [m]. Domyślnie 0,020 (produkcja Dampol). */
  facadeGap?: number
  /** Ręczne dopasowanie kasetonów (przeciąganie fug i pól w widoku 3D) — tylko „Własna konfiguracja”. */
  cassetteEdits?: CassetteEdits
  showStructure: boolean
  showInterior: boolean
  geometry?: ProjectGeometry
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
  panelManufacturer: 'paneltech',
  wallProfile: 'smooth',
  roofProfile: 'trapezoid',
  interiorFinish: 'white',
  floorFinish: 'wood',
  mfpThickness: 12,
  construction: 'angle50',
  exteriorColor: '#383e42',
  flashingColor: '#383e42',
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
  showStructure: false,
  showInterior: false,
}

export const RAL_COLORS = [
  { name: 'RAL 7016 — grafit/antracyt', value: '#383e42' },
  { name: 'RAL 9005 — czarny mat (płyty gładkie)', value: '#0e0e10' },
  { name: 'RAL 9010 — biały', value: '#f1ece1' },
  { name: 'RAL 9006 — aluminium', value: '#a5a5a3' },
  { name: 'RAL 9007 — szary aluminium', value: '#7d7d7a' },
]

export const PANEL_MANUFACTURER_LABELS: Record<PanelManufacturer, string> = {
  paneltech: 'Paneltech',
  balex: 'Balex Metal',
  generic: 'Inny / ogólny',
}

export const PANEL_LABELS: Record<PanelType, string> = {
  PIR100: 'PIR 100 mm',
  PIR120: 'PIR 120 mm',
  PIR160: 'PIR 160 mm',
  EPS100: 'Styropian 100 mm',
}

export const PANEL_THICKNESS_M: Record<PanelType, number> = {
  PIR100: 0.10,
  PIR120: 0.12,
  PIR160: 0.16,
  EPS100: 0.10,
}

export const SURFACE_PROFILE_LABELS: Record<SurfaceProfile, string> = {
  smooth: 'Gładka (G/F)',
  linear: 'Liniowanie (L)',
  microline: 'Mikrolinia (ML)',
  microrib: 'Mikrorowek (MR)',
  microwave: 'Mikrofala (MF)',
  carbon: 'Carbon (C)',
  ribbed: 'Głębokie liniowanie',
  trapezoid: 'Trapez dachowy (T)',
}

export const CONSTRUCTION_LABELS: Record<ConstructionType, string> = {
  angle50: 'Kątownik 50×50×4',
  full100: 'Pełna 100×100×3',
  static100: 'Statyka 100×100',
  truss: 'Kratownica',
}
