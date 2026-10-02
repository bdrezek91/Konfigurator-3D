import type { DecorPlacement, LightPlacement, OpeningPlacement, ProjectGeometry, WallSide } from './types'

const o = (
  id: string,
  wall: WallSide,
  center: number,
  width: number,
  height: number,
  kind: OpeningPlacement['kind'],
  extra: Partial<OpeningPlacement> = {},
): OpeningPlacement => ({
  id, wall, center, width, height, sill: kind.startsWith('door-') ? 0 : 0.08, kind,
  glazing: 'double', frameColor: '#17191b', sourceAccuracy: 'drawing-estimate', ...extra,
})

const d = (
  id: string,
  wall: WallSide,
  center: number,
  width: number,
  yCenter: number,
  height: number,
  kind: DecorPlacement['kind'],
  extra: Partial<DecorPlacement> = {},
): DecorPlacement => ({ id, wall, center, width, yCenter, height, kind, sourceAccuracy: 'drawing-estimate', ...extra })

const light = (wall: WallSide, center: number, y = 2.52): LightPlacement => ({ wall, center, y })

const g = (
  openings: OpeningPlacement[],
  decor: DecorPlacement[] = [],
  exteriorLights: LightPlacement[] = [],
  notes: string[] = [],
): ProjectGeometry => ({ externalHeight: 2.86, openings, decor, exteriorLights, notes })

