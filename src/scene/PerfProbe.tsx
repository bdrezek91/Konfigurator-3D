import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'

/**
 * P14 — pomiar wydajności na urządzeniu (`?perf=1`): FPS, czas klatki (mediana, p95 z ostatnich 10 s), draw calls i trójkąty
 * pełnej klatki (cień + AO + obraz + postprocessing), GPU (WEBGL_debug_renderer_info), tryb jakości i DPR.
 * Wynik raz na sekundę do `onStats` — nakładka w Pavilion3D, przycisk „Kopiuj wynik” (JSON do raportu).
 */
export type PerfStats = {
  fps: number; frameP50: number; frameP95: number; calls: number; triangles: number; gpu: string; dpr: number; textures: number; geometries: number
}

export function PerfProbe({ onStats }: { onStats: (s: PerfStats) => void }) {
  const get = useThree((s) => s.get)
  const times = useRef<number[]>([])
  const last = useRef(0)
  const lastReport = useRef(0)
  const frames = useRef(0)
  const full = useRef({ calls: 0, triangles: 0 })
  const gpu = useRef('')

  // pełna klatka (cień + AO + obraz + postprocessing): ten sam pomiar co testy (__DAMPOL3D_FRAME_STATS__), raz na sekundę
  useEffect(() => {
    const id = window.setInterval(() => {
      const f = (window as typeof window & { __DAMPOL3D_FRAME_STATS__?: () => Promise<Record<string, number>> }).__DAMPOL3D_FRAME_STATS__
      void f?.().then((r) => { full.current = { calls: r.calls, triangles: r.triangles } })
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const ctx = get().gl.getContext()
    const ext = ctx.getExtension('WEBGL_debug_renderer_info')
    gpu.current = ext ? String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : String(ctx.getParameter(ctx.RENDERER))
  }, [get])

  useFrame((state) => {
    const gl = state.gl
    const now = performance.now()
    if (last.current) {
      times.current.push(now - last.current)
      if (times.current.length > 600) times.current.shift()
    }
    last.current = now
    frames.current++
    if (now - lastReport.current >= 1000) {
      const sorted = [...times.current].sort((a, b) => a - b)
      const q = (p: number) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : 0)
      onStats({
        fps: Math.round((frames.current * 1000) / (now - (lastReport.current || now - 1000))),
        frameP50: Math.round(q(0.5) * 10) / 10, frameP95: Math.round(q(0.95) * 10) / 10,
        calls: full.current.calls, triangles: full.current.triangles, gpu: gpu.current, dpr: gl.getPixelRatio(),
        textures: gl.info.memory.textures, geometries: gl.info.memory.geometries,
      })
      frames.current = 0
      lastReport.current = now
    }
  })
  return null
}
