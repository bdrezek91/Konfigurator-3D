import { CameraControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import type { CameraPose } from './presets'

export type SavedView = CameraPose

export type CameraApi = {
  /** Płynne przejście do zadanego kadru. */
  goTo: (pose: CameraPose, animate?: boolean) => void
  /** Aktualny kadr (pozycja, target, FOV) — do zapisu widoku. */
  current: () => SavedView
}

/**
 * Kamera konfiguratora: CameraControls z płynnymi przejściami między widokami
 * (bez przemontowywania sceny) oraz płynną zmianą FOV.
 */
export function CameraRig({
  pose,
  poseKey,
  apiRef,
  enabled = true,
}: {
  pose: CameraPose
  /** Zmiana klucza = przejście do `pose` (np. zmiana widoku albo "reset kamery"). */
  poseKey: string
  apiRef?: RefObject<CameraApi | null>
  enabled?: boolean
}) {
  const controls = useRef<CameraControls>(null)
  const camera = useThree((state) => state.camera) as PerspectiveCamera
  const targetFov = useRef(pose.fov)
  const first = useRef(true)

  const goTo = (next: CameraPose, animate = true) => {
    targetFov.current = next.fov
    controls.current?.setLookAt(...next.position, ...next.target, animate)
  }

  useEffect(() => {
    const animate = !first.current
    first.current = false
    if (!animate) {
      camera.fov = pose.fov
      camera.updateProjectionMatrix()
    }
    goTo(pose, animate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey])

  useEffect(() => {
    const api: CameraApi = {
      goTo,
      current: () => {
        const p = new Vector3()
        const t = new Vector3()
        controls.current?.getPosition(p)
        controls.current?.getTarget(t)
        return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z], fov: camera.fov }
      },
    }
    if (apiRef) apiRef.current = api
    // uchwyt diagnostyczny dla testów wizualnych (Playwright)
    const root = window as typeof window & { __DAMPOL3D_CAMERA__?: CameraApi; __DAMPOL3D_VIEW_CAMERA__?: PerspectiveCamera }
    root.__DAMPOL3D_CAMERA__ = api
    root.__DAMPOL3D_VIEW_CAMERA__ = camera
    return () => {
      if (apiRef) apiRef.current = null
      delete root.__DAMPOL3D_CAMERA__
    }
  })

  useFrame((_, delta) => {
    const diff = targetFov.current - camera.fov
    if (Math.abs(diff) > 0.01) {
      camera.fov += diff * Math.min(1, delta * 6)
      camera.updateProjectionMatrix()
    }
  })

  return (
    <CameraControls
      ref={controls}
      makeDefault
      enabled={enabled}
      minDistance={2}
      maxDistance={40}
      minPolarAngle={Math.PI * 0.12}
      // > 90°: pozwala patrzeć lekko w górę z niskiej kamery (kadr galerii-03 z wysokości 0,45 m)
      maxPolarAngle={Math.PI * 0.58}
      smoothTime={0.45}
      draggingSmoothTime={0.12}
      dollySpeed={0.6}
    />
  )
}
