/**
 * Rich meme-style token art (data-URI SVG). Always loads offline.
 */

const PALETTES: [string, string, string][] = [
  ['#052e16', '#86efac', '#bbf7d0'],
  ['#0c4a6e', '#38bdf8', '#e0f2fe'],
  ['#4a044e', '#e879f9', '#f5d0fe'],
  ['#7c2d12', '#fb923c', '#fed7aa'],
  ['#1e1b4b', '#a5b4fc', '#e0e7ff'],
  ['#831843', '#f9a8d4', '#fce7f3'],
  ['#134e4a', '#5eead4', '#ccfbf1'],
  ['#713f12', '#fde047', '#fef9c3'],
  ['#1c1917', '#a3e635', '#ecfccb'],
  ['#450a0a', '#f87171', '#fecaca'],
  ['#164e63', '#22d3ee', '#cffafe'],
  ['#3b0764', '#c084fc', '#f3e8ff'],
]

const EMOJIS = [
  '🐸', '🐕', '🚀', '💊', '🌙', '🔥', '💎', '🦍', '🐱', '👑',
  '⚡', '🟢', '🐻', '🦈', '🐧', '🦊', '🐯', '🦄', '🐙', '🧠',
  '💀', '🤖', '👽', '🎯', '💰', '🏦', '🌊', '☀️', '🎰', '🃏',
  '🐺', '🦇', '🐢', '🦅', '🐉', '🤡', '😈', '👀', '🦴', '🥩',
]

export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

export function tokenEmoji(seed: string): string {
  return EMOJIS[hash(seed) % EMOJIS.length]
}

/** Detailed avatar: sky gradient, orb, rings, ticker badge, emoji */
export function tokenImageUrl(seed: string, emojiHint?: string, symbol?: string): string {
  const h = hash(seed || 'pump')
  const [c1, c2, c3] = PALETTES[h % PALETTES.length]
  const emoji = emojiHint || EMOJIS[h % EMOJIS.length]
  const ticker = (symbol || seed.slice(0, 4)).toUpperCase().slice(0, 6)
  const stars = Array.from({ length: 12 }, (_, i) => {
    const x = (hash(seed + i) % 480) + 16
    const y = (hash(seed + 'y' + i) % 200) + 10
    const r = 1 + (hash(seed + 'r' + i) % 3)
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c3}" opacity="${0.3 + (i % 5) * 0.1}"/>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="55%">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.45"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  ${stars}
  <ellipse cx="256" cy="420" rx="180" ry="40" fill="#000" opacity="0.25" filter="url(#soft)"/>
  <circle cx="256" cy="250" r="150" fill="${c1}" opacity="0.5"/>
  <circle cx="256" cy="250" r="130" fill="url(#glow)"/>
  <circle cx="256" cy="250" r="118" fill="none" stroke="${c3}" stroke-width="4" opacity="0.7"/>
  <circle cx="256" cy="250" r="100" fill="none" stroke="#fff" stroke-width="2" opacity="0.25" stroke-dasharray="8 10"/>
  <text x="256" y="275" text-anchor="middle" font-size="120" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, sans-serif">${emoji}</text>
  <rect x="156" y="400" width="200" height="44" rx="22" fill="#000" opacity="0.55"/>
  <text x="256" y="430" text-anchor="middle" fill="#fff" font-size="22" font-family="Inter,system-ui,sans-serif" font-weight="800">$${ticker}</text>
</svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
