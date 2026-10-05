import { geometryOf, type ComponentModel } from '../components'
import type { BomRow } from '../logic'
import { formatPLN } from '../pricing'
import { envelope, openingSill } from '../scene/geometry'
import { OPENING_KIND_LABELS, WALL_LABELS } from './configState'
import type { PavilionConfig, WallSide } from '../types'

/**
 * P12 — arkusz dla klienta (druk / PDF z przeglądarki, bez dodatkowych bibliotek): strona 1 — render, parametry, cena;
 * strona 2 — elewacje 4 ścian z wymiarami (SVG, z modelu: obrys ściany, otwory, pola okładzin); strona 3 — zestawienie.
 * Elewacja oglądana z zewnątrz: oś x ściany rośnie w prawo (zgodnie z wallPosition), wysokość od spodu ramy.
 */
type Sheet = {
  config: PavilionConfig
  model: ComponentModel
  bom: BomRow[]
  title: string
  image?: string
  facadeName: string
  constructionName: string
  price?: { net: number; vat: number; missing: number; lines: number }
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
const mm = (m: number) => Math.round(m * 1000)

function wallHeight(config: PavilionConfig, side: WallSide, x: number) {
  const { outerFront, outerBack } = envelope(config)
  if (side === 'front') return outerFront
  if (side === 'back') return outerBack
  const t = Math.max(0, Math.min(1, (x + config.width / 2) / config.width))
  // lewa: lokalne +x → przód; prawa: lokalne +x → tył
  return side === 'left' ? outerBack + (outerFront - outerBack) * t : outerFront + (outerBack - outerFront) * t
}

function elevationSvg(config: PavilionConfig, side: WallSide) {
  const g = geometryOf(config)
  const { floorT } = envelope(config)
  const span = side === 'front' || side === 'back' ? config.length : config.width
  const half = span / 2
  const hL = wallHeight(config, side, -half)
  const hR = wallHeight(config, side, half)
  const H = Math.max(hL, hR)
  // skala: rysunek w polu 460 × 230 px
  const pad = 46
  const k = Math.min(460 / span, 230 / H)
  const X = (x: number) => pad + (x + half) * k
  const Y = (y: number) => pad + (H - y) * k
  const W = 460 + pad * 2
  const Hh = H * k + pad * 2 + 30
  const out: string[] = []
  out.push(`<polygon points="${X(-half)},${Y(0)} ${X(half)},${Y(0)} ${X(half)},${Y(hR)} ${X(-half)},${Y(hL)}" class="wall"/>`)
  for (const d of g.decor.filter((x) => x.wall === side && x.kind !== 'led-strip')) {
    const y0 = d.yCenter - d.height / 2
    out.push(`<rect x="${X(d.center - d.width / 2)}" y="${Y(y0 + d.height)}" width="${d.width * k}" height="${d.height * k}" class="decor"/>`)
  }
  const ops = g.openings.filter((o) => o.wall === side).sort((a, b) => a.center - b.center)
  ops.forEach((o, i) => {
    const y0 = floorT + openingSill(o)
    const x0 = X(o.center - o.width / 2)
    out.push(`<rect x="${x0}" y="${Y(y0 + o.height)}" width="${o.width * k}" height="${o.height * k}" class="opening"/>`)
    out.push(`<text x="${x0 + (o.width * k) / 2}" y="${Y(y0 + o.height / 2)}" class="lbl">${esc(o.id)}</text>`)
    out.push(`<text x="${x0 + (o.width * k) / 2}" y="${Y(y0 + o.height / 2) + 12}" class="lbl small">${mm(o.width)}×${mm(o.height)}</text>`)
    // wymiar położenia: od lewego narożnika do lewej krawędzi otworu (linia pod rysunkiem, rzędy na przemian)
    const yd = Y(0) + 14 + (i % 2) * 11
    out.push(`<line x1="${X(-half)}" y1="${yd}" x2="${x0}" y2="${yd}" class="dim"/><text x="${(X(-half) + x0) / 2}" y="${yd - 2}" class="dimt">${mm(o.center - o.width / 2 + half)}</text>`)
  })
  // wymiary całkowite: długość i wysokość
  out.push(`<line x1="${X(-half)}" y1="${pad - 16}" x2="${X(half)}" y2="${pad - 16}" class="dim"/><text x="${(X(-half) + X(half)) / 2}" y="${pad - 20}" class="dimt">${mm(span)}</text>`)
  out.push(`<line x1="${pad - 16}" y1="${Y(0)}" x2="${pad - 16}" y2="${Y(hL)}" class="dim"/><text x="${pad - 20}" y="${(Y(0) + Y(hL)) / 2}" class="dimt" transform="rotate(-90 ${pad - 20} ${(Y(0) + Y(hL)) / 2})">${mm(hL)}</text>`)
  if (Math.abs(hR - hL) > 0.002) {
    out.push(`<line x1="${X(half) + 16}" y1="${Y(0)}" x2="${X(half) + 16}" y2="${Y(hR)}" class="dim"/><text x="${X(half) + 26}" y="${(Y(0) + Y(hR)) / 2}" class="dimt" transform="rotate(-90 ${X(half) + 26} ${(Y(0) + Y(hR)) / 2})">${mm(hR)}</text>`)
  }
  return `<figure><figcaption>${esc(WALL_LABELS[side])}</figcaption><svg viewBox="0 0 ${W} ${Hh}" xmlns="http://www.w3.org/2000/svg">${out.join('')}</svg></figure>`
}

export function openPrintSheet(s: Sheet) {
  const c = s.config
  const g = geometryOf(c)
  const { outerFront } = envelope(c)
  const date = new Date().toLocaleDateString('pl-PL')
  const openings = g.openings.map((o) => `<tr><td>${esc(o.id)}</td><td>${esc(OPENING_KIND_LABELS[o.kind])}</td><td>${esc(WALL_LABELS[o.wall])}</td><td>${mm(o.width)} × ${mm(o.height)}</td></tr>`).join('')
  const bomRows = s.bom.map((r) => `<tr><td>${esc(r.item)}</td><td class="num">${esc(r.quantity)}</td></tr>`).join('')
  const price = s.price && s.price.missing < s.price.lines
    ? `<p class="price">Cena netto: <b>${formatPLN(s.price.net)}</b> · brutto: <b>${formatPLN(s.price.net * (1 + s.price.vat))}</b>${s.price.missing ? ` <small>(bez ${s.price.missing} poz. cennika)</small>` : ''}</p>`
    : ''
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${esc(s.title)} — DAMPOL</title>
<style>
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { font: 11px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1b1e20; margin: 0; }
.page { page-break-after: always; min-height: 180mm; }
.page:last-child { page-break-after: auto; }
header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1b1e20; padding-bottom: 6px; margin-bottom: 10px; }
header h1 { font-size: 18px; margin: 0; letter-spacing: 0.06em; }
header span { color: #5b6266; }
.cover { display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; }
.cover img { width: 100%; border-radius: 6px; border: 1px solid #d5d9dc; }
dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0; }
dt { color: #5b6266; } dd { margin: 0; font-weight: 600; }
.price { font-size: 13px; margin-top: 12px; }
.elev { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; }
.elev svg { max-height: 74mm; }
figure { margin: 0; } figcaption { font-weight: 700; margin-bottom: 2px; }
svg { width: 100%; height: auto; }
.wall { fill: #eef0f1; stroke: #1b1e20; stroke-width: 1.2; }
.opening { fill: #cfe0e8; stroke: #1b1e20; stroke-width: 1; }
.decor { fill: #e8d4b8; stroke: #8a6a45; stroke-width: 0.8; stroke-dasharray: 3 2; }
.lbl { font-size: 9px; text-anchor: middle; } .small { font-size: 8px; fill: #5b6266; }
.dim { stroke: #5b6266; stroke-width: 0.7; } .dimt { font-size: 8px; text-anchor: middle; fill: #1b1e20; }
table { width: 100%; border-collapse: collapse; font-size: 10px; }
td, th { border-bottom: 1px solid #e1e4e6; padding: 3px 4px; text-align: left; } .num { text-align: right; white-space: nowrap; }
.cols { columns: 2; column-gap: 18px; }
.note { color: #5b6266; font-size: 9px; margin-top: 8px; }
@media screen { body { background: #f3f5f6; } .page { background: #fff; max-width: 277mm; margin: 12px auto; padding: 12mm; box-shadow: 0 2px 10px rgba(0,0,0,.08); } .print { position: fixed; top: 12px; right: 12px; padding: 8px 14px; font: 600 13px system-ui; border: 0; border-radius: 8px; background: #1b1e20; color: #fff; cursor: pointer; } }
@media print { .print { display: none; } }
</style></head><body>
<button class="print" onclick="window.print()">Drukuj / zapisz PDF</button>
<section class="page">
  <header><h1>DAMPOL · ${esc(s.title)}</h1><span>${date}</span></header>
  <div class="cover">
    ${s.image ? `<img src="${s.image}" alt="Wizualizacja pawilonu"/>` : '<div></div>'}
    <div>
      <dl>
        <dt>Wymiary ramy</dt><dd>${mm(c.length)} × ${mm(c.width)} mm</dd>
        <dt>Wysokość zewnętrzna</dt><dd>${mm(outerFront)} mm</dd>
        <dt>Wysokość w świetle</dt><dd>${mm(c.frontHeight)} / ${mm(c.backHeight)} mm (przód / tył)</dd>
        <dt>Powierzchnia</dt><dd>${(c.length * c.width).toFixed(2)} m²</dd>
        <dt>Konstrukcja</dt><dd>${esc(s.constructionName)}</dd>
        <dt>Elewacja</dt><dd>${esc(s.facadeName)}</dd>
        <dt>Płyty</dt><dd>ściany ${esc(c.wallPanel)}, dach ${esc(c.roofPanel)}, podłoga ${esc(c.floorPanel)}</dd>
        <dt>Kolor elewacji</dt><dd>${esc(c.exteriorColor)}</dd>
      </dl>
      ${price}
      <h3>Stolarka</h3>
      <table><thead><tr><th>Poz.</th><th>Rodzaj</th><th>Ściana</th><th>Wymiar [mm]</th></tr></thead><tbody>${openings}</tbody></table>
    </div>
  </div>
  <p class="note">Wizualizacja i wymiary z modelu konfiguratora. Wymiary otworów — w świetle ościeża; położenie — od lewego narożnika ściany oglądanej z zewnątrz. Elementy oznaczone w zestawieniu jako „szacunkowe” wymagają potwierdzenia projektem wykonawczym.</p>
</section>
<section class="page">
  <header><h1>Elewacje</h1><span>wymiary w mm</span></header>
  <div class="elev">${(['front', 'back', 'left', 'right'] as WallSide[]).map((w) => elevationSvg(c, w)).join('')}</div>
</section>
<section class="page">
  <header><h1>Zestawienie materiałów</h1><span>${s.model.components.length} elementów</span></header>
  <div class="cols"><table><tbody>${bomRows}</tbody></table></div>
</section>
</body></html>`
  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
