import { CanvasTexture, Matrix3, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three'

export const textureCache = new Map<string, CanvasTexture>()

export function woodTexture(kind: 'winchester' | 'palisander' | 'natural') {
  const key = 'wood-' + kind
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  const palette =
    kind === 'palisander'
      ? ['#473126', '#5b3c2b', '#38261f', '#6a4932']
      : kind === 'natural'
        ? ['#80634b', '#967154', '#70533e', '#a37b58']
        : ['#5f4938', '#73553f', '#4d3a2f', '#84624a']
  const grad = ctx.createLinearGradient(0, 0, 128, 0)
  palette.forEach((c, i) => grad.addColorStop(i / (palette.length - 1), c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 512)
  for (let y = 0; y < 512; y += 14) {
    ctx.strokeStyle = y % 28 === 0 ? 'rgba(45,25,14,.24)' : 'rgba(255,225,180,.13)'
    ctx.lineWidth = 1 + (y % 3) * 0.35
    ctx.beginPath()
    ctx.moveTo(0, y + Math.sin(y * 0.12) * 3)
    ctx.bezierCurveTo(32, y - 4, 86, y + 6, 128, y + Math.sin(y * 0.08) * 4)
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1, 1.5)
  textureCache.set(key, texture)
  return texture
}


export function glassReflectionTexture() {
  const key = 'glass-reflection-v2'
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined

  const sky = ctx.createLinearGradient(0, 0, 0, 512)
  sky.addColorStop(0, '#b8d0da')
  sky.addColorStop(0.48, '#dbe3df')
  sky.addColorStop(0.58, '#8ea48b')
  sky.addColorStop(1, '#6b706b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 512, 512)

  let seed = 42017
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.filter = 'blur(0.8px)'
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 540 - 14
    const trunkW = 1.5 + rnd() * 3.5
    const treeH = 110 + rnd() * 260
    const base = 335 + rnd() * 85
    ctx.strokeStyle = i % 3 === 0 ? '#31463b' : '#3a4f43'
    ctx.lineWidth = trunkW
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x + (rnd() - 0.5) * 14, base - treeH)
    ctx.stroke()
    const crownY = base - treeH * (0.68 + rnd() * 0.18)
    const branches = 3 + Math.floor(rnd() * 4)
    for (let b = 0; b < branches; b++) {
      const by = crownY + b * 18 + rnd() * 8
      const spread = 14 + rnd() * 28
      ctx.lineWidth = Math.max(0.8, trunkW * 0.45)
      ctx.beginPath()
      ctx.moveTo(x, by)
      ctx.lineTo(x - spread, by - 10 - rnd() * 16)
      ctx.moveTo(x, by)
      ctx.lineTo(x + spread * 0.8, by - 12 - rnd() * 14)
      ctx.stroke()
    }
  }
  ctx.restore()

  const horizon = ctx.createLinearGradient(0, 290, 0, 430)
  horizon.addColorStop(0, 'rgba(240,244,238,.18)')
  horizon.addColorStop(1, 'rgba(70,76,72,.28)')
  ctx.fillStyle = horizon
  ctx.fillRect(0, 290, 512, 150)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.1, 1)
  textureCache.set(key, texture)
  return texture
}


/**
 * Kolor blachy do renderu. Przy oświetleniu HDRI używamy prawdziwego koloru RAL —
 * bez rozjaśniania, żeby RAL 7016 był neutralnym antracytem (wcześniej #545c61 dawał stalowy, niebieski ton).
 */
export function renderMetalColor(color: string) {
  return color
}

/** Rozmiar fizyczny kafla tekstury drewna [m] (public/textures/wood, scripts/gen-wood-textures.py). */
const WOOD_TILE_M: Record<WoodKind, number> = { pine: 0.6, winchester: 0.6, floor: 1.0, pineBoards: 1.04, winchesterBoards: 1.04 }
export type WoodKind = 'pine' | 'winchester' | 'floor' | 'pineBoards' | 'winchesterBoards'
const WOOD_FILE: Record<WoodKind, string> = { pine: 'pine', winchester: 'winchester', floor: 'floor_oak', pineBoards: 'pine_boards', winchesterBoards: 'winchester_boards' }
const woodLoader = new TextureLoader()
const woodBase = new Map<string, Texture>()
const woodClones = new Map<string, WoodMaps>()
export type WoodMaps = { map: Texture; normalMap: Texture; roughnessMap: Texture }

const woodPending = new Map<string, Texture[]>()

function woodFile(kind: WoodKind, channel: 'diff' | 'nor' | 'rough') {
  const key = kind + '-' + channel
  let t = woodBase.get(key)
  if (!t) {
    woodPending.set(key, [])
    // klony utworzone przed wczytaniem obrazu trzeba oznaczyć do ponownego wysłania na GPU
    t = woodLoader.load('./textures/wood/' + WOOD_FILE[kind] + '_' + channel + '.jpg', () => {
      for (const c of woodPending.get(key) ?? []) c.needsUpdate = true
      woodPending.delete(key)
    })
    t.wrapS = RepeatWrapping
    t.wrapT = RepeatWrapping
    t.anisotropy = 8
    if (channel === 'diff') t.colorSpace = SRGBColorSpace
    woodBase.set(key, t)
  }
  return t
}

