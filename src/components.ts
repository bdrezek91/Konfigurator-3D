import type {
  DecorPlacement,
  FacadeCladdingSpec,
  OpeningPlacement,
  PavilionConfig,
  ProjectGeometry,
  WallSide,
} from './types'
import { CONSTRUCTION_LABELS, PANEL_LABELS, PANEL_THICKNESS_M } from './types'
import { m, PHYS, RAL_7016_HEX } from './physical/spec'

export type ComponentCategory =
  | 'floor-frame'
  | 'structure'
  | 'corner-posts'
  | 'roof-beams'
  | 'floor-panels'
  | 'wall-panels'
  | 'roof-panels'
  | 'flashings'
  | 'joinery'
  | 'decor'
  | 'fasteners'
  | 'seals'
  | 'installations'
  | 'interior'

export type ComponentPrimitive =
  | 'beam'
  | 'panel'
  | 'roof-panel'
  | 'flashing'
  | 'joinery'
  | 'decor'
  | 'fastener'
  | 'seal'
  | 'installation'
  | 'interior'

export type Vec3 = [number, number, number]

export type ComponentDimensions = {
  lengthMm: number
  widthMm: number
  thicknessMm: number
  netAreaM2?: number
  developedWidthMm?: number
}

export type ComponentAssumption = {
  code: string
  description: string
  source: 'project' | 'manufacturer' | 'assumption'
}

export type ModelComponent = {
  id: string
  positionNo: number
  namePL: string
  category: ComponentCategory
  primitive: ComponentPrimitive
  material: string
  color: string
  ral?: string
  dimensions: ComponentDimensions
  quantity: number
  massKg?: number
  position: Vec3
  rotation: Vec3
  explodeDirection: Vec3
  assemblyStage: number
  wall?: WallSide
  sourceAccuracy: 'exact' | 'project-estimate' | 'assumption'
  assumptionCodes?: string[]
  profile2Dmm?: Array<[number, number]>
  opening?: OpeningPlacement
  decor?: DecorPlacement
  parentId?: string
  fastenerKind?: 'panel-wall' | 'panel-roof' | 'flashing' | 'rivet' | 'anchor' | 'cladding'
}

export type ComponentModelMetrics = {
  floorAreaM2: number
  roofAreaM2: number
  grossWallAreaM2: number
  openingsAreaM2: number
  netWallAreaM2: number
  modeledWallPanelAreaM2: number
  flashingLengthM: number
  fastenerCount: number
  componentCount: number
  facadeCladdingAreaM2: number
  facadeCladdingCount: number
  cassetteAreaM2: number
  cassetteCount: number
}

export type ComponentModel = {
  components: ModelComponent[]
  assumptions: ComponentAssumption[]
  metrics: ComponentModelMetrics
}

export const CATEGORY_COLORS: Record<ComponentCategory, string> = {
  'floor-frame': '#486581',
  structure: '#5b6470',
  'corner-posts': '#37474f',
  'roof-beams': '#6c757d',
  'floor-panels': '#8d6e63',
  'wall-panels': '#90a4ae',
  'roof-panels': '#78909c',
  flashings: '#455a64',
  joinery: '#315c75',
  decor: '#9b6b43',
  fasteners: '#b0bec5',
  seals: '#39494d',
  installations: '#c07d32',
  interior: '#b8b0a3',
}

const WALL_MODULE_M = m(PHYS.panel.wallModule)
const ROOF_MODULE_M = m(PHYS.panel.roofModule)
const FLOOR_MODULE_M = m(PHYS.panel.wallModule)
/** Rama stolarki w kolorze elewacji (RAL 7016) — zdjęcia 03, 09, 11. */
export const DEFAULT_FRAME_COLOR = RAL_7016_HEX
const STEEL_DENSITY = 7850
const SHEET_THICKNESS_M = 0.0005

const PANEL_MASS_KG_M2: Record<PavilionConfig['wallPanel'], number> = {
  PIR100: 12.5,
  PIR120: 13.3,
  PIR160: 14.9,
  EPS100: 10.8,
}

const ASSUMPTIONS: ComponentAssumption[] = [
  {
    code: 'A-WALL-MODULE',
    description: 'Moduł roboczy płyty ściennej przyjęto 1000 mm. Do podmiany, jeżeli konkretny projekt/producent przewiduje inny moduł.',
    source: 'assumption',
  },
  {
    code: 'A-ROOF-MODULE',
    description: 'Moduł roboczy płyty dachowej przyjęto 1050 mm, zgodnie z obecnym standardem konfiguratora i zakupami produkcyjnymi.',
    source: 'project',
  },
  {
    code: 'A-SHEET',
    description: 'Dla masy obróbek przyjęto blachę stalową 0,50 mm, 7850 kg/m³. Rozwinięcia są parametrami modelu, nie dokumentacją gięcia.',
    source: 'assumption',
  },
  {
    code: 'A-WALL-FASTENERS',
    description: 'Dla pionowej płyty ściennej przyjęto 2 łączniki na podporę górną i 2 na dolną, czyli 4 szt./moduł. Dokładna liczba zależy od systemu, ssania wiatru i obliczeń.',
    source: 'assumption',
  },
  {
    code: 'A-ROOF-SUPPORTS',
    description: 'Dla wizualizacji dachu przyjęto linie podparcia co maks. 1500 mm w kierunku spadku; 2 wkręty na płytę w każdej linii podparcia.',
    source: 'assumption',
  },
  {
    code: 'A-FLASHING-SCREWS',
    description: 'Wkręty/nity do obróbek wizualizowane co 300 mm. Katalogi producentów wymagają odpowiednich wkrętów/nitów, ale rozstaw zależy od detalu.',
    source: 'assumption',
  },
  {
    code: 'A-SEALS',
    description: 'Taśmy/uszczelnienia pokazano jako ciągłe pasy przy podwalinie, obwodzie stolarki i połączeniach dachu. Typ uszczelki należy podmienić wg detalu wykonawczego.',
    source: 'assumption',
  },
  {
    code: 'A-CASSETTE-LAYOUT',
    description: 'Kasetony poziome: fuga 15 mm, pas korpusu 240 mm, attyka 2 × 330 mm z modułem ≈ 1,1 m bez mijanki — pomiary zdjęć 03 i 11 (src/physical/spec.ts).',
    source: 'assumption',
  },
  {
    code: 'A-CASSETTE-SUBSTRUCTURE',
    description: 'Podkonstrukcja kasetonów jest modelowana ilościowo pośrednio; jej przekroje, rozstaw szyn i sposób kotwienia wymagają danych produkcyjnych Dampol.',
    source: 'assumption',
  },
  {
    code: 'A-CASSETTE-FASTENERS',
    description: 'Przyjęto 4 ukryte łączniki na kaseton/narożnik L. Rodzaj, liczba i rozstaw wkrętów/nitów wymagają potwierdzenia technologią Dampol.',
    source: 'assumption',
  },
  {
    code: 'A-CASSETTE-CORNER',
    description: 'Kaseton narożny L przyjęto jako zawinięcie 150+150 mm z ciągłością fug poziomych. Szerokość zawinięcia wymaga rysunku gięcia.',
    source: 'assumption',
  },
  {
    code: 'A-CROWN-FLASHING',
    description: 'Korona attyki: cienka obróbka o rozwinięciu 80 mm. Brak szerokiego okapu, chyba że projekt jawnie go wymaga.',
    source: 'assumption',
  },
  {
    code: 'A-FOUNDATION-BLOCKS',
    description: 'Posadowienie: 6 podkładów 400×200 mm o wysokości prześwitu (domyślnie 60 mm wg zdjęć 03/11 i filmu WA0019). Liczbę i wymiary należy potwierdzić dla konkretnego montażu.',
    source: 'assumption',
  },
  {
    code: 'A-RIBBED-FACADE',
    description: 'Alternatywna blacha elewacyjna wysokoprofilowana: moduł modelowy 600 mm i pionowe żebra; dokładny profil i szerokość krycia wymagają wskazania produktu.',
    source: 'assumption',
  },
  {
    code: 'A-STEEL-MASS',
    description: 'Masa kątownika 50×50×4 i profilu 100×100×3 liczona geometrycznie ze stali 7850 kg/m³; kratownica pozostaje masą nieokreśloną.',
    source: 'assumption',
  },
]

function round(n: number, digits = 4) {
  const p = 10 ** digits
  return Math.round(n * p) / p
}

function envelope(c: PavilionConfig) {
  const floorT = PANEL_THICKNESS_M[c.floorPanel]
  const roofT = PANEL_THICKNESS_M[c.roofPanel]
  const outerFront = floorT + c.frontHeight + roofT
  const outerBack = floorT + c.backHeight + roofT
  const roofDepth = Math.hypot(c.width, outerFront - outerBack)
  const roofSlope = Math.atan2(outerFront - outerBack, c.width)
  return { floorT, roofT, outerFront, outerBack, roofDepth, roofSlope }
}

