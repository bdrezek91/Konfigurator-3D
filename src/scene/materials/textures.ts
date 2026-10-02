import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { PavilionConfig } from '../../types'

export const textureCache = new Map<string, CanvasTexture>()

export function panelNormalTexture(profile: PavilionConfig['wallProfile']) {
  if (profile === 'smooth') return undefined
  const key = 'panel-normal-' + profile
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  ctx.fillStyle = 'rgb(128,128,255)'
  ctx.fillRect(0, 0, 256, 256)
  const spacing =
    profile === 'microrib' ? 9 :
    profile === 'microline' ? 14 :
    profile === 'carbon' ? 12 :
    profile === 'microwave' ? 22 : 36
  const strength = profile === 'microrib' || profile === 'microline' ? 5 : 9
  for (let x = 0; x < 256; x += spacing) {
    const grad = ctx.createLinearGradient(x - 3, 0, x + 3, 0)
    grad.addColorStop(0, 'rgb(128,128,255)')
    grad.addColorStop(0.35, 'rgb(' + (128 - strength) + ',128,255)')
    grad.addColorStop(0.65, 'rgb(' + (128 + strength) + ',128,255)')
    grad.addColorStop(1, 'rgb(128,128,255)')
    ctx.fillStyle = grad
    ctx.fillRect(x - 3, 0, 6, 256)
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(5, 1)
  textureCache.set(key, texture)
  return texture
}

export function woodTexture(kind: 'winchester' | 'palisander' | 'natural') {
  const key = 'wood-' + kind
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined
  const palette =
    kind === 'palisander'
      ? ['#473126', '#5b3c2b', '#38261f', '#6a4932']
      : kind === 'natural'
        ? ['#80634b', '#967154', '#70533e', '#a37b58']
        : ['#5f4938', '#73553f', '#4d3a2f', '#84624a']
  const grad = ctx.createLinearGradient(0, 0, 128, 0)
  palette.forEach((c, i) => grad.addColorStop(i / (palette.length - 1), c))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 512)
  for (let y = 0; y < 512; y += 14) {
    ctx.strokeStyle = y % 28 === 0 ? 'rgba(45,25,14,.24)' : 'rgba(255,225,180,.13)'
    ctx.lineWidth = 1 + (y % 3) * 0.35
    ctx.beginPath()
    ctx.moveTo(0, y + Math.sin(y * 0.12) * 3)
    ctx.bezierCurveTo(32, y - 4, 86, y + 6, 128, y + Math.sin(y * 0.08) * 4)
    ctx.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1, 1.5)
  textureCache.set(key, texture)
  return texture
}


export function glassReflectionTexture() {
  const key = 'glass-reflection-v2'
  const cached = textureCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined

  const sky = ctx.createLinearGradient(0, 0, 0, 512)
  sky.addColorStop(0, '#b8d0da')
  sky.addColorStop(0.48, '#dbe3df')
  sky.addColorStop(0.58, '#8ea48b')
  sky.addColorStop(1, '#6b706b')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 512, 512)

  let seed = 42017
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  ctx.save()
  ctx.globalAlpha = 0.30
  ctx.filter = 'blur(0.8px)'
  for (let i = 0; i < 26; i++) {
    const x = rnd() * 540 - 14
    const trunkW = 1.5 + rnd() * 3.5
    const treeH = 110 + rnd() * 260
    const base = 335 + rnd() * 85
    ctx.strokeStyle = i % 3 === 0 ? '#31463b' : '#3a4f43'
    ctx.lineWidth = trunkW
    ctx.beginPath()
    ctx.moveTo(x, base)
    ctx.lineTo(x + (rnd() - 0.5) * 14, base - treeH)
    ctx.stroke()
    const crownY = base - treeH * (0.68 + rnd() * 0.18)
    const branches = 3 + Math.floor(rnd() * 4)
    for (let b = 0; b < branches; b++) {
      const by = crownY + b * 18 + rnd() * 8
      const spread = 14 + rnd() * 28
      ctx.lineWidth = Math.max(0.8, trunkW * 0.45)
      ctx.beginPath()
      ctx.moveTo(x, by)
      ctx.lineTo(x - spread, by - 10 - rnd() * 16)
      ctx.moveTo(x, by)
      ctx.lineTo(x + spread * 0.8, by - 12 - rnd() * 14)
      ctx.stroke()
    }
  }
  ctx.restore()

  const horizon = ctx.createLinearGradient(0, 290, 0, 430)
  horizon.addColorStop(0, 'rgba(240,244,238,.18)')
  horizon.addColorStop(1, 'rgba(70,76,72,.28)')
  ctx.fillStyle = horizon
  ctx.fillRect(0, 290, 512, 150)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(1.1, 1)
  textureCache.set(key, texture)
  return texture
}


/**
 * Kolor blachy do renderu. Przy oświetleniu HDRI używamy prawdziwego koloru RAL —
 * bez rozjaśniania, żeby RAL 7016 był neutralnym antracytem (wcześniej #545c61 dawał stalowy, niebieski ton).
 */
export function renderMetalColor(color: string) {
  return color
}
