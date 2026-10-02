import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'

export function HQPathTracer({ enabled }: { enabled: boolean }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let animationFrame = 0
    let tracer: import('three-gpu-pathtracer').WebGLPathTracer | undefined

    const run = async () => {
      const { WebGLPathTracer } = await import('three-gpu-pathtracer')
      if (cancelled) return
      tracer = new WebGLPathTracer(gl)
      tracer.bounces = 4
      tracer.transmissiveBounces = 2
      tracer.renderDelay = 0
      tracer.fadeDuration = 0
      tracer.minSamples = 1
      tracer.dynamicLowRes = false
      tracer.renderScale = 0.50
      tracer.tiles.set(3, 3)
      tracer.setScene(scene, camera)

      const sample = () => {
        if (cancelled || !tracer) return
        tracer.renderSample()
        if (tracer.samples < 24) animationFrame = requestAnimationFrame(sample)
      }
      sample()
    }

    void run()
    return () => {
      cancelled = true
      cancelAnimationFrame(animationFrame)
      tracer?.dispose()
    }
  }, [enabled, gl, scene, camera])

  return null
}