/** Geometria otworów/dekorów dla konfiguracji bez projektu — jedno źródło prawdy dla renderu i BOM. */
export function fallbackGeometry(c: PavilionConfig): ProjectGeometry {
  const openings: OpeningPlacement[] = []
  const gap = 0.10
  const widths = [
    ...Array.from({ length: c.fixedGlazingCount }, () => c.fixedGlazingWidth),
    ...Array.from({ length: c.aluDoorCount }, () => c.aluDoorWidth),
    ...Array.from({ length: c.aluWindowCount }, () => c.aluWindowWidth),
  ]
  const total = widths.reduce((a, b) => a + b, 0) + Math.max(0, widths.length - 1) * gap
  let x = -Math.min(total, c.length - 0.45) / 2

  for (let i = 0; i < c.fixedGlazingCount; i++) {
    openings.push({
      id: 'fg-' + i,
      wall: 'front',
      center: x + c.fixedGlazingWidth / 2,
      width: c.fixedGlazingWidth,
      height: c.fixedGlazingHeight,
      sill: 0.08,
      kind: 'fixed-glass',
      glazing: c.glazing,
      roller: c.rollers && i < c.rollerCount,
      sourceAccuracy: 'drawing-estimate',
    })
    x += c.fixedGlazingWidth + gap
  }

  for (let i = 0; i < c.aluDoorCount; i++) {
    openings.push({
      id: 'door-' + i,
      wall: 'front',
      center: x + c.aluDoorWidth / 2,
      width: c.aluDoorWidth,
      height: c.aluDoorHeight,
      sill: 0,
      kind: 'door-glazed',
      glazing: c.glazing,
      roller: c.rollers && c.fixedGlazingCount + i < c.rollerCount,
      sourceAccuracy: 'drawing-estimate',
    })
    x += c.aluDoorWidth + gap
  }

  for (let i = 0; i < c.aluWindowCount; i++) {
    openings.push({
      id: 'alu-' + i,
      wall: 'front',
      center: x + c.aluWindowWidth / 2,
      width: c.aluWindowWidth,
      height: c.aluWindowHeight,
      sill: 0.08,
      kind: 'alu-window',
      glazing: c.glazing,
      sourceAccuracy: 'drawing-estimate',
    })
    x += c.aluWindowWidth + gap
  }

  for (let i = 0; i < c.pvcWindowCount; i++) {
    openings.push({
      id: 'pvc-' + i,
      wall: 'left',
      center: (i - (c.pvcWindowCount - 1) / 2) * 0.75,
      width: c.pvcWindowWidth,
      height: c.pvcWindowHeight,
      sill: 1.25,
      kind: 'pvc-window',
      glazing: c.glazing,
      sourceAccuracy: 'drawing-estimate',
    })
  }

  const decor: DecorPlacement[] = []
  const enabledSides = (['front', 'back', 'left', 'right'] as WallSide[]).filter((side) => facadeEnabled(side, c))
  const fullDecorKind: DecorPlacement['kind'] | null =
    c.facade === 'lamella-winchester' ? 'lamella-winchester' :
    c.facade === 'lamella-black' ? 'lamella-black' :
    c.facade === 'lamella-diagonal-winchester' ? 'lamella-diagonal-winchester' :
    c.facade === 'wood-horizontal' ? 'board-horizontal-winchester' :
    c.facade === 'ornament-panel' ? 'ornament-panel' : null

  if (fullDecorKind) {
    for (const side of enabledSides) {
      const span = wallSpan(side, c)
      const h = side === 'front'
        ? envelope(c).outerFront
        : side === 'back'
          ? envelope(c).outerBack
          : (envelope(c).outerFront + envelope(c).outerBack) / 2
      decor.push({
        id: 'custom-full-' + side,
        wall: side,
        center: 0,
        width: span,
        yCenter: h / 2,
        height: h,
        kind: fullDecorKind,
        sourceAccuracy: 'drawing-estimate',
      })
    }
  } else if (c.facade === 'cassette-lamella' && c.facadeFront) {
    const fieldHeight = Math.min(2.40, envelope(c).outerFront - 0.18)
    const groupWidth = Math.min(total, c.length - 0.50)
    const sideSpace = Math.max(0.38, Math.min(1.10, (c.length - groupWidth) / 2 - 0.10))
    if (sideSpace > 0.20) {
      decor.push(
        { id:'custom-l', wall:'front', center:-c.length / 2 + sideSpace / 2 + 0.05, width:sideSpace, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'lamella-winchester', sourceAccuracy:'drawing-estimate' },
        { id:'custom-r', wall:'front', center:c.length / 2 - sideSpace / 2 - 0.05, width:sideSpace, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'lamella-winchester', sourceAccuracy:'drawing-estimate' },
      )
    }
  } else if (c.facade === 'silver-rectangle' && c.facadeFront) {
    const fieldHeight = Math.min(2.40, envelope(c).outerFront - 0.18)
    decor.push(
      { id:'custom-silver-l', wall:'front', center:-c.length / 2 + 0.50, width:0.82, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'silver-rect', sourceAccuracy:'drawing-estimate' },
      { id:'custom-silver-r', wall:'front', center:c.length / 2 - 0.50, width:0.82, yCenter:fieldHeight / 2 + 0.08, height:fieldHeight, kind:'silver-rect', sourceAccuracy:'drawing-estimate' },
    )
  }

  return {
    externalHeight: envelope(c).outerFront,
    foundationGap: m(PHYS.base.groundGap),
    openings,
    decor,
    exteriorLights: [],
    notes: ['Geometria wygenerowana z parametrów własnej konfiguracji.'],
  }
}

export function geometryOf(c: PavilionConfig) {
  return c.geometry ?? fallbackGeometry(c)
}

function wallSpan(side: WallSide, c: PavilionConfig) {
  return side === 'front' || side === 'back' ? c.length : c.width
}

function wallHeightAt(side: WallSide, local: number, c: PavilionConfig) {
  const { outerFront, outerBack } = envelope(c)
  if (side === 'front') return outerFront
  if (side === 'back') return outerBack
  const span = c.width
  const t = Math.max(0, Math.min(1, (local + span / 2) / span))
  return side === 'left'
    ? outerBack + (outerFront - outerBack) * t
    : outerFront + (outerBack - outerFront) * t
}

function wallNormal(side: WallSide): Vec3 {
  if (side === 'front') return [0, 0, 1]
  if (side === 'back') return [0, 0, -1]
  if (side === 'left') return [-1, 0, 0]
  return [1, 0, 0]
}

function wallRotation(side: WallSide): Vec3 {
  if (side === 'front') return [0, 0, 0]
  if (side === 'back') return [0, Math.PI, 0]
  if (side === 'left') return [0, -Math.PI / 2, 0]
  return [0, Math.PI / 2, 0]
}

function wallPosition(side: WallSide, localCenter: number, y: number, c: PavilionConfig): Vec3 {
  if (side === 'front') return [localCenter, y, c.width / 2]
  if (side === 'back') return [-localCenter, y, -c.width / 2]
  // zgodnie z wallTransform renderu (scene/geometry.ts): lewa — lokalne +x → świat +z, prawa — lokalne +x → świat −z
  if (side === 'left') return [-c.length / 2, y, localCenter]
  return [c.length / 2, y, -localCenter]
}

function openingSill(o: OpeningPlacement) {
  return o.sill ?? (o.kind.startsWith('door-') ? 0 : 0.08)
}

function overlapAreaWithOpening(
  side: WallSide,
  a: number,
  b: number,
  panelBottom: number,
  panelTop: number,
  opening: OpeningPlacement,
) {
  if (opening.wall !== side) return 0
  const ox0 = opening.center - opening.width / 2
  const ox1 = opening.center + opening.width / 2
  const xOverlap = Math.max(0, Math.min(b, ox1) - Math.max(a, ox0))
  if (xOverlap <= 0) return 0
  const oy0 = panelBottom + openingSill(opening)
  const oy1 = oy0 + opening.height
  const yOverlap = Math.max(0, Math.min(panelTop, oy1) - Math.max(panelBottom, oy0))
  return xOverlap * yOverlap
}

function constructionKgPerM(c: PavilionConfig) {
  if (c.construction === 'angle50') {
    const t = 0.004
    const a = 0.05
    const area = t * (a + a - t)
    return area * STEEL_DENSITY
  }
  if (c.construction === 'truss') return undefined
  const outer = 0.10
  const t = 0.003
  const inner = outer - 2 * t
  return (outer * outer - inner * inner) * STEEL_DENSITY
}

function constructionProfileMm(c: PavilionConfig) {
  return c.construction === 'angle50' ? [50, 50, 4] : c.construction === 'truss' ? [60, 60, 3] : [100, 100, 3]
}

function pushBeam(
  list: ModelComponent[],
  c: PavilionConfig,
  id: string,
  name: string,
  category: ComponentCategory,
  lengthM: number,
  position: Vec3,
  rotation: Vec3,
  explodeDirection: Vec3,
  stage: number,
  sourceAccuracy: ModelComponent['sourceAccuracy'] = 'assumption',
) {
  const [w, h, t] = constructionProfileMm(c)
  const kgPerM = constructionKgPerM(c)
  list.push({
    id,
    positionNo: 0,
    namePL: name,
    category,
    primitive: 'beam',
    material: CONSTRUCTION_LABELS[c.construction],
    color: '#30363a',
    dimensions: { lengthMm: Math.round(lengthM * 1000), widthMm: w, thicknessMm: t || h },
    quantity: 1,
    massKg: kgPerM == null ? undefined : round(kgPerM * lengthM, 2),
    position,
    rotation,
    explodeDirection,
    assemblyStage: stage,
    sourceAccuracy,
    assumptionCodes: ['A-STEEL-MASS'],
  })
}

