import { useCallback, useMemo } from 'react'
import type { ModelComponent } from '../../components'
import { foundationBlocks, boardTraySources } from '../../construction/facade/boards'
import { boxPart, cornerCavitySheets } from '../../construction/facade/corners'
import { isTrayCassette, trayParts, traySourceFromComponent, trayWood, type TraySource } from '../../construction/facade/tray'
import type { Part } from '../../construction/types'
import { arch } from '../../render/architecture'
import { LayerRenderer } from '../../render/LayerRenderer'
import type { PartLook } from '../../render/layers'
import { cassetteSteelMaterial, concreteBlockMaterial, cornerCavityMaterial, trayWoodMaterial } from '../../render/materials'
import { PANEL_THICKNESS_M, type PavilionConfig, type ProjectGeometry } from '../../types'
import { envelope } from '../geometry'
import { useLighting } from '../environment/lighting'
import { facadeKindForWall } from './facadeKind'

/**
 * Części pochodne modelu komponentów (układ elewacji i posadowienia — to samo źródło co BOM) w rendererze warstw:
 * tace kasetonów (E2) z blachami wnęki narożnika, tace kasetonu-deski, podkładki fundamentowe. Cechy włącza preset (render/architecture.ts).
 */
export function ComponentLayers({ config, geometry, components }: { config: PavilionConfig; geometry: ProjectGeometry; components: ModelComponent[] }) {
  const features = arch(config)
  const parts = useMemo(() => {
    const sources: TraySource[] = []
    if (features.cassetteTrays) sources.push(...components.filter(isTrayCassette).map(traySourceFromComponent))
    if (features.boardTrays) sources.push(...boardTraySources(config, geometry, envelope(config).floorT, PANEL_THICKNESS_M[config.wallPanel]))
    const out: Part[] = trayParts(sources, (wall) => (wall === 'front' || wall === 'back' ? config.length / 2 : config.width / 2))
    if (features.cassetteTrays) {
      const isCH = (side: Parameters<typeof facadeKindForWall>[0]) => facadeKindForWall(side, config, geometry) === 'cassette-horizontal'
      for (const c of cornerCavitySheets(config, isCH)) {
        out.push(boxPart({ id: c.id, name: 'Blacha wnęki narożnika', layer: 'decor', stage: 10, material: 'flashing', color: config.exteriorColor,
          explode: [0, 0, 0], confidence: 'LOW' }, c.center, c.size))
      }
    }
    if (features.foundationParts) {
      for (const b of foundationBlocks(components, geometry)) {
        out.push(boxPart({ id: b.id, name: 'Bloczek betonowy posadowienia', layer: 'foundation', stage: 1, material: 'concrete', color: '#888983',
          explode: [0, -1, 0], confidence: 'LOW' }, b.center, b.size))
      }
    }
    return out
  }, [components, config, geometry, features.cassetteTrays, features.boardTrays, features.foundationParts])

  const woodTint = useLighting().woodTint
  const lookOf = useCallback((p: Part): PartLook => {
    if (p.material === 'concrete') return { material: concreteBlockMaterial(), castShadow: true }
    if (p.material === 'flashing') return { material: cornerCavityMaterial(p.color), castShadow: true }
    const shaded = !!p.geometry.shade
    const wood = trayWood(p.color)
    if (wood) return { material: trayWoodMaterial(wood, shaded, woodTint), castShadow: true }
    return { material: cassetteSteelMaterial(p.color, shaded), castShadow: true }
  }, [woodTint])
  if (!parts.length) return null
  return <LayerRenderer parts={parts} lookOf={lookOf} />
}
