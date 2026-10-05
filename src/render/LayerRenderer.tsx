import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { InstancedMesh, Mesh, Vector3 } from 'three'
import { LOD_DISTANCE, useQuality } from './quality'
import type { Part } from '../construction/types'
import { buildBatches, type Batch, type PartLook, type RenderLayer } from './layers'

function toObject(b: Batch) {
  let obj: Mesh
  if (b.kind === 'instanced') {
    const m = new InstancedMesh(b.geometry, b.look.material, b.matrices.length)
    b.matrices.forEach((mx, i) => m.setMatrixAt(i, mx))
    m.instanceMatrix.needsUpdate = true
    m.computeBoundingSphere()
    obj = m
  } else {
    obj = new Mesh(b.geometry, b.look.material)
  }
  obj.castShadow = b.look.castShadow
  obj.receiveShadow = b.look.receiveShadow ?? true
  obj.name = b.layer
  // identyfikatory części zostają przy siatce (diagnostyka, przyszłe zaznaczanie elementu)
  obj.userData = { renderLayer: b.layer, parts: b.parts }
  return obj
}

/**
 * Renderuje części modelu warstwami. Geometria przebudowywana tylko przy zmianie listy części (useMemo na `parts`).
 * LOD (E5): siatki z poziomem > 0 widoczne zależnie od odległości kamery (histereza LOD_DISTANCE) i limitu trybu jakości.
 */
export function LayerRenderer({ parts, lookOf, hidden }: { parts: Part[]; lookOf: (p: Part) => PartLook; hidden?: ReadonlySet<RenderLayer> }) {
  const batches = useMemo(() => buildBatches(parts, lookOf), [parts, lookOf])
  const objects = useMemo(() => batches.map(toObject), [batches])
  const quality = useQuality()
  useEffect(() => () => {
    batches.forEach((b) => b.geometry.dispose())
    objects.forEach((o) => { if (o instanceof InstancedMesh) o.dispose() })
  }, [batches, objects])
  // widoczność ustawiana tylko tutaj (nie propsem), żeby LOD i ukrywanie warstw się nie nadpisywały
  const lodShown = useMemo(() => batches.map(() => false), [batches])
  const center = useMemo(() => new Vector3(), [])
  useFrame(({ camera }) => {
    objects.forEach((o, i) => {
      const b = batches[i]
      let on = !hidden?.has(b.layer)
      if (b.lod > 0) {
        if (b.lod > quality.maxLod) lodShown[i] = false
        else {
          const sphere = o instanceof InstancedMesh ? o.boundingSphere : (b.geometry.boundingSphere ?? (b.geometry.computeBoundingSphere(), b.geometry.boundingSphere))
          const d = sphere ? Math.max(0, camera.position.distanceTo(center.copy(sphere.center)) - sphere.radius) : 0
          const th = LOD_DISTANCE[b.lod as 1 | 2]
          if (lodShown[i] && d > th.hide) lodShown[i] = false
          else if (!lodShown[i] && d < th.show) lodShown[i] = true
        }
        on = on && lodShown[i]
      }
      o.visible = on
    })
  })
  return (
    <group name="layer-renderer">
      {objects.map((o, i) => <primitive key={batches[i].key} object={o} />)}
    </group>
  )
}
