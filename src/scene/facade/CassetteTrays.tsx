import { useCallback, useEffect, useMemo } from 'react'
import { MeshStandardMaterial, type Material } from 'three'
import type { ModelComponent } from '../../components'
import { trayParts, trayWood } from '../../construction/facade/tray'
import type { Part } from '../../construction/types'
import { RENDER } from '../../physical/spec'
import { LayerRenderer } from '../../render/LayerRenderer'
import type { PartLook } from '../../render/layers'
import type { PavilionConfig } from '../../types'
import { renderMetalColor, woodSharedMaps } from '../materials/textures'

/**
 * Kasetony jako tace (E2, PoC galeria-207): części z construction/facade/tray.ts przez renderer warstw (FACADE).
 * Materiały jak dotychczasowe kasetony (Box): blacha mat z RENDER.flashingMatt*, kaseton-deska — te same tekstury drewna;
 * dochodzą tylko kolory wierzchołków (cień w fudze).
 */
export function CassetteTrays({ config, cassettes }: { config: PavilionConfig; cassettes: ModelComponent[] }) {
  const parts = useMemo(
    () => trayParts(cassettes, (wall) => (wall === 'front' || wall === 'back' ? config.length / 2 : config.width / 2)),
    [cassettes, config.length, config.width],
  )
  const mats = useMemo(() => {
    const cache = new Map<string, Material>()
    const get = (key: string, make: () => Material) => {
      let mat = cache.get(key)
      if (!mat) cache.set(key, (mat = make()))
      return mat
    }
    return { cache, get }
  }, [])
  useEffect(() => () => mats.cache.forEach((m) => m.dispose()), [mats])

  const lookOf = useCallback((p: Part): PartLook => {
    const shaded = !!p.geometry.shade
    const wood = p.color.startsWith('wood-') ? trayWood({ color: p.color } as ModelComponent) : null
    if (wood) {
      return {
        castShadow: true,
        material: mats.get('wood' + wood + shaded, () => {
          const m = new MeshStandardMaterial({ color: '#ffffff', metalness: 0.02, roughness: 0.6, vertexColors: shaded, ...woodSharedMaps(wood) })
          m.normalScale.set(0.22, 0.22) // jak Box (primitives.tsx)
          return m
        }),
      }
    }
    const color = renderMetalColor(p.color)
    return {
      castShadow: true,
      material: mats.get('steel' + color + shaded + p.material, () => new MeshStandardMaterial({
        color, metalness: RENDER.flashingMattMetalness.value, roughness: RENDER.flashingMattRoughness.value, vertexColors: shaded,
      })),
    }
  }, [mats])
  return <LayerRenderer parts={parts} lookOf={lookOf} />
}
