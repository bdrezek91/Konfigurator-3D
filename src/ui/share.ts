import type { PavilionConfig } from '../types'

/**
 * Udostępnianie konfiguracji linkiem: konfiguracja (JSON) → deflate → base64url w części `#k=` adresu.
 * Bez serwera — link zawiera cały pawilon (wymiary, stolarkę, elewację, dopasowanie kasetonów).
 */
const PREFIX = '#k='
const VERSION = 1

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(stream))
  return new Uint8Array(await out.arrayBuffer())
}

export async function shareUrl(config: PavilionConfig): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify({ v: VERSION, c: config }))
  const packed = await pipe(json, new CompressionStream('deflate-raw'))
  return window.location.origin + window.location.pathname + PREFIX + toB64(packed)
}

/** Konfiguracja z adresu (`#k=…`) albo null. */
export async function configFromUrl(): Promise<PavilionConfig | null> {
  const h = window.location.hash
  if (!h.startsWith(PREFIX)) return null
  try {
    const raw = await pipe(fromB64(h.slice(PREFIX.length)), new DecompressionStream('deflate-raw'))
    const data = JSON.parse(new TextDecoder().decode(raw)) as { v: number; c: PavilionConfig }
    return data.v === VERSION && data.c && typeof data.c.length === 'number' ? data.c : null
  } catch {
    return null
  }
}
