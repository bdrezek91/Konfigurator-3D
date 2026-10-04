import { useEffect, useMemo } from 'react'
import { InstancedMesh, Mesh } from 'three'
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
 */
export function LayerRenderer({ parts, lookOf, hidden }: { parts: Part[]; lookOf: (p: Part) => PartLook; hidden?: ReadonlySet<RenderLayer> }) {
  const batches = useMemo(() => buildBatches(parts, lookOf), [parts, lookOf])
  const objects = useMemo(() => batches.map(toObject), [batches])
  useEffect(() => () => {
    batches.forEach((b) => b.geometry.dispose())
    objects.forEach((o) => { if (o instanceof InstancedMesh) o.dispose() })
  }, [batches, objects])
  return (
    <group name="layer-renderer">
      {objects.map((o, i) => <primitive key={batches[i].key} object={o} visible={!hidden?.has(batches[i].layer)} />)}
    </group>
  )
}
