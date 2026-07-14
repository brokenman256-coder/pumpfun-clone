/**
 * Endless meme factory — always real HTTPS images (DiceBear / RoboHash /
 * Vercel avatars / Picsum). No SVG placeholders.
 */

import type { CuratedMeme } from '../lib/curatedMemes'
import { CURATED_MEMES } from '../lib/curatedMemes'
import { realTokenImageUrl } from '../lib/realTokenImages'

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
  'Pepe is back',
  'Degen hours only',
  'Solana summer',
  'Ape first ask later',
  'Rug? Not this time',
  'Community take over',
  'Chart looking juicy',
  'Bags of glory',
  'Pump the volume',
  'Hold through the dip',
]

const SUBS = [
  'memes', 'dankmemes', 'cryptomemes', 'solana', 'degen', 'shitpost',
  'wholesomememes', 'pepe', 'wojak', 'dogecoin', 'bonk', 'popcat',
]

/** Build a unique real-image meme for bot launches */
export function makeProceduralMeme(seq: number): CuratedMeme {
  const title = `${HOOKS[seq % HOOKS.length]} #${seq}`
  const seed = `coin_${seq}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
  return {
    url: realTokenImageUrl(seed, seq),
    title,
    subreddit: SUBS[seq % SUBS.length],
  }
}

/**
 * Pick unique meme: prefer curated real images, then endless CDN art.
 */
export function pickAnyUniqueMeme(
  usedUrls: Set<string>,
  seq: number,
): CuratedMeme {
  const free = CURATED_MEMES.filter((m) => !usedUrls.has(m.url))
  if (free.length > 0) {
    return free[(Math.random() * free.length) | 0]
  }
  for (let i = 0; i < 24; i++) {
    const m = makeProceduralMeme(seq * 100 + i + ((Math.random() * 1e6) | 0))
    if (!usedUrls.has(m.url)) return m
  }
  return makeProceduralMeme(seq + Date.now())
}

/** @deprecated kept for imports — now real CDN, not SVG */
export function proceduralMemeImage(seed: string, _title: string): string {
  return realTokenImageUrl(seed)
}