function addFloorFrame(list: ModelComponent[], c: PavilionConfig) {
  const y = 0.05
  const x = c.length / 2 - 0.05
  const z = c.width / 2 - 0.05
  pushBeam(list, c, 'frame-front', 'Rama podłogi — belka frontowa', 'floor-frame', c.length, [0, y, z], [0, 0, 0], [0, -1, 0], 1)
  pushBeam(list, c, 'frame-back', 'Rama podłogi — belka tylna', 'floor-frame', c.length, [0, y, -z], [0, 0, 0], [0, -1, 0], 1)
  pushBeam(list, c, 'frame-left', 'Rama podłogi — belka lewa', 'floor-frame', c.width, [-x, y, 0], [0, Math.PI / 2, 0], [0, -1, 0], 1)
  pushBeam(list, c, 'frame-right', 'Rama podłogi — belka prawa', 'floor-frame', c.width, [x, y, 0], [0, Math.PI / 2, 0], [0, -1, 0], 1)

  const crossCount = Math.max(0, Math.floor(c.length / 1.0) - 1)
  for (let i = 1; i <= crossCount; i++) {
    const px = -c.length / 2 + (i * c.length) / (crossCount + 1)
    pushBeam(list, c, 'frame-cross-' + i, 'Rama podłogi — poprzeczka ' + i, 'floor-frame', c.width - 0.10, [px, y, 0], [0, Math.PI / 2, 0], [0, -1, 0], 1)
  }
}

function addCornerPosts(list: ModelComponent[], c: PavilionConfig) {
  const { outerFront, outerBack } = envelope(c)
  const x = c.length / 2 - 0.05
  const z = c.width / 2 - 0.05
  const data: Array<[string, Vec3, number, Vec3]> = [
    ['FL', [-x, outerFront / 2, z], outerFront, [-1, 0, 1]],
    ['FR', [x, outerFront / 2, z], outerFront, [1, 0, 1]],
    ['BL', [-x, outerBack / 2, -z], outerBack, [-1, 0, -1]],
    ['BR', [x, outerBack / 2, -z], outerBack, [1, 0, -1]],
  ]
  data.forEach(([tag, pos, length, dir]) => {
    pushBeam(list, c, 'post-' + tag, 'Słup narożny ' + tag, 'corner-posts', length, pos, [0, 0, Math.PI / 2], dir, 2)
  })
}

function addRoofStructure(list: ModelComponent[], c: PavilionConfig) {
  const { outerFront, outerBack, roofSlope } = envelope(c)
  const yMid = (outerFront + outerBack) / 2 - 0.06
  pushBeam(list, c, 'roof-rail-front', 'Belka dachowa frontowa', 'roof-beams', c.length - 0.10, [0, outerFront - 0.06, c.width / 2 - 0.05], [0, 0, 0], [0, 1, 0], 3)
  pushBeam(list, c, 'roof-rail-back', 'Belka dachowa tylna', 'roof-beams', c.length - 0.10, [0, outerBack - 0.06, -c.width / 2 + 0.05], [0, 0, 0], [0, 1, 0], 3)

  const count = Math.max(2, Math.ceil(c.length / 1.0) + 1)
  for (let i = 0; i < count; i++) {
    const x = -c.length / 2 + 0.05 + (i * (c.length - 0.10)) / Math.max(1, count - 1)
    pushBeam(
      list,
      c,
      'roof-cross-' + i,
      'Belka dachowa poprzeczna ' + (i + 1),
      'roof-beams',
      c.width - 0.10,
      [x, yMid, 0],
      [-roofSlope, Math.PI / 2, 0],
      [0, 1, 0],
      3,
    )
  }
}

function addFloorPanels(list: ModelComponent[], c: PavilionConfig) {
  const { floorT } = envelope(c)
  const count = Math.ceil(c.length / FLOOR_MODULE_M)
  for (let i = 0; i < count; i++) {
    const x0 = -c.length / 2 + i * FLOOR_MODULE_M
    const x1 = Math.min(c.length / 2, x0 + FLOOR_MODULE_M)
    const w = x1 - x0
    const area = w * c.width
    list.push({
      id: 'floor-panel-' + i,
      positionNo: 0,
      namePL: 'Panel podłogowy ' + (i + 1),
      category: 'floor-panels',
      primitive: 'panel',
      material: PANEL_LABELS[c.floorPanel],
      color: '#596168',
      dimensions: { lengthMm: Math.round(c.width * 1000), widthMm: Math.round(w * 1000), thicknessMm: Math.round(floorT * 1000), netAreaM2: round(area) },
      quantity: 1,
      massKg: round(area * PANEL_MASS_KG_M2[c.floorPanel], 2),
      position: [(x0 + x1) / 2, floorT / 2, 0],
      rotation: [0, 0, 0],
      explodeDirection: [0, -0.8, 0],
      assemblyStage: 4,
      sourceAccuracy: 'assumption',
      assumptionCodes: ['A-WALL-MODULE'],
    })
  }
}

function addWallPanels(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  const { floorT } = envelope(c)
  const thickness = PANEL_THICKNESS_M[c.wallPanel]
  const sides: WallSide[] = ['front', 'back', 'left', 'right']

  for (const side of sides) {
    const span = wallSpan(side, c)
    const count = Math.ceil(span / WALL_MODULE_M)
    for (let i = 0; i < count; i++) {
      const a = -span / 2 + i * WALL_MODULE_M
      const b = Math.min(span / 2, a + WALL_MODULE_M)
      const moduleW = b - a
      const center = (a + b) / 2
      const hA = wallHeightAt(side, a, c)
      const hB = wallHeightAt(side, b, c)
      const h = (hA + hB) / 2
      const gross = moduleW * h
      const openingArea = g.openings.reduce(
        (sum, opening) => sum + overlapAreaWithOpening(side, a, b, floorT, h, opening),
        0,
      )
      const net = Math.max(0, gross - openingArea)
      list.push({
        id: 'wall-panel-' + side + '-' + i,
        positionNo: 0,
        namePL: 'Płyta ścienna ' + side + ' ' + (i + 1),
        category: 'wall-panels',
        primitive: 'panel',
        material: PANEL_LABELS[c.wallPanel],
        color: c.exteriorColor,
        ral: c.exteriorColor,
        dimensions: {
          lengthMm: Math.round(h * 1000),
          widthMm: Math.round(moduleW * 1000),
          thicknessMm: Math.round(thickness * 1000),
          netAreaM2: round(net),
        },
        quantity: 1,
        massKg: round(net * PANEL_MASS_KG_M2[c.wallPanel], 2),
        position: wallPosition(side, center, h / 2, c),
        rotation: wallRotation(side),
        explodeDirection: wallNormal(side),
        assemblyStage: 5,
        wall: side,
        sourceAccuracy: 'assumption',
        assumptionCodes: ['A-WALL-MODULE'],
      })
    }
  }
}

function addRoofPanels(list: ModelComponent[], c: PavilionConfig) {
  const { roofT, outerFront, outerBack, roofDepth, roofSlope } = envelope(c)
  const count = Math.ceil(c.length / ROOF_MODULE_M)
  const y = (outerFront + outerBack) / 2 - roofT / 2
  for (let i = 0; i < count; i++) {
    const a = -c.length / 2 + i * ROOF_MODULE_M
    const b = Math.min(c.length / 2, a + ROOF_MODULE_M)
    const moduleW = b - a
    const area = moduleW * roofDepth
    list.push({
      id: 'roof-panel-' + i,
      positionNo: 0,
      namePL: 'Płyta dachowa ' + (i + 1),
      category: 'roof-panels',
      primitive: 'roof-panel',
      material: PANEL_LABELS[c.roofPanel],
      color: c.flashingColor,
      dimensions: {
        lengthMm: Math.round(roofDepth * 1000),
        widthMm: Math.round(moduleW * 1000),
        thicknessMm: Math.round(roofT * 1000),
        netAreaM2: round(area),
      },
      quantity: 1,
      massKg: round(area * PANEL_MASS_KG_M2[c.roofPanel], 2),
      position: [(a + b) / 2, y, 0],
      rotation: [-roofSlope, 0, 0],
      explodeDirection: [0, 1, 0],
      assemblyStage: 6,
      sourceAccuracy: 'exact',
      assumptionCodes: ['A-ROOF-MODULE'],
    })
  }
}


function facadeEnabled(side: WallSide, c: PavilionConfig) {
  return side === 'front' ? c.facadeFront :
    side === 'back' ? c.facadeBack :
    side === 'left' ? c.facadeLeft : c.facadeRight
}

export const DEFAULT_BAND_HEIGHT = m(PHYS.cassette.bodyBandHeight)
export const DEFAULT_GRID_HEIGHT = 0.65
export const DEFAULT_FACADE_GAP = m(PHYS.cassette.gap)
const ATTIC_ROW_H = m(PHYS.cassette.atticRowHeight)
const ATTIC_MODULE_TARGET = m(PHYS.cassette.atticModuleTarget)

