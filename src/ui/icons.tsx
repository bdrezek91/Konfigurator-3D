import type { ReactNode } from 'react'

export function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

// Zbiór ikon (obiekt komponentów) — świadomy wyjątek od reguły fast-refresh.
// oxlint-disable-next-line react/only-export-components
export const Icon = {
  ruler: () => <Svg><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></Svg>,
  cube: () => <Svg><path d="M12 3 4 7.5v9L12 21l8-4.5v-9z" /><path d="M4 7.5 12 12l8-4.5M12 12v9" /></Svg>,
  facade: () => <Svg><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M3 14h18M9 4v5M15 9v5M9 14v6" /></Svg>,
  door: () => <Svg><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 3v18" /><circle cx="15" cy="12" r="0.6" fill="currentColor" /></Svg>,
  roof: () => <Svg><path d="M3 10 12 5l9 5" /><path d="M5 9v10h14V9" /></Svg>,
  sofa: () => <Svg><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><rect x="2" y="11" width="20" height="6" rx="2" /><path d="M5 17v2M19 17v2" /></Svg>,
  bolt: () => <Svg><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>,
  tap: () => <Svg><path d="M4 8h10a3 3 0 0 1 3 3v2" /><path d="M8 5v3M17 17c0 1.1-.9 2-2 2s-2-.9-2-2c0-1.5 2-4 2-4s2 2.5 2 4Z" /></Svg>,
  gear: () => <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Svg>,
  expand: () => <Svg><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></Svg>,
  collapse: () => <Svg><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></Svg>,
  target: () => <Svg><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></Svg>,
  bookmark: () => <Svg><path d="M6 3h12v18l-6-4-6 4z" /></Svg>,
  undo: () => <Svg><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>,
  redo: () => <Svg><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Svg>,
  link: () => <Svg><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></Svg>,
  restore: () => <Svg><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>,
  sun: () => <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>,
  moon: () => <Svg><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></Svg>,
  camera: () => <Svg><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="4" /></Svg>,
  sparkle: () => <Svg><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Svg>,
  download: () => <Svg><path d="M12 3v12M7 10l5 5 5-5M4 21h16" /></Svg>,
  play: () => <Svg><path d="M7 4v16l13-8z" /></Svg>,
  pause: () => <Svg><path d="M7 4h4v16H7zM13 4h4v16h-4z" /></Svg>,
  close: () => <Svg><path d="M6 6l12 12M18 6 6 18" /></Svg>,
  plus: () => <Svg><path d="M12 5v14M5 12h14" /></Svg>,
  minus: () => <Svg><path d="M5 12h14" /></Svg>,
  trash: () => <Svg><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>,
  copy: () => <Svg><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Svg>,
  info: () => <Svg size={14}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>,
  chevron: () => <Svg size={16}><path d="m6 9 6 6 6-6" /></Svg>,
  layers: () => <Svg><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 13 9 5 9-5" /></Svg>,
  compare: () => <Svg><rect x="3" y="5" width="8" height="14" rx="1" /><rect x="13" y="5" width="8" height="14" rx="1" /></Svg>,
  check: () => <Svg size={14}><path d="m5 12 5 5 9-10" /></Svg>,
  alert: () => <Svg size={14}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></Svg>,
}
