import type { ModelComponent } from '../../components'
import { CASSETTE_TRAY as T } from '../../profiles/cassette-tray'
import { cassetteReturn, toMeters } from '../../profiles/sections'
import { woodUvTransform } from '../../scene/materials/textures'
import { ProfileAssembler, type Rect, type WallPlane } from '../assembly'
import type { Part, Vec3 } from '../types'

/**
 * KASETON JAKO TACA (E2): kasetony z modelu komponentów (układ KASETONY FINAL — moduły, fugi, narożniki bez zmian) →
 * części modelu: pierścień boków z uciosem 45° (obrzeże, bok, gięcie R) + lico. Obrys tacy = obrys dotychczasowego kasetonu.
 * Cień w zagłębieniu fugi — kolor wierzchołków boku (geometria), nie przyciemniony materiał.
 */
const mm = (x: number) => x / 1000

export const isTrayCassette = (c: ModelComponent) => c.id.startsWith('facade-cassette-')

/** Źródło tacy: obrys (środek, obrót wokół Y, wymiary w, h, głębokość) + kolor i rysunek drewna. */
export type TraySource = {
  id: string
  position: Vec3
  rotation: Vec3
  sizeM: [number, number, number]
  explodeDirection: Vec3
  wall?: string
  /** RAL blachy albo 'wood-pine' | 'wood-winchester' | 'wood-pineBoards' | 'wood-winchesterBoards' */
  color: string
  uvTransform?: [number, number, number, number, number, number]
}

export type TrayWood = 'pine' | 'winchester' | 'pineBoards' | 'winchesterBoards'

/** Kolor tacy → rodzaj drewna albo blacha. */
export function trayWood(color: string): TrayWood | null {
  if (!color.startsWith('wood-')) return null
  const k = color.slice(5)
  return k === 'winchester' || k === 'pineBoards' || k === 'winchesterBoards' ? k : 'pine'
}

/** Kaseton z modelu komponentów (układ KASETONY FINAL) → źródło tacy; rysunek drewna jak dotychczasowy box. */
export function traySourceFromComponent(c: ModelComponent): TraySource {
  const w = c.dimensions.widthMm / 1000
  const h = c.dimensions.lengthMm / 1000
  const wood = trayWood(c.color)
  return {
    id: c.id, position: c.position, rotation: c.rotation, sizeM: [w, h, c.dimensions.thicknessMm / 1000], explodeDirection: c.explodeDirection,
    wall: c.wall, color: c.color, uvTransform: wood === 'pine' || wood === 'winchester' ? woodUvTransform(wood, w, h) : undefined,
  }
}

export function trayParts(cassettes: TraySource[], halfSpan: (wall: string) => number): Part[] {
  const out: Part[] = []
  const D = mm(T.depth)
  const t = mm(T.sheet)
  const R = mm(T.bendRadius)
  for (const c of cassettes) {
    const [w, h, depth] = c.sizeM
    const th = c.rotation[1]
    const u: Vec3 = [Math.cos(th), 0, -Math.sin(th)]
    const outN: Vec3 = [Math.sin(th), 0, Math.cos(th)]
    const [px, py, pz] = c.position
    const origin: Vec3 = [px - u[0] * w / 2 - outN[0] * depth / 2, py - h / 2, pz - u[2] * w / 2 - outN[2] * depth / 2]
    const plane: WallPlane = { origin, u, up: [0, 1, 0], out: outN, stage: 10, explode: c.explodeDirection }
    const asm = new ProfileAssembler(plane, (id, name, material, color, geometry) => ({
      id: c.id + '-' + id, name, layer: 'decor', stage: 10, material, color, explode: c.explodeDirection, confidence: 'LOW', geometry,
      lod: material === 'screw' ? 2 : 0,
    }))
    // obrzeże w fugę tylko poza narożnikiem (kaseton zawinięty przez narożnik — obrzeże sterczałoby poza róg)
    const along = u[0] * px + u[2] * pz
    const cornerEnd = c.wall ? Math.abs(along) + w / 2 > halfSpan(c.wall) - 0.03 : true
    const flangeOut = T.flangeOut && !cornerEnd
    const uv = c.uvTransform
    const sec = cassetteReturn(T, flangeOut)
    const profile = { name: 'Bok tacy kasetonu', poly: toMeters(sec.poly), material: 'cassette' as const, color: c.color }
    const r: Rect = { s0: 0, s1: w, y0: 0, y1: h }
    // cień: od płyty (v = 0) do gięcia; lico bez przyciemnienia
    const shade = { v0: 0, v1: D * 0.9, min: T.shadeMin }
    asm.ring('return', r, () => profile, { l: 1, r: 1, t: 1, b: 1 }, 0, { extras: () => ({ shade, uvTransform: uv }) })
    asm.box('face', 'Lico kasetonu', 'cassette', c.color, { s0: R, s1: w - R, y0: R, y1: h - R }, D - t, D, { shade: { v0: -1, v1: 0, min: 1 }, uvTransform: uv })
    if (flangeOut) {
      // wkręty w obrzeżu górnym i dolnym (widoczne w fudze poziomej)
      const fl = mm(T.flange)
      const n = Math.max(2, Math.round(w / mm(T.screwSpacing)) + 1)
      const head = mm(T.screwHead) / 2
      for (const [k, yc] of [['b', -fl / 2], ['t', h + fl / 2]] as const) {
        for (let i = 0; i < n; i++) {
          const sc = 0.06 + (w - 0.12) * (n === 1 ? 0.5 : i / (n - 1))
          asm.box('screw-' + k + i, 'Wkręt obrzeża kasetonu', 'screw', c.color, { s0: sc - head, s1: sc + head, y0: yc - head, y1: yc + head }, t, t + mm(T.screwHeight))
        }
      }
    }
    out.push(...asm.parts)
  }
  return out
}