function facadeSpecForSide(c: PavilionConfig, g: ProjectGeometry, side: WallSide): FacadeCladdingSpec | null {
  const explicit = g.facadeCladding?.[side]
  if (explicit) {
    if (explicit.kind === 'none') return null
    // parametry z konfiguratora nadpisują wartości projektu (np. galeria-03), gdy użytkownik je zmieni
    return {
      ...explicit,
      gap: c.facadeGap ?? explicit.gap,
      bandHeight: explicit.kind === 'cassette-horizontal' ? (c.facadeBandHeight ?? explicit.bandHeight) : explicit.bandHeight,
      moduleHeight: explicit.kind === 'cassette-grid' ? (c.facadeBandHeight ?? explicit.moduleHeight) : explicit.moduleHeight,
    }
  }
  if (!facadeEnabled(side, c) || c.facade === 'plain') return null
  if (
    c.facade === 'lamella-winchester' ||
    c.facade === 'lamella-black' ||
    c.facade === 'lamella-diagonal-winchester' ||
    c.facade === 'wood-horizontal' ||
    c.facade === 'ornament-panel'
  ) return null
  if (c.facade === 'cassette-grid') {
    return { kind: 'cassette-grid', gap: c.facadeGap ?? 0.012, moduleWidth: 0.80, moduleHeight: c.facadeBandHeight ?? DEFAULT_GRID_HEIGHT, color: c.exteriorColor }
  }
  if (c.facade === 'vertical-ribbed') {
    return { kind: 'vertical-ribbed', gap: 0.008, moduleWidth: 0.60, color: c.exteriorColor }
  }
  // Kasetony poziome wg pomiarów ze zdjęć (POMIARY.md): długie pasy na całe pole między
  // narożnikiem a otworem, bez pionowych podziałów na pełnej ścianie i bez mijanki.
  return {
    kind: 'cassette-horizontal',
    gap: c.facadeGap ?? DEFAULT_FACADE_GAP,
    bandHeight: c.facadeBandHeight ?? DEFAULT_BAND_HEIGHT,
    moduleWidth: 3.0,
    staggered: false,
    color: c.exteriorColor,
  }
}

/** Rzędy kasetonów poziomych: pasy korpusu + (opcjonalnie) 2 rzędy attyki. */
function horizontalBandRows(maxHeight: number, bandHeight: number, attic: boolean, atticRowH = ATTIC_ROW_H) {
  const rows: Array<{ y0: number; y1: number; attic: boolean; index: number }> = []
  const atticStart = attic ? maxHeight - atticRowH * 2 : maxHeight
  const bodyRows = Math.max(1, Math.round(atticStart / bandHeight))
  const pitch = atticStart / bodyRows
  for (let row = 0; row < bodyRows; row++) rows.push({ y0: row * pitch, y1: (row + 1) * pitch, attic: false, index: row })
  if (attic) for (let row = 0; row < 2; row++) rows.push({ y0: atticStart + row * atticRowH, y1: atticStart + (row + 1) * atticRowH, attic: true, index: row })
  return rows
}

function hasAtticBand(c: PavilionConfig) {
  return c.attic || c.project === 'GALERIA/03'
}

function visibleIntervalsForBand(
  side: WallSide,
  a: number,
  b: number,
  y0: number,
  y1: number,
  floorT: number,
  g: ProjectGeometry,
) {
  const cuts = g.openings
    .filter((o) => o.wall === side)
    .filter((o) => {
      const oy0 = floorT + openingSill(o)
      const oy1 = oy0 + o.height
      return Math.min(y1, oy1) - Math.max(y0, oy0) > 0.001
    })
    .map((o) => [o.center - o.width / 2, o.center + o.width / 2] as [number, number])
    .sort((x, y) => x[0] - y[0])

  const out: Array<[number, number]> = []
  let cursor = a
  for (const [c0, c1] of cuts) {
    if (c1 <= cursor || c0 >= b) continue
    const left = Math.max(a, c0)
    if (left > cursor) out.push([cursor, Math.min(left, b)])
    cursor = Math.max(cursor, c1)
    if (cursor >= b) break
  }
  if (cursor < b) out.push([cursor, b])
  return out.filter(([x0, x1]) => x1 - x0 > 0.025)
}

function pushFacadePiece(
  list: ModelComponent[],
  c: PavilionConfig,
  side: WallSide,
  id: string,
  kind: FacadeCladdingSpec['kind'],
  a: number,
  b: number,
  y0: number,
  y1: number,
  color: string,
) {
  const center = (a + b) / 2
  const localTop = wallHeightAt(side, center, c)
  const top = Math.min(y1, localTop)
  const height = top - y0
  const width = b - a
  if (height <= 0.025 || width <= 0.025) return
  const normal = wallNormal(side)
  const p = wallPosition(side, center, y0 + height / 2, c)
  const isRibbed = kind === 'vertical-ribbed'
  const gallery03 = c.project === 'GALERIA/03'
  // kaseton: podkonstrukcja 20 mm (produkcja) + taca (głębokość UNKNOWN); środek kasetonu od osi ściany
  const thicknessMm = isRibbed ? 35 : PHYS.cassette.thickness.value
  const wallHalf = PANEL_THICKNESS_M[c.wallPanel] / 2
  const facadeOffset = wallHalf + m(PHYS.cassette.substructureGap) + thicknessMm / 2000
  list.push({
    id,
    positionNo: 0,
    namePL: isRibbed ? 'Blacha elewacyjna wysokoprofilowana' : 'Kaseton elewacyjny',
    category: 'decor',
    primitive: 'decor',
    material: isRibbed ? 'Blacha elewacyjna wysokoprofilowana' : 'Kaseton elewacyjny stalowy',
    color,
    ral: color,
    dimensions: {
      lengthMm: Math.round(height * 1000),
      widthMm: Math.round(width * 1000),
      thicknessMm,
      netAreaM2: round(width * height),
    },
    quantity: 1,
    position: [p[0] + normal[0] * facadeOffset, p[1], p[2] + normal[2] * facadeOffset],
    rotation: wallRotation(side),
    explodeDirection: [normal[0] * 1.4, 0.1, normal[2] * 1.4],
    assemblyStage: 9,
    wall: side,
    sourceAccuracy: gallery03 ? 'project-estimate' : 'assumption',
    assumptionCodes: isRibbed
      ? ['A-RIBBED-FACADE', 'A-CASSETTE-SUBSTRUCTURE']
      : ['A-CASSETTE-LAYOUT', 'A-CASSETTE-SUBSTRUCTURE'],
  })
}


function visibleIntervalsForCassetteBand(
  side: WallSide,
  a: number,
  b: number,
  y0: number,
  y1: number,
  floorT: number,
  g: ProjectGeometry,
) {
  const cuts: Array<[number, number]> = []

  for (const o of g.openings.filter((x) => x.wall === side)) {
    const oy0 = floorT + openingSill(o)
    const oy1 = oy0 + o.height
    if (Math.min(y1, oy1) - Math.max(y0, oy0) > 0.001) {
      cuts.push([o.center - o.width / 2, o.center + o.width / 2])
    }
  }

  // okładziny (lamele, deski, ornament) zastępują kaseton w swoim polu
  for (const d of g.decor.filter((x) => x.wall === side && x.kind !== 'led-strip')) {
    const dy0 = d.yCenter - d.height / 2
    const dy1 = d.yCenter + d.height / 2
    if (Math.min(y1, dy1) - Math.max(y0, dy0) > 0.001) {
      cuts.push([d.center - d.width / 2, d.center + d.width / 2])
    }
  }

  cuts.sort((x, y) => x[0] - y[0])
  const out: Array<[number, number]> = []
  let cursor = a
  for (const [c0, c1] of cuts) {
    if (c1 <= cursor || c0 >= b) continue
    const left = Math.max(a, c0)
    if (left > cursor) out.push([cursor, Math.min(left, b)])
    cursor = Math.max(cursor, c1)
    if (cursor >= b) break
  }
  if (cursor < b) out.push([cursor, b])
  return out.filter(([x0, x1]) => x1 - x0 > 0.025)
}

