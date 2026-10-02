import { lazy, Suspense } from 'react'
import App from './App'

// stanowisko kalibracji profili blach: ?lab=profiles (ładowane tylko na żądanie)
const ProfileLab = lazy(() => import('./lab/ProfileLab'))

export default function Root() {
  const lab = new URLSearchParams(window.location.search).get('lab')
  return lab === 'profiles' ? <Suspense fallback={null}><ProfileLab /></Suspense> : <App />
}
