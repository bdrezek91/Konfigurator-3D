import { useCallback, useMemo } from 'react'
import type { ModelComponent } from '../../components'
import { foundationBlocks, boardTraySources } from '../../construction/facade/boards'
import { isTrayCassette, trayParts, traySourceFromComponent, trayWood, type TraySource } from '../../construction/facade/tray'
import type { Part } from '../../construction/types'
import { arch } from '../../render/architecture'
import { LayerRenderer } from '../../render/LayerRenderer'
import type { PartLook } from '../../render/layers'
import { cassetteSteelMaterial, concreteBlockMaterial, trayWoodMaterial } from '../../render/materials'
import { PANEL_THICKNESS_M, type PavilionConfig, type ProjectGeometry } from '../../types'
import { envelope } from '../geometry'

/**
 * Części pochodne modelu komponentów (układ elewacji i posadowienia — to samo źródło co BOM) w rendererze warstw:
 * tace kasetonów (E2), tace kasetonu-deski, podkładki fundamentowe. Cechy włącza preset (render/architecture.ts).
 */
export function ComponentLayers({ config, geometry, components }: { config: PavilionConfig; geometry: ProjectGeometry; components: ModelComponent[] }) {
  const features = arch(config)
  const parts = useMemo(() => {
    const sources: TraySource[] = []
    if (features.cassetteTrays) sources.push(...components.filter(isTrayCassette).map(traySourceFromComponent))
    if (features.boardTrays) sources.push(...boardTraySources(config, geometry, envelope(config).floorT, PANEL_THICKNESS_M[config.wallPanel]))
    const out: Part[] = trayParts(sources, (wall) => (wall === 'front' || wall === 'back' ? config.length / 2 : config.width / 2))
    if (features.foundationParts) {
      for (const b of foundationBlocks(components, geometry)) {
        const [cx, cy, cz] = b.center
        const [sx, sy, sz] = b.size
        out.push({
          id: b.id, name: 'Bloczek betonowy posadowienia', layer: 'foundation', stage: 1, material: 'concrete', color: '#888983',
          explode: [0, -1, 0], confidence: 'LOW',
          geometry: { start: [cx - sx / 2, cy - sy / 2, cz - sz / 2], axis: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], length: sy, section: [[0, 0], [sx, 0], [sx, sz], [0, sz]] },
        })
      }
    }
    return out
  }, [components, config, geometry, features.cassetteTrays, features.boardTrays, features.foundationParts])

  const lookOf = useCallback((p: Part): PartLook => {
    if (p.material === 'concrete') return { material: concreteBlockMaterial(), castShadow: true }
    const shaded = !!p.geometry.shade
    const wood = trayWood(p.color)
    if (wood) return { material: trayWoodMaterial(wood, shaded), castShadow: true }
    return { material: cassetteSteelMaterial(p.color, shaded), castShadow: true }
  }, [])
  if (!parts.length) return null
  return <LayerRenderer parts={parts} lookOf={lookOf} />
}
