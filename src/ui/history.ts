import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Historia zmian konfiguracji (cofnij / ponów). Zmiany w krótkim odstępie (suwak, przytrzymany przycisk) łączone w jeden krok.
 * Skróty: Ctrl/⌘+Z — cofnij, Ctrl/⌘+Shift+Z albo Ctrl+Y — ponów (poza polami tekstowymi).
 */
const MERGE_MS = 500
const LIMIT = 100

export function useHistory<T>(initial: T | (() => T)) {
  const [state, setState] = useState<{ past: T[]; present: T; future: T[] }>(() => ({
    past: [], present: typeof initial === 'function' ? (initial as () => T)() : initial, future: [],
  }))
  const last = useRef(0)

  const set = useCallback((next: T | ((current: T) => T)) => {
    setState((s) => {
      const value = typeof next === 'function' ? (next as (c: T) => T)(s.present) : next
      // ta sama treść (np. pole liczbowe zatwierdzające tę samą wartość przy utracie fokusu) — bez nowego kroku historii
      if (Object.is(value, s.present) || JSON.stringify(value) === JSON.stringify(s.present)) return s
      const now = Date.now()
      const merge = now - last.current < MERGE_MS && s.past.length > 0
      last.current = now
      return { past: merge ? s.past : [...s.past, s.present].slice(-LIMIT), present: value, future: [] }
    })
  }, [])

  const undo = useCallback(() => setState((s) => {
    if (!s.past.length) return s
    last.current = 0
    return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] }
  }), [])
  const redo = useCallback(() => setState((s) => {
    if (!s.future.length) return s
    last.current = 0
    return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) }
  }), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  /** nowy stan bez historii (wczytanie konfiguracji z linku) */
  const reset = useCallback((value: T) => setState({ past: [], present: value, future: [] }), [])

  return { value: state.present, set, reset, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 }
}
