import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera } from 'three'
import type { WebGLPathTracer } from 'three-gpu-pathtracer'

export type HQState = {
  running: boolean
  /** Docelowa liczba próbek (po jej osiągnięciu render się zatrzymuje). */
  targetSamples: number
  /** Zmiana klucza = render od zera (np. po zmianie konfiguracji lub kadru). */
  resetKey: string
}

/**
 * Progresywny path tracer (three-gpu-pathtracer, ładowany dynamicznie).
 * Renderuje 1 próbkę na klatkę animacji, więc nie blokuje UI.
 * Scena jest ta sama co w widoku interaktywnym: model, HDRI, materiały i kamera.
 */
export function HQPathTracer({ state, onProgress }: { state: HQState; onProgress?: (samples: number, done: boolean) => void }) {
  const { gl, scene, camera } = useThree()
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)
  const tracerRef = useRef<WebGLPathTracer | null>(null)
  const frame = useRef(0)
  const stateRef = useRef(state)
  const progressRef = useRef(onProgress)

  useEffect(() => {
    stateRef.current = state
    progressRef.current = onProgress
  })

  // przygotowanie tracera — po wczytaniu sceny (komponent montuje się dopiero po Suspense HDRI)
  useEffect(() => {
    let cancelled = false
    const setup = async () => {
      const { WebGLPathTracer } = await import('three-gpu-pathtracer')
      if (cancelled) return
      // krótkie opóźnienie: Environment ustawia scene.environment, a płótno przyjmuje docelowy rozmiar
      await new Promise((resolve) => setTimeout(resolve, 250))
      if (cancelled) return
      const tracer = new WebGLPathTracer(gl)
      tracer.bounces = 5
      tracer.transmissiveBounces = 3
      tracer.filterGlossyFactor = 0.5
      tracer.renderDelay = 0
      tracer.fadeDuration = 0
      tracer.minSamples = 1
      tracer.dynamicLowRes = false
      tracer.renderScale = Math.min(1, 1.25 / Math.max(1, window.devicePixelRatio))
      tracer.tiles.set(2, 2)
      syncCamera()
      // przy frameloop="never" nikt nie przelicza macierzy świata — bez tego BVH tracera
      // powstaje z nieaktualnych pozycji obiektów (np. ściana frontowa w osi pawilonu)
      scene.updateMatrixWorld(true)
      tracer.setScene(scene, traceCamera)
      tracerRef.current = tracer
      loop()
    }

    // osobna kopia kamery z jawnym aspektem płótna — niezależna od wewnętrznej obsługi kamery R3F
    const traceCamera = new PerspectiveCamera()
    const syncCamera = () => {
      const source = camera as PerspectiveCamera
      traceCamera.position.copy(source.position)
      traceCamera.quaternion.copy(source.quaternion)
      traceCamera.fov = source.fov
      traceCamera.near = source.near
      traceCamera.far = source.far
      traceCamera.aspect = width / Math.max(1, height)
      traceCamera.updateProjectionMatrix()
      traceCamera.updateMatrixWorld(true)
    }
    let lastProjection = ''
    const loop = () => {
      if (cancelled) return
      const tracer = tracerRef.current
      const { running, targetSamples } = stateRef.current
      // projekcja kamery zmienia się po ustaleniu rozmiaru płótna — tracer musi ją przejąć,
      // inaczej HQ ma inny kadr niż podgląd interaktywny
      const projection = camera.projectionMatrix.elements.join(',') + '|' + camera.matrixWorld.elements.join(',')
      if (tracer && projection !== lastProjection) {
        lastProjection = projection
        syncCamera()
        tracer.setCamera(traceCamera)
        tracer.reset()
        progressRef.current?.(0, false)
      }
      if (tracer && running && tracer.samples < targetSamples) {
        tracer.renderSample()
        const samples = Math.floor(tracer.samples)
        progressRef.current?.(samples, samples >= targetSamples)
      }
      frame.current = requestAnimationFrame(loop)
    }

    void setup()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame.current)
      tracerRef.current?.dispose()
      tracerRef.current = null
    }
  // przebudowa tracera po zmianie rozmiaru płótna (bufor renderu musi mieć rozmiar płótna)
  }, [gl, scene, camera, width, height])

  // reset akumulacji przy zmianie kadru / konfiguracji
  useEffect(() => {
    const tracer = tracerRef.current
    if (!tracer) return
    tracer.reset()
    progressRef.current?.(0, false)
  }, [state.resetKey, scene, camera])

  return null
}
