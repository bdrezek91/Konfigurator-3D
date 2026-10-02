import type { OpeningHandle, OpeningPlacement, OpeningProfile } from '../../types'

export function defaultProfile(opening: OpeningPlacement): OpeningProfile {
  return opening.profile ?? (opening.kind === 'pvc-window' ? 'pvc' : 'alu-standard')
}

export function defaultHandle(opening: OpeningPlacement): OpeningHandle {
  if (opening.handle) return opening.handle
  if (opening.kind === 'door-full') return 'lever'
  return opening.kind.startsWith('door-') ? 'bar' : 'none'
}
