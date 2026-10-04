import { lazy, Suspense } from 'react'
import App from './App'

// stanowiska ładowane tylko na żądanie: ?lab=profiles (kalibracja profili), ?lab=construction (System 1 — kątownik 50×50×4), ?lab=joinery (stolarka z przekrojów)
const ProfileLab = lazy(() => import('./lab/ProfileLab'))
const ConstructionLab = lazy(() => import('./construction/ConstructionLab'))
const JoineryLab = lazy(() => import('./lab/JoineryLab'))

export default function Root() {
  const lab = new URLSearchParams(window.location.search).get('lab')
  if (lab === 'profiles') return <Suspense fallback={null}><ProfileLab /></Suspense>
  if (lab === 'construction') return <Suspense fallback={null}><ConstructionLab /></Suspense>
  if (lab === 'joinery') return <Suspense fallback={null}><JoineryLab /></Suspense>
  return <App />
}