function addFacadeCladding(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  const { floorT } = envelope(c)
  const sides: WallSide[] = ['front', 'back', 'left', 'right']

  for (const side of sides) {
    const spec = facadeSpecForSide(c, g, side)
    if (!spec) continue
    const span = wallSpan(side, c)
    const gap = spec.gap ?? 0.012
    const maxHeight = Math.max(wallHeightAt(side, -span / 2, c), wallHeightAt(side, span / 2, c))

    if (spec.kind === 'cassette-horizontal' && spec.staggered === false) {
      const rows = horizontalBandRows(maxHeight, spec.bandHeight ?? DEFAULT_BAND_HEIGHT, hasAtticBand(c), spec.atticRowHeight)
      for (const row of rows) {
        const { y0, y1 } = row
        if (!row.attic) {
          // korpus: pas ciągły, dzielony tylko przez otwory i okładziny (lamele)
          const visible = visibleIntervalsForCassetteBand(side, -span / 2, span / 2, y0, y1, floorT, g)
          for (let part = 0; part < visible.length; part++) {
            const [v0, v1] = visible[part]
            const leftShrink = Math.abs(v0 + span / 2) < 0.001 ? 0 : gap / 2
            const rightShrink = Math.abs(v1 - span / 2) < 0.001 ? 0 : gap / 2
            pushFacadePiece(
              list, c, side, 'facade-cassette-' + side + '-body-' + row.index + '-' + part,
              spec.kind, v0 + leftShrink, v1 - rightShrink, y0 + gap / 2, y1 - gap / 2, spec.color ?? c.exteriorColor,
            )
          }
          continue
        }
        // attyka: długość podzielona na równe moduły ≈ 1,1 m, łączenia obu rzędów w jednej linii (zdjęcia 03 i 11)
        const atticCount = Math.max(1, Math.round(span / ATTIC_MODULE_TARGET))
        const atticModule = span / atticCount
        for (let col = 0; col < atticCount; col++) {
          const cell0 = -span / 2 + col * atticModule
          const cell1 = cell0 + atticModule
          if (cell1 - cell0 <= 0.025) continue
          const leftShrink = Math.abs(cell0 + span / 2) < 0.001 ? 0 : gap / 2
          const rightShrink = Math.abs(cell1 - span / 2) < 0.001 ? 0 : gap / 2
          pushFacadePiece(
            list, c, side, 'facade-cassette-' + side + '-attic-' + row.index + '-' + col,
            spec.kind, cell0 + leftShrink, cell1 - rightShrink, y0 + gap / 2, y1 - gap / 2, spec.color ?? c.exteriorColor,
          )
        }
      }
      continue
    }

    if (spec.kind === 'vertical-ribbed') {
      const moduleW = spec.moduleWidth ?? 0.60
      const yBreaks = new Set<number>([0, maxHeight])
      for (const o of g.openings.filter((x) => x.wall === side)) {
        const oy0 = floorT + openingSill(o)
        yBreaks.add(Math.max(0, oy0))
        yBreaks.add(Math.min(maxHeight, oy0 + o.height))
      }
      const ys = [...yBreaks].filter((x) => x >= 0 && x <= maxHeight).sort((a, b) => a - b)
      for (let col = 0, x0 = -span / 2; x0 < span / 2 - 0.001; col++, x0 += moduleW) {
        const x1 = Math.min(span / 2, x0 + moduleW)
        for (let row = 0; row < ys.length - 1; row++) {
          const y0 = ys[row]
          const y1 = ys[row + 1]
          for (const [v0, v1] of visibleIntervalsForBand(side, x0, x1, y0, y1, floorT, g)) {
            const shrink = gap / 2
            pushFacadePiece(
              list, c, side, 'facade-ribbed-' + side + '-' + col + '-' + row,
              spec.kind, v0 + shrink, v1 - shrink, y0 + shrink, y1 - shrink, spec.color ?? c.exteriorColor,
            )
          }
        }
      }
      continue
    }

    const bandH = spec.kind === 'cassette-grid'
      ? (spec.moduleHeight ?? 0.65)
      : (spec.bandHeight ?? 0.40)
    const moduleW = spec.moduleWidth ?? (spec.kind === 'cassette-grid' ? 0.80 : 1.20)
    const staggered = spec.kind === 'cassette-horizontal' && (spec.staggered ?? true)
    const rows = Math.ceil(maxHeight / bandH)

    for (let row = 0; row < rows; row++) {
      const y0 = row * bandH
      const y1 = Math.min(maxHeight, y0 + bandH)
      const shift = staggered && row % 2 === 1 ? moduleW / 2 : 0
      for (let col = -1, x0 = -span / 2 - shift; x0 < span / 2 - 0.001; col++, x0 += moduleW) {
        const cell0 = Math.max(-span / 2, x0)
        const cell1 = Math.min(span / 2, x0 + moduleW)
        if (cell1 - cell0 <= 0.025) continue
        const visible = visibleIntervalsForBand(side, cell0, cell1, y0, y1, floorT, g)
        for (let part = 0; part < visible.length; part++) {
          const [v0, v1] = visible[part]
          const shrink = gap / 2
          pushFacadePiece(
            list, c, side, 'facade-cassette-' + side + '-' + row + '-' + col + '-' + part,
            spec.kind, v0 + shrink, v1 - shrink, y0 + shrink, y1 - shrink, spec.color ?? c.exteriorColor,
          )
        }
      }
    }
  }

  if (c.project === 'GALERIA/03') return

  const corners: Array<{
    id: string
    x: number
    z: number
    sides: [WallSide, WallSide]
    direction: Vec3
  }> = [
    { id: 'fl', x: -c.length / 2, z: c.width / 2, sides: ['front', 'left'], direction: [-1, 0, 1] },
    { id: 'fr', x: c.length / 2, z: c.width / 2, sides: ['front', 'right'], direction: [1, 0, 1] },
    { id: 'bl', x: -c.length / 2, z: -c.width / 2, sides: ['back', 'left'], direction: [-1, 0, -1] },
    { id: 'br', x: c.length / 2, z: -c.width / 2, sides: ['back', 'right'], direction: [1, 0, -1] },
  ]

  for (const corner of corners) {
    const specs = corner.sides.map((side) => facadeSpecForSide(c, g, side)).filter(Boolean) as FacadeCladdingSpec[]
    const cassetteSpec = specs.find((spec) => spec.kind === 'cassette-horizontal' || spec.kind === 'cassette-grid')
    if (!cassetteSpec) continue
    const gap = cassetteSpec.gap ?? DEFAULT_FACADE_GAP
    const h = Math.min(
      wallHeightAt(corner.sides[0], corner.sides[0] === 'front' || corner.sides[0] === 'back' ? corner.x : corner.z, c),
      wallHeightAt(corner.sides[1], corner.sides[1] === 'front' || corner.sides[1] === 'back' ? corner.x : corner.z, c),
    )
    const cornerRows = cassetteSpec.kind === 'cassette-grid'
      ? Array.from({ length: Math.ceil(h / (cassetteSpec.moduleHeight ?? DEFAULT_GRID_HEIGHT)) }, (_, i) => {
          const mh = cassetteSpec.moduleHeight ?? DEFAULT_GRID_HEIGHT
          return { y0: i * mh, y1: Math.min(h, (i + 1) * mh) }
        })
      : horizontalBandRows(h, cassetteSpec.bandHeight ?? DEFAULT_BAND_HEIGHT, hasAtticBand(c), cassetteSpec.atticRowHeight)
    for (let row = 0; row < cornerRows.length; row++) {
      const { y0, y1 } = cornerRows[row]
      const pieceH = Math.max(0.025, y1 - y0 - gap)
      list.push({
        id: 'corner-cassette-' + corner.id + '-' + row,
        positionNo: 0,
        namePL: 'Kaseton narożny L ' + corner.id.toUpperCase(),
        category: 'decor',
        primitive: 'decor',
        material: 'Kaseton narożny L',
        color: cassetteSpec.color ?? c.exteriorColor,
        dimensions: {
          lengthMm: Math.round(pieceH * 1000),
          widthMm: 300,
          thicknessMm: 30,
          netAreaM2: round(pieceH * 0.30),
        },
        quantity: 1,
        position: [corner.x, y0 + gap / 2 + pieceH / 2, corner.z],
        rotation: [0, 0, 0],
        explodeDirection: corner.direction,
        assemblyStage: 9,
        sourceAccuracy: 'assumption',
        assumptionCodes: ['A-CASSETTE-LAYOUT', 'A-CASSETTE-CORNER', 'A-CASSETTE-SUBSTRUCTURE'],
      })
    }
  }
}

function addFoundationBlocks(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  const gap = g.foundationGap ?? m(PHYS.base.groundGap)
  const xs = [-c.length / 2 + 0.45, 0, c.length / 2 - 0.45]
  for (const z of [-c.width / 2 + 0.28, c.width / 2 - 0.28]) {
    xs.forEach((x, i) => {
      list.push({
        id: 'foundation-block-' + (z > 0 ? 'f' : 'b') + '-' + i,
        positionNo: 0,
        namePL: 'Bloczek betonowy posadowienia',
        category: 'structure',
        primitive: 'beam',
        material: 'Beton',
        color: '#8d8d88',
        dimensions: { lengthMm: 400, widthMm: 200, thicknessMm: Math.round(gap * 1000) },
        quantity: 1,
        massKg: 18,
        position: [x, -gap / 2, z],
        rotation: [0, 0, 0],
        explodeDirection: [0, -1, 0],
        assemblyStage: 1,
        sourceAccuracy: 'assumption',
        assumptionCodes: ['A-FOUNDATION-BLOCKS'],
      })
    })
  }
}

type FlashingInput = {
  id: string
  name: string
  lengthM: number
  developedWidthM: number
  position: Vec3
  rotation?: Vec3
  direction: Vec3
  wall?: WallSide
  profile2Dmm: Array<[number, number]>
  assumptionCodes?: string[]
}

function addFlashing(list: ModelComponent[], c: PavilionConfig, f: FlashingInput) {
  const area = f.lengthM * f.developedWidthM
  list.push({
    id: f.id,
    positionNo: 0,
    namePL: f.name,
    category: 'flashings',
    primitive: 'flashing',
    material: 'Blacha stalowa powlekana 0,50 mm',
    color: c.flashingColor,
    ral: c.flashingColor,
    dimensions: {
      lengthMm: Math.round(f.lengthM * 1000),
      widthMm: Math.round(f.developedWidthM * 1000),
      thicknessMm: 0.5,
      developedWidthMm: Math.round(f.developedWidthM * 1000),
    },
    quantity: 1,
    massKg: round(area * SHEET_THICKNESS_M * STEEL_DENSITY, 2),
    position: f.position,
    rotation: f.rotation ?? [0, 0, 0],
    explodeDirection: f.direction,
    assemblyStage: 7,
    wall: f.wall,
    sourceAccuracy: 'assumption',
    assumptionCodes: ['A-SHEET', ...(f.assumptionCodes ?? [])],
    profile2Dmm: f.profile2Dmm,
  })
}