/**
 * Tekstury drewna w skali rzeczywistej dla elementu o wymiarach w × h [m].
 * UV brył (RoundedBox, ExtrudeGeometry) są w metrach lica, więc powtórzenie = 1 / rozmiar kafla.
 * Włókna biegną wzdłuż dłuższego boku (deska pozioma — wzdłuż x, lamela — wzdłuż y);
 * przesunięcie zależne od wymiarów, żeby sąsiednie elementy nie miały identycznego rysunku.
 */
/** Parametry rysunku drewna dla elementu w × h (jak klon tekstury w woodMaps): powtórzenie, przesunięcie, obrót. */
function woodUvParams(kind: WoodKind, w: number, h: number) {
  const tile = WOOD_TILE_M[kind]
  const horizontal = w > h
  const key = kind + '|' + horizontal + '|' + Math.round(w * 1000) + '|' + Math.round(h * 1000)
  let hsh = 0
  for (const ch of key) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0
  return { key, repeat: 1 / tile, offset: [(hsh % 97) / 97, (hsh % 89) / 89] as const, horizontal }
}

export function woodMaps(kind: WoodKind, w: number, h: number): WoodMaps {
  const pr = woodUvParams(kind, w, h)
  const hit = woodClones.get(pr.key)
  if (hit) return hit
  const make = (channel: 'diff' | 'nor' | 'rough') => {
    const t = woodFile(kind, channel).clone()
    woodPending.get(kind + '-' + channel)?.push(t)
    t.repeat.set(pr.repeat, pr.repeat)
    t.offset.set(pr.offset[0], pr.offset[1])
    if (pr.horizontal) {
      t.center.set(0.5, 0.5)
      t.rotation = Math.PI / 2
    }
    t.needsUpdate = true
    return t
  }
  const maps = { map: make('diff'), normalMap: make('nor'), roughnessMap: make('rough') }
  woodClones.set(pr.key, maps)
  return maps
}

/** Wspólne tekstury drewna bez przekształcenia — rysunek elementu wypalony w UV geometrii (scalanie siatek, E2). */
export function woodSharedMaps(kind: WoodKind): WoodMaps {
  return { map: woodFile(kind, 'diff'), normalMap: woodFile(kind, 'nor'), roughnessMap: woodFile(kind, 'rough') }
}

/**
 * Przekształcenie UV [m] lica elementu w × h (s, y od lewego dolnego narożnika) → UV tekstury, identyczne z woodMaps
 * na licu boxa (UV lica 0..1 = s / w, y / h). Wynik: [a, b, c, d, e, f] dla RunGeometry.uvTransform.
 */
export function woodUvTransform(kind: WoodKind, w: number, h: number): [number, number, number, number, number, number] {
  const pr = woodUvParams(kind, w, h)
  const m = new Matrix3().setUvTransform(pr.offset[0], pr.offset[1], pr.repeat, pr.repeat, pr.horizontal ? Math.PI / 2 : 0, pr.horizontal ? 0.5 : 0, pr.horizontal ? 0.5 : 0)
  const e = m.elements // kolumnowo: [m00, m10, 0, m01, m11, 0, m02, m12, 1]
  return [e[0] / w, e[3] / h, e[6], e[1] / w, e[4] / h, e[7]]
}

/**
 * Kaseton-deska: lico tacy z dekorem desek poziomych (deska 130 mm, fuga 2 mm — zdjęcie 163). Tekstura bez obrotu
 * (deski i włókna już poziomo), skala rzeczywista; fugi liczone od dołu tacy.
 */
/** `centerAbove` — wysokość środka kawałka tacy nad dołem pola okładziny [m]: fugi ciągłe między kawałkami (nad/pod oknem). */
export function boardCassetteMaps(kind: 'pineBoards' | 'winchesterBoards', w: number, h: number, centerAbove = h / 2): WoodMaps {
  const tile = WOOD_TILE_M[kind]
  const key = 'cass|' + kind + '|' + Math.round(w * 1000) + '|' + Math.round(h * 1000) + '|' + Math.round(centerAbove * 1000)
  const hit = woodClones.get(key)
  if (hit) return hit
  let hsh = 0
  for (const ch of key) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0
  const make = (channel: 'diff' | 'nor' | 'rough') => {
    const t = woodFile(kind, channel).clone()
    woodPending.get(kind + '-' + channel)?.push(t)
    // UV w metrach, środek lica = 0 (RoundedBox wyśrodkowany): rysunek liczony od dołu pola okładziny
    t.repeat.set(1 / tile, 1 / tile)
    t.offset.set((hsh % 97) / 97, (centerAbove / tile) % 1)
    t.needsUpdate = true
    return t
  }
  const maps = { map: make('diff'), normalMap: make('nor'), roughnessMap: make('rough') }
  woodClones.set(key, maps)
  return maps
}
