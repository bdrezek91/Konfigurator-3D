import type { PavilionConfig, ProjectGeometry, WallSide } from '../../types'

export function facadeKindForWall(side: WallSide, config: PavilionConfig, geometry: ProjectGeometry) {
  const explicit = geometry.facadeCladding?.[side]
  if (explicit) return explicit.kind
  const enabled = side === 'front' ? config.facadeFront : side === 'back' ? config.facadeBack : side === 'left' ? config.facadeLeft : config.facadeRight
  if (!enabled || config.facade === 'plain') return 'none'
  if (
    config.facade === 'lamella-winchester' ||
    config.facade === 'lamella-black' ||
    config.facade === 'lamella-diagonal-winchester' ||
    config.facade === 'wood-horizontal' ||
    config.facade === 'ornament-panel'
  ) return 'none'
  if (config.facade === 'vertical-ribbed') return 'vertical-ribbed'
  if (config.facade === 'cassette-grid') return 'cassette-grid'
  return 'cassette-horizontal'
}