function addFlashings(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  const { floorT, outerFront, outerBack, roofDepth, roofSlope } = envelope(c)
  const hAvg = (outerFront + outerBack) / 2
  const crownProfile: Array<[number, number]> = [[0, 0], [18, 0], [18, 45], [35, 45], [35, 80], [0, 80]]
  const roofEdgeProfile: Array<[number, number]> = [[0, 0], [25, 0], [25, 120], [45, 120], [45, 185], [0, 185]]
  const baseProfile: Array<[number, number]> = [[0, 0], [25, 0], [25, 110], [50, 110], [50, 155], [0, 155]]
  const jambProfile: Array<[number, number]> = [[0, 0], [20, 0], [20, 95], [40, 95], [40, 160], [0, 160]]
  const sillProfile: Array<[number, number]> = [[0, 0], [20, 0], [20, 145], [35, 160], [35, 195], [0, 195]]

  const x = c.length / 2
  const z = c.width / 2

  // Zdjęcia referencyjne pokazują kasetony do samej góry i tylko cienką koronę attyki.
  addFlashing(list, c, { id: 'fl-crown-front', name: 'Korona attyki front', lengthM: c.length, developedWidthM: 0.08, position: [0, outerFront, z + 0.025], direction: [0, 0.5, 1], wall: 'front', profile2Dmm: crownProfile, assumptionCodes: ['A-CROWN-FLASHING'] })
  addFlashing(list, c, { id: 'fl-crown-back', name: 'Korona attyki tył', lengthM: c.length, developedWidthM: 0.08, position: [0, outerBack, -z - 0.025], rotation: [0, Math.PI, 0], direction: [0, 0.5, -1], wall: 'back', profile2Dmm: crownProfile, assumptionCodes: ['A-CROWN-FLASHING'] })
  addFlashing(list, c, { id: 'fl-crown-left', name: 'Korona attyki bok lewy', lengthM: roofDepth, developedWidthM: 0.08, position: [-x - 0.025, hAvg, 0], rotation: [-roofSlope, -Math.PI / 2, 0], direction: [-1, 0.5, 0], wall: 'left', profile2Dmm: crownProfile, assumptionCodes: ['A-CROWN-FLASHING'] })
  addFlashing(list, c, { id: 'fl-crown-right', name: 'Korona attyki bok prawy', lengthM: roofDepth, developedWidthM: 0.08, position: [x + 0.025, hAvg, 0], rotation: [-roofSlope, Math.PI / 2, 0], direction: [1, 0.5, 0], wall: 'right', profile2Dmm: crownProfile, assumptionCodes: ['A-CROWN-FLASHING'] })

  // Szerokie opierzenie/okap występuje tylko wtedy, gdy projekt jawnie go wymaga.
  if (g.roofEdgeFlashing) {
    addFlashing(list, c, { id: 'fl-roof-front', name: 'Opierzenie dachu front', lengthM: c.length, developedWidthM: 0.185, position: [0, outerFront, z + 0.04], direction: [0, 0.8, 1], profile2Dmm: roofEdgeProfile })
    addFlashing(list, c, { id: 'fl-roof-back', name: 'Opierzenie dachu tył / okap', lengthM: c.length, developedWidthM: 0.185, position: [0, outerBack, -z - 0.04], direction: [0, 0.8, -1], profile2Dmm: roofEdgeProfile })
    addFlashing(list, c, { id: 'fl-roof-left', name: 'Opierzenie dachu bok lewy', lengthM: roofDepth, developedWidthM: 0.185, position: [-x - 0.04, hAvg, 0], rotation: [-roofSlope, -Math.PI / 2, 0], direction: [-1, 0.8, 0], profile2Dmm: roofEdgeProfile })
    addFlashing(list, c, { id: 'fl-roof-right', name: 'Opierzenie dachu bok prawy', lengthM: roofDepth, developedWidthM: 0.185, position: [x + 0.04, hAvg, 0], rotation: [-roofSlope, Math.PI / 2, 0], direction: [1, 0.8, 0], profile2Dmm: roofEdgeProfile })
  }

  const baseY = Math.max(0.05, floorT / 2)
  ;(['front', 'back', 'left', 'right'] as WallSide[]).forEach((side) => {
    const span = wallSpan(side, c)
    addFlashing(list, c, {
      id: 'fl-base-' + side,
      name: 'Obróbka cokołowa ' + side,
      lengthM: span,
      developedWidthM: 0.155,
      position: wallPosition(side, 0, baseY, c),
      rotation: wallRotation(side),
      direction: wallNormal(side),
      wall: side,
      profile2Dmm: baseProfile,
    })
  })

  for (const opening of g.openings) {
    const sill = floorT + openingSill(opening)
    const cy = sill + opening.height / 2
    const normal = wallNormal(opening.wall)
    const rot = wallRotation(opening.wall)
    const verticalRot: Vec3 = [0, rot[1], Math.PI / 2]
    const leftCenter = opening.center - opening.width / 2
    const rightCenter = opening.center + opening.width / 2
    const source = opening.sourceAccuracy === 'dimensioned' ? 'exact' : 'project-estimate'

    const parts: Array<[string, string, number, number, number, Array<[number, number]>]> = [
      ['left', 'Ościeże lewe', opening.height, leftCenter, cy, jambProfile],
      ['right', 'Ościeże prawe', opening.height, rightCenter, cy, jambProfile],
      ['head', 'Nadproże / opierzenie górne', opening.width, opening.center, sill + opening.height, jambProfile],
    ]
    if (!opening.kind.startsWith('door-')) parts.push(['sill', 'Parapet zewnętrzny', opening.width, opening.center, sill, sillProfile])

    for (const [tag, name, len, local, y, profile] of parts) {
      const pos = wallPosition(opening.wall, local, y, c)
      addFlashing(list, c, {
        id: 'fl-opening-' + opening.id + '-' + tag,
        name: name + ' — ' + opening.id,
        lengthM: len,
        developedWidthM: tag === 'sill' ? 0.195 : 0.16,
        position: [pos[0] + normal[0] * 0.055, pos[1], pos[2] + normal[2] * 0.055],
        rotation: tag === 'left' || tag === 'right' ? verticalRot : rot,
        direction: normal,
        wall: opening.wall,
        profile2Dmm: profile,
      })
      const latest = list[list.length - 1]
      latest.sourceAccuracy = source
      latest.parentId = 'joinery-' + opening.id
    }
  }

  if (c.gutter) {
    list.push({
      id: 'gutter-main',
      positionNo: 0,
      namePL: 'Rynna tylna',
      category: 'flashings',
      primitive: 'flashing',
      material: 'System rynnowy stalowy',
      color: c.flashingColor,
      dimensions: { lengthMm: Math.round(c.length * 1000), widthMm: 125, thicknessMm: 0.6, developedWidthMm: 280 },
      quantity: 1,
      position: [0, outerBack - 0.04, -z - 0.08],
      rotation: [0, 0, 0],
      explodeDirection: [0, 1, -1],
      assemblyStage: 7,
      sourceAccuracy: 'assumption',
      assumptionCodes: ['A-SHEET'],
      profile2Dmm: [[0, 0], [35, 0], [55, 25], [55, 95], [35, 120], [0, 120]],
    })
    list.push({
      id: 'downpipe-main',
      positionNo: 0,
      namePL: 'Rura spustowa',
      category: 'flashings',
      primitive: 'flashing',
      material: 'System rynnowy stalowy',
      color: c.flashingColor,
      dimensions: { lengthMm: Math.round((outerBack - 0.20) * 1000), widthMm: 80, thicknessMm: 0.6 },
      quantity: 1,
      position: [x - 0.10, outerBack / 2, -z - 0.07],
      rotation: [0, 0, Math.PI / 2],
      explodeDirection: [1, 0.5, -1],
      assemblyStage: 7,
      sourceAccuracy: 'assumption',
    })
  }
}

function addJoinery(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  const { floorT } = envelope(c)
  for (const o of g.openings) {
    const normal = wallNormal(o.wall)
    const y = floorT + openingSill(o) + o.height / 2
    const pos = wallPosition(o.wall, o.center, y, c)
    const material = o.kind === 'pvc-window' ? 'PVC + pakiet szybowy' : 'Aluminium + pakiet szybowy'
    list.push({
      id: 'joinery-' + o.id,
      positionNo: 0,
      namePL:
        o.kind === 'fixed-glass' ? 'FIX ' + o.id :
        o.kind === 'alu-window' ? 'Okno ALU ' + o.id :
        o.kind === 'pvc-window' ? 'Okno PVC ' + o.id :
        o.kind === 'door-full' ? 'Drzwi pełne ' + o.id :
        o.kind === 'door-double' ? 'Drzwi podwójne ' + o.id : 'Drzwi ALU ' + o.id,
      category: 'joinery',
      primitive: 'joinery',
      material,
      color: o.frameColor ?? DEFAULT_FRAME_COLOR,
      dimensions: { lengthMm: Math.round(o.height * 1000), widthMm: Math.round(o.width * 1000), thicknessMm: 70 },
      quantity: 1,
      position: [pos[0] + normal[0] * 0.055, pos[1], pos[2] + normal[2] * 0.055],
      rotation: wallRotation(o.wall),
      explodeDirection: [normal[0] * 1.25, 0.2, normal[2] * 1.25],
      assemblyStage: 8,
      wall: o.wall,
      sourceAccuracy: o.sourceAccuracy === 'dimensioned' ? 'exact' : 'project-estimate',
      opening: o,
    })
  }
}

function addDecor(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  for (const d of g.decor) {
    const facadeSpec = facadeSpecForSide(c, g, d.wall)
    const legacyFacadeCassette = [
      'cassette-black',
      'cassette-square-graphite',
      'cassette-rect-graphite',
      'cassette-white',
    ].includes(d.kind)
    if (facadeSpec && legacyFacadeCassette) continue

    const normal = wallNormal(d.wall)
    const p = wallPosition(d.wall, d.center, d.yCenter, c)
    const isWood = d.kind.includes('winchester') || d.kind.includes('palisander') || d.kind === 'board-natural'
    list.push({
      id: 'decor-' + d.id,
      positionNo: 0,
      namePL: 'Okładzina ' + d.kind + ' — ' + d.id,
      category: 'decor',
      primitive: 'decor',
      material: isWood ? 'Okładzina drewnopodobna / lamele' : 'Kaseton / okładzina blaszana',
      color: isWood ? '#7c593d' : c.flashingColor,
      dimensions: {
        lengthMm: Math.round(d.height * 1000),
        widthMm: Math.round(d.width * 1000),
        thicknessMm: d.kind.startsWith('lamella') ? 52 : 50,
        netAreaM2: round(d.width * d.height),
      },
      quantity: 1,
      position: [p[0] + normal[0] * 0.085, p[1], p[2] + normal[2] * 0.085],
      rotation: wallRotation(d.wall),
      explodeDirection: [normal[0] * 1.6, 0.1, normal[2] * 1.6],
      assemblyStage: 9,
      wall: d.wall,
      sourceAccuracy: d.sourceAccuracy === 'dimensioned' ? 'exact' : 'project-estimate',
      decor: d,
    })
  }
}

