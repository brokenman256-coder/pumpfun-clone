/**
 * Board launch fleet — managed-market meme coins every 30s.
 * Unique realistic images (never repeated), proper name/symbol/bio,
 * and mcap seeded with platform 5% margin baked in.
 */
import type { Token } from '../types'
import { spawnRandomToken } from './seedTokens'
import { tokenEmoji } from '../lib/tokenImage'
import { CURATED_MEMES, type CuratedMeme } from '../lib/curatedMemes'
import { seedCandles } from './candles'
import {
  seedReservesToMcap,
  randomBotTargetMcap,
  PLATFORM_MARGIN_BPS,
  REAL_TOKEN_RESERVES,
} from './managedMarket'
import { priceSol, marketCapUsd, VIRTUAL_SOL, VIRTUAL_TOKENS } from './bondingCurve'

export type BotConfig = {
  /** Max coins the fleet will launch this session */
  fleetSize: number
  /** Interval between launches (ms) — default 30s */
  intervalMs: number
  enabled: boolean
  launched: number
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  fleetSize: 500,
  intervalMs: 30_000,
  /** Primary launcher is useLiveBoard → /api/live-board; local fleet is backup */
  enabled: true,
  launched: 0,
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are',
  'was', 'were', 'be', 'my', 'your', 'our', 'this', 'that', 'with', 'from',
  'at', 'by', 'as', 'it', 'its', 'me', 'we', 'you', 'i', 'im', "i'm", 'do',
  'does', 'did', 'not', 'no', 'yes', 'just', 'very', 'so', 'if', 'when',
  'how', 'what', 'who', 'why', 'uhh', 'hes', "he's", 'shes', "she's",
])

function cleanWords(title: string): string[] {
  return title
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()))
}

/** Short coin name from meme title */
export function memeToName(title: string, fallback: string): string {
  const words = cleanWords(title)
  if (words.length === 0) return fallback
  const name = words.slice(0, 4).join(' ')
  return name.length > 28 ? name.slice(0, 28).trim() : name
}