export const PROJECT_GEOMETRIES: Record<string, ProjectGeometry> = {
  'GALERIA/03': {
    // Geometria z rektyfikacji zdjęcia 03 (punkty zbiegu + prostokąt fasady, skala: okładzina 0,03–2,82 m).
    // Szczegóły i dokładność: reference/gallery/POMIARY.md.
    externalHeight: 2.82,
    foundationGap: 0.03,
    roofEdgeFlashing: false,
    facadeCladding: {
      front: {
        kind: 'cassette-horizontal',
        color: '#383E42',
        gap: 0.015,
        bandHeight: 0.23,
        atticRowHeight: 0.35,
        moduleWidth: 1.20,
        staggered: false,
      },
    },
    openings: [
      o('G03-FIX-L','front',-2.313,1.044,2.01,'fixed-glass',{sill:0,frameColor:'#383E42',profile:'alu-slim'}),
      o('G03-DOOR','front',-1.362,0.858,2.01,'door-glazed',{sill:0,frameColor:'#383E42',profile:'alu-slim',hinge:'left',handle:'bar'}),
      o('G03-FIX-R','front',-0.362,1.143,2.01,'fixed-glass',{sill:0,frameColor:'#383E42',profile:'alu-slim'}),
    ],
    decor: [
      d('gallery03-lamella','front',1.779,2.27,1.073,2.066,'lamella-winchester'),
    ],
    exteriorLights: [],
    notes: [
      'Pomiar fotogrametryczny zdjęcia 03: fasada ≈ 6,67 m, 9 pasów kasetonów ≈ 0,23 m, attyka 2 × 0,35 m.',
      'Przeszklenie 3 pola: 1,04 / 0,86 (drzwi, zawiasy lewe) / 1,14 m, od 0,50 m od lewego końca; lamele 2,27 m.',
      'Dokładność ±3% (zakładana wysokość okładziny 2,79 m).',
    ],
  },
  '722/08/26': g(
    [
      o('W2','front',-0.75,0.97,2.00,'fixed-glass',{roller:true}),
      o('D1','front',0.75,1.08,2.10,'door-glazed',{roller:true}),
      o('WC','back',2.25,0.50,0.50,'pvc-window',{sill:1.45,frameColor:'#5b6266'}),
    ],
    [
      d('top','front',0,6.03,2.64,0.42,'cassette-rect-graphite'),
      d('win-l','front',-2.38,1.05,1.31,2.28,'cassette-winchester'),
      d('win-r','front',2.38,1.05,1.31,2.28,'cassette-winchester'),
      d('left-edge','left',1.10,0.72,1.31,2.28,'cassette-winchester'),
      d('right-edge','right',-1.10,0.72,1.31,2.28,'cassette-winchester'),
    ],
    [light('front',-2.45), light('front',2.45)],
    ['Front: 1 szyba 97x200 + drzwi 108x210; pozycje osiowe odtworzone z elewacji, bez pełnego wymiarowania.'],
  ),
  '81/08/26': g(
    [
      o('D1','front',-0.85,2.00,2.10,'door-double'),
      o('W1','front',1.05,0.97,2.10,'alu-window'),
      o('WL','left',0,0.97,2.10,'alu-window'),
      o('WR','right',0,0.97,2.10,'alu-window'),
    ],
    [
      d('front-win','front',0,9.03,1.50,2.90,'lamella-winchester'),
      d('left-win','left',0,2.96,1.50,2.90,'lamella-winchester'),
      d('right-win','right',0,2.96,1.50,2.90,'lamella-winchester'),
    ],
    [],
    ['Pełna konstrukcja 100x100 jest w projekcie opisana jako biała; otwory mają rozmieszczenie odtworzone z odręcznego rysunku.'],
  ),

  '24/08/26': g(
    [
      o('W1','front',-1.55,0.97,2.00,'fixed-glass'),
      o('D1','front',0,1.08,2.10,'door-glazed'),
      o('W2','front',1.55,0.97,2.00,'fixed-glass'),
      o('WC','back',2.65,0.50,0.50,'pvc-window',{sill:1.45}),
    ],
    [
      d('top','front',0,8.03,2.72,0.42,'cassette-square-graphite'),
      d('wood-l','front',-3.25,1.20,1.45,2.80,'board-natural'),
      d('wood-r','front',3.25,1.20,1.45,2.80,'board-natural'),
    ],
    [],
    ['Projekt pokazuje naturalną deskę, nie lamele Winchester.'],
  ),

  '120/08/26': g(
    [
      o('F1','front',-1.02,0.97,2.10,'fixed-glass'),
      o('F2','front',0,0.97,2.10,'fixed-glass'),
      o('D1','front',1.025,1.08,2.10,'door-glazed'),
    ],
    [
      d('top','front',0,6.03,2.72,0.42,'cassette-square-graphite'),
      d('lam-l','front',-2.25,0.90,1.45,2.80,'lamella-winchester'),
      d('lam-r','front',2.25,0.90,1.45,2.80,'lamella-winchester'),
    ],
    [],
    ['Zestaw frontowy ALU ok. 305x210: FIX + FIX + drzwi.'],
  ),

  '82/08/26': g(
    [
      o('F1','front',-1.00,0.97,2.00,'fixed-glass'),
      o('D1','front',0,1.08,2.10,'door-glazed'),
      o('F2','front',1.00,0.97,2.00,'fixed-glass'),
    ],
    [
      d('top','front',0,4.03,2.64,0.42,'cassette-square-graphite'),
      d('snake-l','front',-1.64,0.50,1.31,2.28,'snake-winchester'),
      d('snake-r','front',1.64,0.50,1.31,2.28,'snake-winchester'),
    ],
    [],
    ['Położenie trzech modułów frontowych odtworzone z wizualizacji; brak pełnego wymiarowania osi.'],
  ),

  '09/09/26': g(
    [
      o('D1','right',0,1.08,2.10,'door-full',{frameColor:'#111315'}),
    ],
    [],
    [],
    ['Jedne pełne czarne drzwi ALU na prawej elewacji; front i lewy bok bez stolarki.'],
  ),
  '13/08/26': g(
    [
      o('D1','front',-1.05,1.08,2.10,'door-glazed',{roller:true}),
      o('F1','front',0.05,0.97,2.10,'fixed-glass',{roller:true}),
      o('W2','front',1.10,0.97,2.10,'alu-window'),
      o('W3','left',0,0.97,0.97,'pvc-window',{sill:1.10,frameColor:'#111315'}),
      o('W4','right',0,0.50,0.50,'pvc-window',{sill:1.45,frameColor:'#111315'}),
    ],
    [
      d('front-wedge','front',-2.25,4.50,1.31,2.28,'lamella-winchester',{shape:'wedge-left'}),
      d('front-top','front',1.85,5.30,2.64,0.34,'lamella-winchester'),
      d('left-top','left',0,2.96,2.64,0.34,'lamella-winchester'),
      d('led-front','front',0,8.60,2.43,0.04,'led-strip'),
      d('led-left','left',0,2.60,2.43,0.04,'led-strip'),
    ],
    [],
    ['Stolarka frontowa jest zestawem ok. 300x210; układ modułów odtworzony z elewacji.'],
  ),

  '94/08/26': g(
    [
      o('F1','front',-1.12,0.97,2.00,'fixed-glass',{roller:true}),
      o('D1','front',0,1.08,2.10,'door-glazed',{roller:true}),
      o('F2','front',1.12,0.97,2.00,'fixed-glass',{roller:true}),
      o('Wside','left',0,0.97,0.97,'pvc-window',{sill:1.12,roller:true}),
      o('Wwc','back',2.15,0.50,0.50,'pvc-window',{sill:1.45}),
    ],
    [
      d('top','front',0,7.03,2.72,0.42,'cassette-square-graphite'),
      d('silver-l','front',-2.85,0.95,1.45,2.80,'silver-rect'),
      d('silver-r','front',2.85,0.95,1.45,2.80,'silver-rect'),
      d('silver-side','left',1.00,0.80,1.45,2.80,'silver-rect'),
    ],
    [],
    ['Projekt ma 4 rolety i 3 piloty; osobne okna PVC 97x97 i 50x50.'],
  ),

  '120/07/26': g(
    [
      o('W3','front',-1.15,0.97,2.00,'fixed-glass'),
      o('D1','front',0,1.08,2.10,'door-glazed'),
      o('W1','front',1.15,0.97,2.00,'fixed-glass'),
      o('W2','left',0,0.97,0.97,'pvc-window',{sill:1.08,frameColor:'#5a6165'}),
    ],
    [
      d('top','front',0,6.01,2.64,0.42,'cassette-winchester'),
      d('edge-l','front',-2.72,0.55,1.31,2.28,'cassette-winchester'),
      d('edge-r','front',2.72,0.55,1.31,2.28,'cassette-winchester'),
      d('grafit-l','front',-2.12,0.52,1.31,2.28,'lamella-graphite'),
      d('grafit-r','front',2.12,0.52,1.31,2.28,'lamella-graphite'),
      d('left-top','left',0,2.96,2.64,0.42,'cassette-winchester'),
      d('left-edge-a','left',-1.18,0.55,1.31,2.28,'cassette-winchester'),
      d('left-edge-b','left',1.18,0.55,1.31,2.28,'cassette-winchester'),
      d('right-top','right',0,2.96,2.64,0.42,'cassette-winchester'),
      d('right-edge-a','right',-1.18,0.55,1.31,2.28,'cassette-winchester'),
      d('right-edge-b','right',1.18,0.55,1.31,2.28,'cassette-winchester'),
    ],
    [light('front',-2.45), light('front',2.45)],
    ['Front: 2 szyby 97x200 + drzwi 108x210; lewy bok: PVC 97x97.'],
  ),
  '49/08/26': g(
    [
      o('RU-L','front',-2.0,0.97,2.10,'alu-window'),
      o('FIX-L','front',-1.0,0.97,2.10,'fixed-glass'),
      o('D1','front',0,1.08,2.10,'door-glazed'),
      o('FIX-R','front',1.0,0.97,2.10,'fixed-glass'),
      o('RU-R','front',2.0,0.97,2.10,'alu-window'),
      o('SIDE','right',0,2.00,2.10,'fixed-glass'),
    ],
    [
      d('top','front',0,9.03,2.64,0.42,'cassette-black'),
      d('front-black-l','front',-4.05,0.55,1.31,2.28,'lamella-black'),
      d('front-pal-l','front',-3.55,0.34,1.31,2.28,'lamella-palisander'),
      d('front-pal-r','front',3.55,0.34,1.31,2.28,'lamella-palisander'),
      d('front-black-r','front',4.05,0.55,1.31,2.28,'lamella-black'),
      d('right-black-l','right',-1.18,0.42,1.31,2.28,'lamella-black'),
      d('right-pal-l','right',-0.82,0.24,1.31,2.28,'lamella-palisander'),
      d('right-pal-r','right',0.82,0.24,1.31,2.28,'lamella-palisander'),
      d('right-black-r','right',1.18,0.42,1.31,2.28,'lamella-black'),
    ],
    [light('front',-3.6), light('front',0), light('front',3.6)],
    ['Front glazing 500x210: drzwi + 2 FIX + 2 RU. Bok: stałe ALU 200x210.'],
  ),

  '114/08/26': g(
    [
      o('F1','front',-1.10,0.97,2.00,'fixed-glass'),
      o('D1','front',0,1.08,2.10,'door-glazed'),
      o('F2','front',1.10,0.97,2.00,'fixed-glass'),
      o('W3','left',0,0.97,2.00,'fixed-glass',{frameColor:'#111315',sourceAccuracy:'drawing-estimate'}),
      o('WC','right',0.35,0.50,0.50,'pvc-window',{sill:1.45,frameColor:'#111315',sourceAccuracy:'dimensioned'}),
    ],
    [
      d('front-wedge','front',-2.35,3.90,1.31,2.28,'lamella-winchester',{shape:'wedge-left'}),
      d('front-top','front',0,7.03,2.64,0.34,'lamella-winchester'),
    ],
    [],
    ['Projekt: lamele Winchester tylko na froncie; toaleta z oknem 50x50.'],
  ),

  '109/08/26': g(
    [
      o('F1','front',-1.08,0.97,2.00,'fixed-glass'),
      o('D1','front',0,1.08,2.10,'door-glazed'),
      o('F2','front',1.08,0.97,2.00,'fixed-glass'),
      o('WC','back',2.15,0.50,0.50,'pvc-window',{sill:1.45}),
    ],
    [
      d('top','front',0,6.03,2.64,0.42,'cassette-square-graphite'),
      d('snake','front',-2.05,1.85,1.31,2.28,'snake-winchester'),
    ],
    [],
    ['WC 120x120 z oknem 50x50; dodatkowy punkt wodny pod przyszły aneks.'],
  ),

  '28/03/26': g(
    [
      o('D1','front',-2.05,1.08,2.10,'door-glazed'),
      o('F1','front',-0.98,0.97,2.10,'fixed-glass'),
      o('F2','front',0.02,0.97,2.10,'fixed-glass'),
      o('D2','front',2.65,1.08,2.10,'door-glazed'),
      o('Wside','left',0,0.97,2.10,'alu-window'),
    ],
    [
      d('top','front',0,9.03,2.64,0.42,'cassette-black'),
      d('front-pal-l','front',-4.05,0.34,1.31,2.28,'lamella-palisander'),
      d('front-black-l','front',-3.62,0.52,1.31,2.28,'lamella-black'),
      d('front-black-mid','front',0.95,0.42,1.31,2.28,'lamella-black'),
      d('front-pal-mid','front',1.55,0.72,1.31,2.28,'lamella-palisander'),
      d('front-black-r','front',3.72,0.55,1.31,2.28,'lamella-black'),
      d('left-black-a','left',-1.18,0.42,1.31,2.28,'lamella-black'),
      d('left-pal-a','left',-0.82,0.24,1.31,2.28,'lamella-palisander'),
      d('left-pal-b','left',0.82,0.24,1.31,2.28,'lamella-palisander'),
      d('left-black-b','left',1.18,0.42,1.31,2.28,'lamella-black'),
    ],
    [light('front',-3.6), light('front',-1.2), light('front',1.2), light('left',0)],
    ['Rysunek wskazuje zestaw ALU 350x210 oraz dodatkowe drzwi 108x210; pozycje osiowe odtworzone z elewacji.'],
  ),

  '104/01/26': g(
    [
      o('FIX-L','front',-2.55,1.00,2.10,'fixed-glass',{glazing:'triple'}),
      o('RU-L','front',-1.42,0.86,2.10,'alu-window',{glazing:'triple'}),
      o('D1','front',0.05,2.00,2.10,'door-double',{glazing:'triple'}),
      o('FIX-R','front',1.70,1.00,2.10,'fixed-glass',{glazing:'triple'}),
      o('RU-SIDE','left',0,0.86,2.10,'alu-window',{glazing:'triple',sourceAccuracy:'dimensioned'}),
    ],
    [
      d('front-cass','front',0,7.03,1.50,2.90,'cassette-black'),
      d('left-cass','left',0,2.96,1.50,2.90,'cassette-black'),
      d('right-cass','right',0,2.96,1.50,2.90,'cassette-black'),
      d('back-cass','back',0,7.03,1.50,2.90,'cassette-black'),
    ],
    [light('front',-2.7), light('front',2.7)],
    ['Kaseton czarny mat 70x70 na 4 stronach; 3-szybowa stolarka; pozycje z rysunku producenta SMART.'],
  ),
}