function addSeal(
  list: ModelComponent[],
  id: string,
  name: string,
  lengthM: number,
  position: Vec3,
  rotation: Vec3,
  direction: Vec3,
  parentId?: string,
) {
  list.push({
    id,
    positionNo: 0,
    namePL: name,
    category: 'seals',
    primitive: 'seal',
    material: 'Taśma/uszczelka systemowa',
    color: '#22292b',
    dimensions: { lengthMm: Math.round(lengthM * 1000), widthMm: 20, thicknessMm: 3 },
    quantity: 1,
    position,
    rotation,
    explodeDirection: direction,
    assemblyStage: 7,
    sourceAccuracy: 'assumption',
    assumptionCodes: ['A-SEALS'],
    parentId,
  })
}

function addSeals(list: ModelComponent[], c: PavilionConfig, g: ProjectGeometry) {
  const { floorT } = envelope(c)
  ;(['front', 'back', 'left', 'right'] as WallSide[]).forEach((side) => {
    const p = wallPosition(side, 0, floorT + 0.015, c)
    addSeal(list, 'seal-base-' + side, 'Uszczelnienie podwaliny ' + side, wallSpan(side, c), p, wallRotation(side), wallNormal(side))
  })
  for (const o of g.openings) {
    const sill = floorT + openingSill(o)
    const yCenter = sill + o.height / 2
    const rotation = wallRotation(o.wall)
    const verticalRotation: Vec3 = [0, rotation[1], Math.PI / 2]
    const direction = wallNormal(o.wall)
    const parentId = 'joinery-' + o.id
    const leftPos = wallPosition(o.wall, o.center - o.width / 2, yCenter, c)
    const rightPos = wallPosition(o.wall, o.center + o.width / 2, yCenter, c)
    const topPos = wallPosition(o.wall, o.center, sill + o.height, c)
    const bottomPos = wallPosition(o.wall, o.center, sill, c)

    addSeal(list, 'seal-opening-' + o.id + '-left', 'Uszczelnienie ościeża lewego ' + o.id, o.height, leftPos, verticalRotation, direction, parentId)
    addSeal(list, 'seal-opening-' + o.id + '-right', 'Uszczelnienie ościeża prawego ' + o.id, o.height, rightPos, verticalRotation, direction, parentId)
    addSeal(list, 'seal-opening-' + o.id + '-top', 'Uszczelnienie nadproża ' + o.id, o.width, topPos, rotation, direction, parentId)
    addSeal(list, 'seal-opening-' + o.id + '-bottom', 'Uszczelnienie progu/parapetu ' + o.id, o.width, bottomPos, rotation, direction, parentId)
  }
}

function fastenerComponent(
  id: string,
  name: string,
  kind: NonNullable<ModelComponent['fastenerKind']>,
  position: Vec3,
  rotation: Vec3,
  direction: Vec3,
  stage: number,
  color: string,
  parentId?: string,
  assumptions: string[] = [],
): ModelComponent {
  const lengthMm = kind === 'panel-roof' ? 160 : kind === 'panel-wall' ? 140 : kind === 'anchor' ? 120 : 25
  return {
    id,
    positionNo: 0,
    namePL: name,
    category: 'fasteners',
    primitive: 'fastener',
    material:
      kind === 'rivet' ? 'Nit zrywalny Al/St' :
      kind === 'anchor' ? 'Kotwa/śruba konstrukcyjna' :
      'Wkręt samowiercący + podkładka EPDM',
    color,
    dimensions: { lengthMm, widthMm: 6.3, thicknessMm: 6.3 },
    quantity: 1,
    position,
    rotation,
    explodeDirection: direction,
    assemblyStage: stage,
    sourceAccuracy: 'assumption',
    assumptionCodes: assumptions,
    parentId,
    fastenerKind: kind,
  }
}

function addFasteners(list: ModelComponent[], c: PavilionConfig) {
  const wallPanels = list.filter((x) => x.category === 'wall-panels')
  for (const panel of wallPanels) {
    const normal = panel.wall ? wallNormal(panel.wall) : [0, 0, 1] as Vec3
    const h = panel.dimensions.lengthMm / 1000
    const w = panel.dimensions.widthMm / 1000
    const localOffsets = [
      [-w * 0.28, -h * 0.42],
      [w * 0.28, -h * 0.42],
      [-w * 0.28, h * 0.42],
      [w * 0.28, h * 0.42],
    ]
    localOffsets.forEach(([dx, dy], i) => {
      const side = panel.wall ?? 'front'
      let pos: Vec3
      if (side === 'front' || side === 'back') {
        pos = [panel.position[0] + (side === 'back' ? -dx : dx), panel.position[1] + dy, panel.position[2] + normal[2] * 0.065]
      } else {
        pos = [panel.position[0] + normal[0] * 0.065, panel.position[1] + dy, panel.position[2] + (side === 'left' ? dx : -dx)]
      }
      list.push(fastenerComponent(
        'screw-wall-' + panel.id + '-' + i,
        'Wkręt farmerski ścienny ' + panel.namePL,
        'panel-wall',
        pos,
        panel.rotation,
        [normal[0] * 2.0, 0.15, normal[2] * 2.0],
        10,
        c.exteriorColor,
        panel.id,
        ['A-WALL-FASTENERS'],
      ))
    })
  }

  const roofPanels = list.filter((x) => x.category === 'roof-panels')
  const supportCount = Math.max(2, Math.ceil(c.width / 1.5) + 1)
  for (const panel of roofPanels) {
    const x = panel.position[0]
    for (let s = 0; s < supportCount; s++) {
      const z = -c.width / 2 + (s * c.width) / Math.max(1, supportCount - 1)
      for (const dx of [-panel.dimensions.widthMm / 1000 * 0.25, panel.dimensions.widthMm / 1000 * 0.25]) {
        list.push(fastenerComponent(
          'screw-roof-' + panel.id + '-' + s + '-' + (dx > 0 ? 'r' : 'l'),
          'Wkręt farmerski dachowy ' + panel.namePL,
          'panel-roof',
          [x + dx, panel.position[1] + 0.08, z],
          [Math.PI / 2, 0, 0],
          [0, 2.3, 0],
          10,
          c.flashingColor,
          panel.id,
          ['A-ROOF-SUPPORTS'],
        ))
      }
    }
  }

  const flashings = list.filter((x) => x.category === 'flashings' && x.dimensions.lengthMm > 100)
  for (const fl of flashings) {
    const lengthM = fl.dimensions.lengthMm / 1000
    const count = Math.max(2, Math.ceil(lengthM / 0.30) + 1)
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1)
      const delta = (t - 0.5) * lengthM
      const pos: Vec3 = [...fl.position] as Vec3
      const longAlongX = Math.abs(Math.cos(fl.rotation[1])) > 0.7
      if (longAlongX) pos[0] += delta
      else pos[2] += delta
      list.push(fastenerComponent(
        'screw-fl-' + fl.id + '-' + i,
        'Wkręt/nit do obróbki ' + fl.namePL,
        i % 2 === 0 ? 'flashing' : 'rivet',
        pos,
        fl.rotation,
        [fl.explodeDirection[0] * 1.3, fl.explodeDirection[1] + 0.2, fl.explodeDirection[2] * 1.3],
        10,
        fl.color,
        fl.id,
        ['A-FLASHING-SCREWS'],
      ))
    }
  }

  const facadeParts = list.filter((x) =>
    x.category === 'decor' &&
    (x.id.startsWith('facade-cassette-') || x.id.startsWith('corner-cassette-') || x.id.startsWith('facade-ribbed-'))
  )
  for (const part of facadeParts) {
    const count = part.id.startsWith('facade-ribbed-') ? 6 : 4
    const normal = part.wall ? wallNormal(part.wall) : part.explodeDirection
    for (let i = 0; i < count; i++) {
      const sx = i % 2 === 0 ? -0.28 : 0.28
      const sy = i < 2 ? -0.28 : 0.28
      const pos: Vec3 = [
        part.position[0] + (part.wall === 'front' || part.wall === 'back' ? sx * part.dimensions.widthMm / 1000 : 0),
        part.position[1] + sy * part.dimensions.lengthMm / 1000,
        part.position[2] + (part.wall === 'left' || part.wall === 'right' ? sx * part.dimensions.widthMm / 1000 : 0),
      ]
      list.push(fastenerComponent(
        'cladding-fastener-' + part.id + '-' + i,
        'Łącznik okładziny — ' + part.namePL,
        'cladding',
        pos,
        part.rotation,
        [normal[0] * 1.5, 0.1, normal[2] * 1.5],
        10,
        part.color,
        part.id,
        ['A-CASSETTE-FASTENERS'],
      ))
    }
  }

  const frameParts = list.filter((x) => x.category === 'floor-frame' || x.category === 'corner-posts' || x.category === 'roof-beams')
  for (const part of frameParts.filter((_, i) => i % 2 === 0)) {
    list.push(fastenerComponent(
      'anchor-' + part.id,
      'Śruba/kotwa konstrukcyjna — ' + part.namePL,
      'anchor',
      part.position,
      part.rotation,
      [part.explodeDirection[0] * 1.8, part.explodeDirection[1] + 0.4, part.explodeDirection[2] * 1.8],
      3,
      '#9aa0a3',
      part.id,
      [],
    ))
  }
}

