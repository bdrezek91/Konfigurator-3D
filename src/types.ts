export type PavilionConfig = {
  length: number
  width: number
  height: number
  color: string
  windows: number
  door: boolean
  lamella: boolean
  showStructure: boolean
}

export const DEFAULT_CONFIG: PavilionConfig = {
  length: 6,
  width: 3,
  height: 2.8,
  color: '#383e42',
  windows: 2,
  door: true,
  lamella: false,
  showStructure: true,
}

export const RAL_COLORS = [
  { name: 'RAL 7016 — antracyt', value: '#383e42' },
  { name: 'RAL 9005 — czarny', value: '#0e0e10' },
  { name: 'RAL 9010 — biały', value: '#f2f0e7' },
  { name: 'RAL 9006 — aluminium', value: '#a5a5a3' },
  { name: 'RAL 9007 — szary aluminium', value: '#7d7d7a' },
]