/**
 * Endless meme factory — when curated pool is exhausted, generate
 * procedural meme art + titles so the coin bot never stops.
 * (User requested volume over copyright concerns.)
 */

import type { CuratedMeme } from '../lib/curatedMemes'
import { CURATED_MEMES } from '../lib/curatedMemes'

const HOOKS = [
  'When the chart does this',
  'Nobody:',
  'Me after one green candle',
  'POV: you bought the dip',
  'They said it was over',
  'Based department',
  'Gigachad energy',
  'Touch grass? Never heard of her',
  'Sir this is a casino',
  'My portfolio rn',
  'Average degen morning',
  'Trust the process',
  'WAGMI but make it fashion',
  'NPC behavior detected',
  'Real ones know',
  'This is the way',
  'Cope and seethe',
  'Probably nothing',
  'Few understand',
  'Literally me',
  'The prophecy',
  'Day 47 of holding',
  'Wife changing the will',
  'Boss: why late',
  'Me explaining crypto',
  'Bulls vs bears',
  'Exit liquidity arrives',
  'Diamond hands only',
  'Paper hands left chat',
  'Moon mission briefing',
]

const SUBS = [
  'memes', 'dankmemes', 'cryptomemes', 'solana', 'degen', 'shitpost',
  'wholesomememes', 'ProgrammerHumor', 'dogecoin', 'pepe', 'wojak',
]

/** SVG data-URI meme card — always unique per seed */
export function proceduralMemeImage(seed: string, title: string): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const hue = Math.abs(h) % 360
  const hue2 = (hue + 40 + (Math.abs(h) % 80)) % 360
  const safe = title
    .slice(0, 42)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue},75%,45%)"/>
      <stop offset="100%" stop-color="hsl(${hue2},70%,30%)"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="200" cy="160" r="70" fill="rgba(255,255,255,0.15)"/>
  <text x="200" y="175" text-anchor="middle" font-size="64" font-family="Impact,Arial Black,sans-serif" fill="#fff" stroke="#000" stroke-width="2">${seed.slice(0, 2).toUpperCase()}</text>
  <rect x="20" y="280" width="360" height="90" rx="12" fill="rgba(0,0,0,0.45)"/>
  <text x="200" y="320" text-anchor="middle" font-size="16" font-family="Arial,sans-serif" fill="#fff">${safe}</text>
  <text x="200" y="348" text-anchor="middle" font-size="12" font-family="Arial,sans-serif" fill="#86efac">IGNITE · LIVE MEME</text>
</svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export function makeProceduralMeme(seq: number): CuratedMeme {
  const title = `${HOOKS[seq % HOOKS.length]} #${seq}`
  const seed = `proc_${seq}_${Date.now().toString(36)}`
  return {
    url: proceduralMemeImage(seed, title),
    title,
    subreddit: SUBS[seq % SUBS.length],
  }
}

/**
 * Pick unique meme: prefer curated real images, then procedural forever.
 */
export function pickAnyUniqueMeme(
  usedUrls: Set<string>,
  seq: number,
): CuratedMeme {
  const free = CURATED_MEMES.filter((m) => !usedUrls.has(m.url))
  if (free.length > 0) {
    return free[(Math.random() * free.length) | 0]
  }
  // Exhausted curated — generate until unique
  for (let i = 0; i < 20; i++) {
    const m = makeProceduralMeme(seq * 100 + i + ((Math.random() * 1e6) | 0))
    if (!usedUrls.has(m.url)) return m
  }
  return makeProceduralMeme(seq + Date.now())
}