function addInstallations(list: ModelComponent[], c: PavilionConfig) {
  const y = PANEL_THICKNESS_M[c.floorPanel] + 0.45
  const pushInstall = (id: string, name: string, material: string, pos: Vec3, dims: ComponentDimensions, stage = 11) => {
    list.push({
      id,
      positionNo: 0,
      namePL: name,
      category: 'installations',
      primitive: 'installation',
      material,
      color: '#c07d32',
      dimensions: dims,
      quantity: 1,
      position: pos,
      rotation: [0, 0, 0],
      explodeDirection: [0, 0.4, -1.8],
      assemblyStage: stage,
      sourceAccuracy: 'assumption',
    })
  }

  if (c.electrical !== 'none') {
    if (c.distributionBoard) pushInstall('el-board', 'Rozdzielnica elektryczna', 'Tworzywo + aparatura', [-c.length / 2 + 0.30, y + 1.10, -c.width / 2 + 0.10], { lengthMm: 450, widthMm: 300, thicknessMm: 120 })
    for (let i = 0; i < c.doubleSockets; i++) pushInstall('el-socket-d-' + i, 'Gniazdo podwójne ' + (i + 1), 'Osprzęt elektryczny', [-c.length / 2 + 0.8 + i * 0.8, y, -c.width / 2 + 0.08], { lengthMm: 80, widthMm: 150, thicknessMm: 45 })
    for (let i = 0; i < c.singleSockets; i++) pushInstall('el-socket-s-' + i, 'Gniazdo pojedyncze ' + (i + 1), 'Osprzęt elektryczny', [c.length / 2 - 0.8 - i * 0.8, y, -c.width / 2 + 0.08], { lengthMm: 80, widthMm: 80, thicknessMm: 45 })
    for (let i = 0; i < c.ledCeiling; i++) pushInstall('el-led-' + i, 'Lampa LED sufitowa ' + (i + 1), 'Oprawa LED', [-c.length / 2 + ((i + 1) * c.length) / (c.ledCeiling + 1), c.frontHeight + PANEL_THICKNESS_M[c.floorPanel] - 0.08, 0], { lengthMm: 600, widthMm: 300, thicknessMm: 35 })
  }

  if (c.waterConnection) pushInstall('water-in', 'Przyłącze wody', 'PEX / PP', [c.length / 2 - 0.25, 0.25, -c.width / 2 + 0.10], { lengthMm: 500, widthMm: 25, thicknessMm: 25 })
  if (c.sewerConnection) pushInstall('sewer-out', 'Przyłącze kanalizacji', 'PVC', [c.length / 2 - 0.45, 0.12, -c.width / 2 + 0.15], { lengthMm: 500, widthMm: 110, thicknessMm: 110 })
  if (c.airConditioning) pushInstall('hvac-out', 'Agregat klimatyzacji ' + c.hvacPower.toFixed(1) + ' kW', 'HVAC', [c.length / 2 + 0.20, 0.58, -c.width / 2 + 0.58], { lengthMm: 700, widthMm: 500, thicknessMm: 220 })
}

function addInterior(list: ModelComponent[], c: PavilionConfig) {
  const floorArea = c.length * c.width
  list.push({
    id: 'finish-floor',
    positionNo: 0,
    namePL: 'Wykończenie podłogi ' + c.floorFinish,
    category: 'interior',
    primitive: 'interior',
    material: c.floorFinish === 'wood' ? 'Wykładzina/PVC drewnopodobne' : c.floorFinish,
    color: c.floorFinish === 'wood' ? '#80634b' : '#9a9995',
    dimensions: { lengthMm: Math.round(c.length * 1000), widthMm: Math.round(c.width * 1000), thicknessMm: 4, netAreaM2: round(floorArea) },
    quantity: 1,
    position: [0, PANEL_THICKNESS_M[c.floorPanel] + 0.004, 0],
    rotation: [0, 0, 0],
    explodeDirection: [0, -0.35, 0],
    assemblyStage: 12,
    sourceAccuracy: 'assumption',
  })
}

function assignPositionNumbers(components: ModelComponent[]) {
  let no = 10
  for (const component of components) {
    component.positionNo = no
    no += 10
  }
}

export function buildComponentModel(c: PavilionConfig): ComponentModel {
  const components: ModelComponent[] = []
  const g = geometryOf(c)
  addFoundationBlocks(components, c, g)
  addFloorFrame(components, c)
  addCornerPosts(components, c)
  addRoofStructure(components, c)
  addFloorPanels(components, c)
  addWallPanels(components, c, g)
  addRoofPanels(components, c)
  addFacadeCladding(components, c, g)
  addFlashings(components, c, g)
  addJoinery(components, c, g)
  addDecor(components, c, g)
  addSeals(components, c, g)
  addFasteners(components, c)
  addInstallations(components, c)
  addInterior(components, c)
  assignPositionNumbers(components)

  const { outerFront, outerBack, roofDepth } = envelope(c)
  const grossWallArea = c.length * (outerFront + outerBack) + 2 * c.width * ((outerFront + outerBack) / 2)
  const openingsArea = g.openings.reduce((sum, o) => sum + o.width * o.height, 0)
  const modeledWallPanelArea = components
    .filter((x) => x.category === 'wall-panels')
    .reduce((sum, x) => sum + (x.dimensions.netAreaM2 ?? 0), 0)
  const flashingLength = components
    .filter((x) => x.category === 'flashings')
    .reduce((sum, x) => sum + x.dimensions.lengthMm / 1000, 0)
  const fastenerCount = components.filter((x) => x.category === 'fasteners').length
  const facadeParts = components.filter((x) =>
    x.category === 'decor' &&
    (x.id.startsWith('facade-cassette-') || x.id.startsWith('corner-cassette-') || x.id.startsWith('facade-ribbed-'))
  )
  const cassetteParts = facadeParts.filter((x) => x.material === 'Kaseton elewacyjny stalowy' || x.material === 'Kaseton narożny L')
  const facadeCladdingArea = facadeParts.reduce((sum, x) => sum + (x.dimensions.netAreaM2 ?? 0), 0)
  const cassetteArea = cassetteParts.reduce((sum, x) => sum + (x.dimensions.netAreaM2 ?? 0), 0)

  return {
    components,
    assumptions: ASSUMPTIONS,
    metrics: {
      floorAreaM2: round(c.length * c.width),
      roofAreaM2: round(c.length * roofDepth),
      grossWallAreaM2: round(grossWallArea),
      openingsAreaM2: round(openingsArea),
      netWallAreaM2: round(Math.max(0, grossWallArea - openingsArea)),
      modeledWallPanelAreaM2: round(modeledWallPanelArea),
      flashingLengthM: round(flashingLength),
      fastenerCount,
      componentCount: components.length,
      facadeCladdingAreaM2: round(facadeCladdingArea),
      facadeCladdingCount: facadeParts.length,
      cassetteAreaM2: round(cassetteArea),
      cassetteCount: cassetteParts.length,
    },
  }
}

export function groupComponentsForBom(model: ComponentModel) {
  const groups = new Map<string, {
    category: ComponentCategory
    name: string
    material: string
    dimensions: string
    quantity: number
    massKg: number
    basis: 'dokładne' | 'szacunkowe'
  }>()

  for (const c of model.components) {
    const dims = c.dimensions.developedWidthMm
      ? c.dimensions.lengthMm + '×R' + c.dimensions.developedWidthMm + ' mm'
      : c.dimensions.lengthMm + '×' + c.dimensions.widthMm + '×' + c.dimensions.thicknessMm + ' mm'
    const key = [c.category, c.namePL.replace(/ \d+$/, ''), c.material, dims].join('|')
    const current = groups.get(key)
    if (current) {
      current.quantity += c.quantity
      current.massKg += c.massKg ?? 0
    } else {
      groups.set(key, {
        category: c.category,
        name: c.namePL.replace(/ \d+$/, ''),
        material: c.material,
        dimensions: dims,
        quantity: c.quantity,
        massKg: c.massKg ?? 0,
        basis: c.sourceAccuracy === 'exact' ? 'dokładne' : 'szacunkowe',
      })
    }
  }

  return [...groups.values()].map((g) => ({ ...g, massKg: round(g.massKg, 2) }))
}

export function componentModelToCsv(model: ComponentModel) {
  const header = [
    'poz', 'id', 'nazwa', 'kategoria', 'material', 'kolor', 'dl_mm', 'szer_mm', 'gr_mm',
    'rozwiniecie_mm', 'ilosc', 'masa_kg', 'etap', 'dokladnosc', 'zalozenia',
  ]
  const esc = (value: unknown) => '"' + String(value ?? '').replaceAll('"', '""') + '"'
  const rows = model.components.map((c) => [
    c.positionNo,
    c.id,
    c.namePL,
    c.category,
    c.material,
    c.color,
    c.dimensions.lengthMm,
    c.dimensions.widthMm,
    c.dimensions.thicknessMm,
    c.dimensions.developedWidthMm ?? '',
    c.quantity,
    c.massKg ?? '',
    c.assemblyStage,
    c.sourceAccuracy,
    (c.assumptionCodes ?? []).join(';'),
  ])
  return [header, ...rows].map((row) => row.map(esc).join(';')).join('\n')
}
