import { initialQualityMode, saveQualityMode, TIERS, type QualityMode, type QualityTier } from '../render/quality'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Pavilion3D, { type CameraApi, type CameraPose, type LightingMode, type PavilionView } from '../scene/Pavilion3D'
import { cameraPose, GALLERY03_PHOTO_POSE } from '../scene/camera/presets'
import type { PavilionConfig } from '../types'
import { Icon } from './icons'

// panel HQ (path tracer) ładowany dopiero po kliknięciu
const HQPanel = lazy(() => import('./HQPanel').then((m) => ({ default: m.HQPanel })))

const VIEWS: Array<[PavilionView, string]> = [
  ['perspective', 'Perspektywa'],
  ['rear', 'Tył 3/4'],
  ['front', 'Front'],
  ['back', 'Tył'],
  ['left', 'Lewy'],
  ['right', 'Prawy'],
  ['top', 'Góra'],
]

const viewKey = (config: PavilionConfig) => 'dampol3d.view.' + config.project

function readSaved(config: PavilionConfig): CameraPose | null {
  try {
    const raw = window.localStorage.getItem(viewKey(config))
    return raw ? (JSON.parse(raw) as CameraPose) : null
  } catch {
    return null
  }
}

const TIER_LABEL: Record<QualityTier, string> = { low: 'Niska', medium: 'Średnia', high: 'Wysoka', ultra: 'Ultra' }

