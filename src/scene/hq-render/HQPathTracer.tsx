import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
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
      // jedna klatka opóźnienia, żeby Environment zdążył ustawić scene.environment
      await new Promise((resolve) => requestAnimationFrame(resolve))
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
      tracer.setScene(scene, camera)
      tracerRef.current = tracer
      loop()
    }

    const loop = () => {
      if (cancelled) return
      const tracer = tracerRef.current
      const { running, targetSamples } = stateRef.current
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
  }, [gl, scene, camera])

  // reset akumulacji przy zmianie kadru / konfiguracji
  useEffect(() => {
    const tracer = tracerRef.current
    if (!tracer) return
    tracer.setScene(scene, camera)
    tracer.reset()
    progressRef.current?.(0, false)
  }, [state.resetKey, scene, camera])

  return null
}