/** Ticker from meme title — 3–6 caps, unique-ish */
export function memeToSymbol(title: string, seq: number): string {
  const words = cleanWords(title)
  let base = ''
  if (words.length >= 2) {
    base = words
      .slice(0, 4)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  } else if (words.length === 1) {
    base = words[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
  }
  if (base.length < 3) {
    base = (`MEME${seq % 1000}`).slice(0, 6)
  }
  // Append digit if short collision risk
  if (base.length < 4) base = `${base}${seq % 10}`
  return base.slice(0, 8)
}

/** Proper bio: meme context + launchpad fluff */
export function memeToBio(meme: CuratedMeme, symbol: string): string {
  const sub = meme.subreddit ? `r/${meme.subreddit}` : 'the timeline'
  return [
    `${meme.title}`,
    ``,
    `Born from ${sub}. Community-driven meme on the IGNITE curve.`,
    `Fixed supply · fair launch · no team dump · NFA DYOR.`,
    `$${symbol} is managed on-curve — trade with Phantom anytime.`,
  ].join('\n')
}

export function pickUniqueMeme(usedUrls: Set<string>): CuratedMeme | null {
  const free = CURATED_MEMES.filter((m) => !usedUrls.has(m.url))
  if (free.length === 0) return null
  // Prefer less-used pool order with light shuffle
  const i = Math.floor(Math.random() * free.length)
  return free[i]
}

export function collectUsedMemeUrls(tokens: { imageUrl?: string; source?: string }[]): Set<string> {
  const used = new Set<string>()
  for (const t of tokens) {
    if (t.imageUrl && (t.source === 'bot' || t.source === 'local')) {
      used.add(t.imageUrl)
    }
  }
  return used
}

export type BuildBotOptions = {
  botIndex: number
  seq: number
  usedUrls: Set<string>
  /** Optional USD mcap target; random band if omitted */
  targetMcapUsd?: number
  creatorLabel?: string
}

/**
 * Build one managed board coin from a unique curated meme.
 * Returns null when the unique meme pool is exhausted.
 */
export function buildBotToken(opts: BuildBotOptions): Token | null {
  const meme = pickUniqueMeme(opts.usedUrls)
  if (!meme) return null

  const seq = opts.seq
  const name = memeToName(meme.title, `Meme ${opts.botIndex + 1}`)
  const symbol = memeToSymbol(meme.title, seq)
  const seed = `bot_${opts.botIndex}_${seq}_${meme.url}`
  const emoji = tokenEmoji(seed)
  const id = `bot_${Date.now().toString(36)}_${seq.toString(36)}`
  const creator = opts.creatorLabel || `BotFleet${String(opts.botIndex % 100).padStart(3, '0')}`

  const target = opts.targetMcapUsd ?? randomBotTargetMcap()
  const seeded = seedReservesToMcap(target, PLATFORM_MARGIN_BPS)
  const mcap = marketCapUsd(seeded.virtualSol, seeded.virtualTokens)
  const px = priceSol(seeded.virtualSol, seeded.virtualTokens)

  // Seed a bit of volume / activity so the board looks alive
  const seedVolSol = seeded.seedSol * 0.35 + Math.random() * 0.4
  const buys = 3 + Math.floor(Math.random() * 18)
  const sells = Math.floor(buys * (0.15 + Math.random() * 0.25))

  const curveHold = Math.max(REAL_TOKEN_RESERVES * 0.55, seeded.realTokens * 0.9)
  const creatorHold = Math.max(0, REAL_TOKEN_RESERVES - curveHold)

  return {
    id,
    name,
    symbol,
    emoji,
    description: memeToBio(meme, symbol),
    imageUrl: meme.url,
    imageHue: (opts.botIndex * 37) % 360,
    creator,
    creatorName: `bot${(opts.botIndex % 99) + 1}`,
    virtualSol: seeded.virtualSol,
    virtualTokens: seeded.virtualTokens,
    realSol: seeded.curveSol,
    realTokens: seeded.realTokens,
    curveSol: seeded.curveSol,
    marginSol: seeded.marginSol,
    priceSol: px,
    marketCapUsd: mcap,
    change24h: (Math.random() - 0.35) * 40,
    athUsd: mcap * (1 + Math.random() * 0.15),
    volumeSol: seedVolSol,
    volumeUsd: seedVolSol * 150,
    buyCount: buys,
    sellCount: sells,
    replies: Math.floor(Math.random() * 12),
    complete: false,
    createdAt: Date.now(),
    lastTradeAt: Date.now() - Math.floor(Math.random() * 60_000),
    candles: seedCandles(mcap, 36),
    holders: [
      {
        wallet: 'bonding-curve',
        amount: curveHold,
        pct: Math.round((curveHold / REAL_TOKEN_RESERVES) * 100),
        isCurve: true,
      },
      {
        wallet: creator,
        amount: creatorHold,
        pct: Math.round((creatorHold / REAL_TOKEN_RESERVES) * 100),
        isCreator: true,
      },
    ],
    shake: null,
    tags: ['bot-launch', 'meme', 'managed', meme.subreddit].filter(Boolean) as string[],
    source: 'bot',
    managed: true,
    twitter: `https://x.com/search?q=%24${symbol}`,
  }
}

/** Fallback if unique pool exhausted mid-session */
export function botOrSpawn(i: number, seq: number, used: Set<string>) {
  const t = buildBotToken({ botIndex: i, seq, usedUrls: used })
  if (t) return t
  // Last resort: generic spawn (still marks managed)
  const fallback = spawnRandomToken(seq)
  return {
    ...fallback,
    source: 'bot' as const,
    managed: true,
    curveSol: fallback.realSol,
    marginSol: 0,
    virtualSol: fallback.virtualSol || VIRTUAL_SOL,
    virtualTokens: fallback.virtualTokens || VIRTUAL_TOKENS,
  }
}

export { PLATFORM_MARGIN_BPS }