export function Viewer({
  config, lighting, onLighting, view, onView,
}: {
  config: PavilionConfig
  lighting: LightingMode
  onLighting: (mode: LightingMode) => void
  view: PavilionView
  onView: (view: PavilionView) => void
}) {
  const shell = useRef<HTMLDivElement>(null)
  const cameraApi = useRef<CameraApi | null>(null)
  const [resetNonce, setResetNonce] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [hqPose, setHqPose] = useState<CameraPose | null>(null)
  const [saved, setSaved] = useState<CameraPose | null>(() => readSaved(config))
  const [toast, setToast] = useState<string>()
  const gallery03 = config.project === 'GALERIA/03'
  const [compare, setCompare] = useState(gallery03)
  // tryb jakości (E5): wybór widza zapisany w przeglądarce; w trybie auto pokazujemy aktualny poziom
  const [quality, setQuality] = useState<QualityMode>(initialQualityMode)
  const [tier, setTier] = useState<QualityTier>('high')

  useEffect(() => {
    setSaved(readSaved(config))
    setHqPose(null)
    setCompare(config.project === 'GALERIA/03')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.project])

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shell.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(undefined), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void shell.current?.requestFullscreen()
  }

  const saveView = () => {
    const pose = cameraApi.current?.current()
    if (!pose) return
    try {
      window.localStorage.setItem(viewKey(config), JSON.stringify(pose))
    } catch {
      // brak dostępu do pamięci przeglądarki — widok zapamiętany tylko w tej sesji
    }
    setSaved(pose)
    setToast('Widok zapisany')
  }

  const openHQ = () => setHqPose(cameraApi.current?.current() ?? cameraPose(config, view))

  return (
    <div className={'viewer' + (fullscreen ? ' is-fullscreen' : '')} ref={shell}>
      {compare && gallery03 ? (
        <div className="compare-grid">
          <figure className="compare-pane">
            <img src="./reference/gallery-03.jpg" alt="Zdjęcie referencyjne 03" />
            <figcaption>Zdjęcie</figcaption>
          </figure>
          <div className="compare-pane">
            <Pavilion3D config={config} view="perspective" lighting={lighting} resetNonce={resetNonce} cameraApiRef={cameraApi} quality={quality} onTier={setTier} />
            <figcaption>Render interaktywny</figcaption>
          </div>
          <div className="compare-pane">
            <Suspense fallback={null}>
              <HQPanel config={config} pose={GALLERY03_PHOTO_POSE} lighting={lighting} compact />
            </Suspense>
            <figcaption>Render HQ</figcaption>
          </div>
          <aside className="compare-notes">
            <span className="eyebrow">Wzorzec galeria-03</span>
            <h4>Pomiary referencyjne</h4>
            <dl>
              <div><dt>Fasada</dt><dd>≈ 6,67 m</dd></div>
              <div><dt>Pas kasetonu</dt><dd>≈ 230 mm · 9 rzędów</dd></div>
              <div><dt>Attyka</dt><dd>2 × 350 mm</dd></div>
              <div><dt>Przeszklenie</dt><dd>1,04 / 0,86 / 1,14 m</dd></div>
              <div><dt>Lamele</dt><dd>pole 2,27 m · 40 / 18 mm</dd></div>
              <div><dt>Kamera</dt><dd>h 0,72 m · 3,6 m · FOV 52°</dd></div>
            </dl>
            <p>Pomiar fotogrametryczny (rektyfikacja fasady z punktów zbiegu). Szczegóły: reference/gallery/POMIARY.md.</p>
          </aside>
        </div>
      ) : (
        <div className="viewer-canvas">
          <Pavilion3D config={config} view={view} lighting={lighting} resetNonce={resetNonce} cameraApiRef={cameraApi} quality={quality} onTier={setTier} />
        </div>
      )}

      {hqPose && !compare && (
        <div className="hq-overlay">
          <Suspense fallback={null}>
            <HQPanel config={config} pose={hqPose} lighting={lighting} onClose={() => setHqPose(null)} />
          </Suspense>
        </div>
      )}

      {/* tryb jakości (E5) — w rogu widoku, żeby nie przeładować paska */}
      <select
        className="viewer-quality"
        aria-label="Jakość renderu"
        title={'Jakość renderu' + (quality === 'auto' ? ' — auto: ' + TIER_LABEL[tier] : '')}
        value={quality}
        onChange={(e) => { const v = e.target.value as QualityMode; setQuality(v); saveQualityMode(v) }}
      >
        <option value="auto">Jakość: auto</option>
        {TIERS.map((t) => <option key={t} value={t}>Jakość: {TIER_LABEL[t].toLowerCase()}</option>)}
      </select>

      <div className="viewer-dock">
        <div className="dock-group">
          {VIEWS.map(([v, label]) => (
            <button key={v} type="button" className={view === v && !compare ? 'on' : ''} disabled={compare} onClick={() => { onView(v); setResetNonce((n) => n + 1) }}>{label}</button>
          ))}
        </div>
        <span className="dock-sep" />
        <div className="dock-group icons">
          <button type="button" title="Reset kamery" onClick={() => setResetNonce((n) => n + 1)}><Icon.target /></button>
          <button type="button" title="Zapisz widok" onClick={saveView}><Icon.bookmark /></button>
          <button type="button" title="Przywróć zapisany widok" disabled={!saved} onClick={() => saved && cameraApi.current?.goTo(saved)}><Icon.restore /></button>
          <button type="button" title={lighting === 'day' ? 'Tryb wieczorny' : 'Tryb dzienny'} onClick={() => onLighting(lighting === 'day' ? 'evening' : 'day')}>
            {lighting === 'day' ? <Icon.moon /> : <Icon.sun />}
          </button>
          {gallery03 && (
            <button type="button" className={compare ? 'on' : ''} title="Porównanie ze zdjęciem" onClick={() => setCompare((v) => !v)}><Icon.compare /></button>
          )}
          <button type="button" title={fullscreen ? 'Zamknij pełny ekran' : 'Pełny ekran'} onClick={toggleFullscreen}>{fullscreen ? <Icon.collapse /> : <Icon.expand />}</button>
        </div>
        <span className="dock-sep" />
        <button type="button" className="dock-cta" disabled={compare} onClick={openHQ}><Icon.sparkle /> Render HQ</button>
      </div>

      {toast && <div className="viewer-toast">{toast}</div>}
    </div>
  )
}
