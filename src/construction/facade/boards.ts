import type { ModelComponent } from '../../components'
import { m, PHYS } from '../../physical/spec'
import { openingSill, wallTransform } from '../../scene/geometry'
import { boardCassetteUvTransform } from '../../scene/materials/textures'
import type { DecorPlacement, OpeningPlacement, PavilionConfig, ProjectGeometry, WallSide } from '../../types'
import type { TraySource } from './tray'
import { facadeKindForWall } from '../../scene/facade/facadeKind'

/**
 * KASETON-DESKA (pasy dekoru na gołej płycie, zdjęcie 163): pola tacy = prostokąt okładziny minus otwory (pionowe pasy między
 * krawędziami otworów). Jedna funkcja dla starej ścieżki (DecorLocal) i nowej (tace E2 w rendererze warstw).
 * Współrzędne lokalne ściany (jak w komponencie Wall): x wzdłuż ściany, y od gruntu ramy (z floorOffset).
 */
export type BoardSpan = { a: number; b: number; sa: number; sb: number }

export const BOARD_TRAY_KINDS = new Set(['board-natural', 'board-horizontal-winchester'])

export function boardTraySpans(segment: DecorPlacement, openings: OpeningPlacement[], floorOffset: number): BoardSpan[] {
  const x0 = segment.center - segment.width / 2
  const y0 = segment.yCenter - segment.height / 2
  const x1 = x0 + segment.width
  const yTop = y0 + segment.height
  const ops = openings
    .map((o) => ({ a: o.center - o.width / 2, b: o.center + o.width / 2, y0: floorOffset + openingSill(o), y1: floorOffset + openingSill(o) + o.height }))
    .filter((o) => o.b > x0 && o.a < x1)
  const xs = [...new Set([x0, x1, ...ops.flatMap((o) => [Math.max(x0, o.a), Math.min(x1, o.b)])])].sort((p, q) => p - q)
  const out: BoardSpan[] = []
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i]
    const b = xs[i + 1]
    if (b - a < 0.03) continue
    const mid = (a + b) / 2
    const blocked = ops.filter((o) => o.a < mid && o.b > mid).sort((p, q) => p.y0 - q.y0)
    let cursor = y0
    for (const o of blocked) {
      if (o.y0 - cursor > 0.04) out.push({ a, b, sa: cursor, sb: Math.min(o.y0, yTop) })
      cursor = Math.max(cursor, o.y1)
    }
    if (yTop - cursor > 0.04) out.push({ a, b, sa: cursor, sb: yTop })
  }
  return out
}

/** Promień zaokrąglenia dawnego RoundedBox pasa — przesunięcie UV lica (drei: UV = współrzędne kształtu od −r). */
const LEGACY_ROUND_R = 0.003

/**
 * Pasy kasetonu-deski jako źródła tac: ta sama poza co Wall + DecorLocal (oś ściany), rysunek desek jak dotychczas
 * (boardCassetteMaps), wypalony w UV. Układ jak elewacja z modelu komponentów — w grupie z prześwitem pod ramą
 * (ProjectPavilion), więc bez dodawania prześwitu.
 */
export function boardTraySources(config: PavilionConfig, geometry: ProjectGeometry, floorOffset: number, wallDepth: number): TraySource[] {
  const tray = m(PHYS.cassette.thickness)
  const out: TraySource[] = []
  for (const side of ['front', 'back', 'left', 'right'] as WallSide[]) {
    const t = wallTransform(side, config)
    const th = t.rotation[1]
    // ściana z kasetonami poziomymi: deska to kasetony z dekorem drewna (tace z modelu komponentów) — tu bez pasów
    if (facadeKindForWall(side, config, geometry) === 'cassette-horizontal') continue
    const openings = geometry.openings.filter((o) => o.wall === side)
    for (const d of geometry.decor.filter((x) => x.wall === side && BOARD_TRAY_KINDS.has(x.kind))) {
      const kind = d.kind === 'board-horizontal-winchester' ? 'winchesterBoards' : 'pineBoards'
      const y0 = d.yCenter - d.height / 2
      const x0 = d.center - d.width / 2
      // skos boku (wedge): pole dzielone na pasy co deskę, każdy pas skrócony do linii skosu na górze pasa (deski cięte schodkowo)
      const wedge = d.shape === 'wedge-left' || d.shape === 'wedge-right'
      const pitch = m(PHYS.board.height) + m(PHYS.board.gap)
      const pieces = boardTraySpans(d, openings, floorOffset).flatMap((sp) => {
        if (!wedge) return [sp]
        const out2: BoardSpan[] = []
        for (let ya = sp.sa; ya < sp.sb - 0.02; ya += pitch) {
          const yb = Math.min(sp.sb, ya + pitch)
          const ry = Math.min(1, (yb - y0) / d.height)
          const lim = d.shape === 'wedge-left' ? { a: x0, b: x0 + (1 - ry) * d.width } : { a: x0 + ry * d.width, b: x0 + d.width }
          const a = Math.max(sp.a, lim.a)
          const b = Math.min(sp.b, lim.b)
          if (b - a > 0.03) out2.push({ a, b, sa: ya, sb: yb })
        }
        return out2
      })
      pieces.forEach((s, k) => {
        const w = s.b - s.a
        const h = s.sb - s.sa
        // środek pola w układzie ściany → świat (Wall: obrót wokół Y + pozycja osi ściany, grupa: prześwit)
        const lx = (s.a + s.b) / 2
        const ly = (s.sa + s.sb) / 2
        const lz = wallDepth / 2 + tray / 2
        out.push({
          id: 'board-tray-' + d.id + '-' + k,
          position: [t.position[0] + lx * Math.cos(th) + lz * Math.sin(th), ly, t.position[2] - lx * Math.sin(th) + lz * Math.cos(th)],
          rotation: [0, th, 0],
          sizeM: [w, h, tray],
          explodeDirection: [Math.sin(th) * 1.4, 0.1, Math.cos(th) * 1.4],
          wall: side,
          color: 'wood-' + kind,
          uvTransform: boardCassetteUvTransform(kind, w, h, ly - y0, LEGACY_ROUND_R),
        })
      })
    }
  }
  return out
}

/**
 * Podkładki fundamentowe z modelu komponentów (BOM) → części. Pozycja komponentu jest w układzie od spodu ramy (y = −prześwit/2),
 * a renderer elewacji leży w grupie przesuniętej o prześwit — pozycja bez zmian.
 */
export function foundationBlocks(components: ModelComponent[], geometry: ProjectGeometry) {
  const gap = geometry.foundationGap ?? m(PHYS.base.groundGap)
  // jak dotychczasowy FoundationSupports: przy prześwicie < 15 mm podkładek nie widać (BOM bez zmian)
  if (gap < 0.015) return []
  return components.filter((c) => c.id.startsWith('foundation-block-')).map((c) => ({
    id: c.id,
    center: [c.position[0], c.position[1], c.position[2]] as [number, number, number],
    size: [c.dimensions.lengthMm / 1000, gap, c.dimensions.widthMm / 1000] as [number, number, number],
  }))
}
