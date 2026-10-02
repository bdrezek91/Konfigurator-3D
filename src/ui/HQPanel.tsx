import { useRef, useState } from 'react'
import Pavilion3D, { type CameraPose, type HQState, type LightingMode } from '../scene/Pavilion3D'
import type { PavilionConfig } from '../types'
import { Icon } from './icons'

const TARGETS = [64, 256, 1024]

/**
 * Render HQ (path tracing) z ustalonego kadru. Ten sam model, HDRI i materiały co podgląd.
 * Próbki liczone progresywnie po 1 na klatkę — UI pozostaje responsywne.
 */
export function HQPanel({
  config, pose, lighting, onClose, compact = false,
}: {
  config: PavilionConfig
  pose: CameraPose
  lighting: LightingMode
  onClose?: () => void
  compact?: boolean
}) {
  const host = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState(256)
  // w trybie porównania HQ startuje na żądanie, żeby nie obciążać GPU dwoma rendererami naraz
  const [running, setRunning] = useState(!compact)
  const [resetKey, setResetKey] = useState(0)
  const [samples, setSamples] = useState(0)
  const state: HQState = { running, targetSamples: target, resetKey: String(resetKey) + '|' + target }
  const progress = Math.min(1, samples / target)
  const done = samples >= target

  const savePng = () => {
    const canvas = host.current?.querySelector('canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'dampol-' + config.project.replaceAll('/', '-') + '-hq-' + samples + 'spp.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className={'hq-panel' + (compact ? ' compact' : '')}>
      <div className="hq-canvas" ref={host}>
        <Pavilion3D config={config} lighting={lighting} hq={{ pose, state, onProgress: (s) => setSamples(s) }} />
        {samples === 0 && (
          <div className="hq-wait">
            {running ? 'Przygotowanie sceny HQ…' : <button type="button" className="btn primary" onClick={() => setRunning(true)}><Icon.play /> Start renderu HQ</button>}
          </div>
        )}
      </div>
      <div className="hq-bar">
        <div className="hq-progress">
          <div className="hq-progress-track"><span style={{ width: progress * 100 + '%' }} /></div>
          <small>{done ? 'Gotowe' : running ? 'Renderowanie' : 'Wstrzymano'} · {samples}/{target} próbek</small>
        </div>
        <div className="hq-actions">
          {!compact && (
            <div className="segmented sm">
              {TARGETS.map((t) => (
                <button key={t} type="button" className={t === target ? 'on' : ''} onClick={() => { setTarget(t); setRunning(true) }}>{t}</button>
              ))}
            </div>
          )}
          <button type="button" className="icon-btn" title={running ? 'Wstrzymaj' : 'Wznów'} disabled={done} onClick={() => setRunning((v) => !v)}>
            {running ? <Icon.pause /> : <Icon.play />}
          </button>
          <button type="button" className="icon-btn" title="Od nowa" onClick={() => { setSamples(0); setResetKey((k) => k + 1); setRunning(true) }}><Icon.restore /></button>
          <button type="button" className="icon-btn" title="Zapisz PNG" disabled={samples === 0} onClick={savePng}><Icon.download /></button>
          {onClose && <button type="button" className="icon-btn" title="Zamknij" onClick={onClose}><Icon.close /></button>}
        </div>
      </div>
    </div>
  )
}
