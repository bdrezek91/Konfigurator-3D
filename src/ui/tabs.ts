import type { ReactNode } from 'react'
import { Icon } from './icons'

export type TabId = 'dims' | 'body' | 'facade' | 'joinery' | 'roof' | 'interior' | 'install' | 'equipment' | 'tech'

export const TABS: Array<{ id: TabId; label: string; icon: () => ReactNode }> = [
  { id: 'dims', label: 'Wymiary', icon: Icon.ruler },
  { id: 'body', label: 'Bryła', icon: Icon.cube },
  { id: 'facade', label: 'Elewacja', icon: Icon.facade },
  { id: 'joinery', label: 'Stolarka', icon: Icon.door },
  { id: 'roof', label: 'Dach', icon: Icon.roof },
  { id: 'interior', label: 'Wnętrze', icon: Icon.sofa },
  { id: 'install', label: 'Instalacje', icon: Icon.bolt },
  { id: 'equipment', label: 'Wyposażenie', icon: Icon.tap },
  { id: 'tech', label: 'Techniczne', icon: Icon.gear },
]
