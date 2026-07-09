/**
 * Token avatars that always render — no external CDN required.
 * Unique photo-style gradient + emoji per seed (pump.fun board look).
 */

const PALETTES = [
  ['#14532d', '#86efac'],
  ['#1e3a5f', '#38bdf8'],
  ['#4a044e', '#e879f9'],
  ['#7c2d12', '#fb923c'],
  ['#312e81', '#a5b4fc'],
  ['#831843', '#f9a8d4'],
  ['#134e4a', '#5eead4'],
  ['#713f12', '#fde047'],
  ['#1c1917', '#a3e635'],
  ['#450a0a', '#f87171'],
  ['#0c4a6e', '#7dd3fc'],
  ['#3b0764', '#c084fc'],
]

const EMOJIS = [
  '🐸', '🐕', '🚀', '💊', '🌙', '🔥', '💎', '🦍', '🐱', '👑',
  '⚡', '🟢', '🐻', '🦈', '🐧', '🦊', '🐯', '🦄', '🐙', '🧠',
  '💀', '🤖', '👽', '🎯', '💰', '🏦', '🌊', '☀️', '🎰', '🃏',
]

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Build a data-URI SVG that looks like a meme token photo */
export function tokenImageUrl(seed: string, emojiHint?: string): string {
  const h = hash(seed || 'pump')
  const [c1, c2] = PALETTES[h % PALETTES.length]
  const emoji = emojiHint || EMOJIS[h % EMOJIS.length]
  const rot = h % 360
  // Escape for SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${rot})">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="r" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.35"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <rect width="512" height="512" fill="url(#r)"/>
  <circle cx="256" cy="256" r="160" fill="rgba(0,0,0,0.2)"/>
  <text x="256" y="280" text-anchor="middle" font-size="160" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** Optional remote photo packs for variety (with local fallback in UI) */
export function tokenPhotoUrl(seed: string, index: number): string {
  // picsum is reliable JPEG photos; seed keeps stable image per token
  const id = (hash(seed) % 1000) + (index % 50)
  return `https://picsum.photos/seed/pump${id}/400/400`
}

export function tokenEmoji(seed: string): string {
  return EMOJIS[hash(seed) % EMOJIS.length]
}
