/**
 * Launch fleet — simulated meme token factories.
 * Creates tokens in-app with rich descriptions / animated art every interval.
 * Does NOT hold real private keys or spam mainnet without explicit admin + wallet.
 */
import type { Token } from '../types'
import { spawnRandomToken } from './seedTokens'
import { tokenImageUrl, tokenEmoji } from '../lib/tokenImage'
import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  marketCapUsd,
  priceSol,
  SOL_PRICE_USD,
} from './bondingCurve'

const MEME_THEMES = [
  {
    name: 'Based Frog',
    symbol: 'BFROG',
    desc: 'The frog that never sells. Community-owned degen legend on Solana. NFA.',
    tags: ['frog', 'meme'],
  },
  {
    name: 'Degen Ape',
    symbol: 'DAPE',
    desc: 'Apes together strong. High-energy meme coin for late-night launches.',
    tags: ['ape', 'degen'],
  },
  {
    name: 'Moon Rocket',
    symbol: 'MOONR',
    desc: 'Fuel loaded. Destination: outer memes. Strap in for the curve ride.',
    tags: ['moon', 'rocket'],
  },
  {
    name: 'Sol Cat',
    symbol: 'SCAT',
    desc: 'Nine lives, infinite pumps. The cat that trades while you sleep.',
    tags: ['cat', 'animal'],
  },
  {
    name: 'Diamond Paw',
    symbol: 'DPAW',
    desc: 'Hold with paws of diamond. Soft meme, hard conviction.',
    tags: ['diamond', 'hold'],
  },
  {
    name: 'Giga Brain',
    symbol: 'GIGA',
    desc: '400 IQ plays only. AI-adjacent culture coin for the timeline.',
    tags: ['ai', 'culture'],
  },
  {
    name: 'Chaos Goblin',
    symbol: 'GOBL',
    desc: 'Unhinged. Unfiltered. On-chain chaos agent of pure meme energy.',
    tags: ['goblin', 'chaos'],
  },
  {
    name: 'Pixel Pepe',
    symbol: 'PXPE',
    desc: '8-bit nostalgia meets Solana speed. Rare pepe energy, infinite supply lore.',
    tags: ['pepe', 'pixel'],
  },
]

export type BotConfig = {
  /** Max bots in fleet (default 100) */
  fleetSize: number
  /** Interval between launches ms (default 15000) */
  intervalMs: number
  enabled: boolean
  launched: number
}

export const DEFAULT_BOT_CONFIG: BotConfig = {
  fleetSize: 100,
  intervalMs: 15_000,
  enabled: false,
  launched: 0,
}

export function buildBotToken(botIndex: number, seq: number): Token {
  const theme = MEME_THEMES[botIndex % MEME_THEMES.length]
  const symbol = `${theme.symbol}${seq % 100}`.slice(0, 8).toUpperCase()
  const seed = `bot_${botIndex}_${seq}_${Date.now()}`
  const emoji = tokenEmoji(seed)
  const name = `${theme.name} #${botIndex + 1}`
  const mcap = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
  const id = `bot_${botIndex}_${Date.now().toString(36)}`

  return {
    id,
    name,
    symbol,
    emoji,
    description: `${theme.desc} · Auto-launched by fleet bot ${botIndex + 1}/${100}. Animated meme art included.`,
    imageUrl: tokenImageUrl(seed, emoji, symbol),
    imageHue: (botIndex * 37) % 360,
    creator: `BotFleet${String(botIndex).padStart(3, '0')}`,
    creatorName: `bot${botIndex + 1}`,
    virtualSol: VIRTUAL_SOL,
    virtualTokens: VIRTUAL_TOKENS,
    realSol: 0.01,
    realTokens: REAL_TOKEN_RESERVES,
    priceSol: priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS),
    marketCapUsd: mcap,
    change24h: Math.random() * 20 - 5,
    athUsd: mcap * 1.1,
    volumeSol: Math.random() * 2,
    volumeUsd: Math.random() * 2 * SOL_PRICE_USD,
    buyCount: Math.floor(Math.random() * 20),
    sellCount: Math.floor(Math.random() * 10),
    replies: Math.floor(Math.random() * 15),
    complete: false,
    createdAt: Date.now(),
    lastTradeAt: Date.now(),
    candles: [],
    holders: [
      {
        wallet: 'bonding-curve',
        amount: REAL_TOKEN_RESERVES * 0.7,
        pct: 70,
        isCurve: true,
      },
      {
        wallet: `BotFleet${String(botIndex).padStart(3, '0')}`,
        amount: REAL_TOKEN_RESERVES * 0.3,
        pct: 30,
        isCreator: true,
      },
    ],
    shake: null,
    tags: [...theme.tags, 'bot-launch', 'animated'],
    source: 'local',
    twitter: `https://x.com/search?q=${symbol}`,
  }
}

/** Fallback if spawn needed */
export function botOrSpawn(i: number, seq: number) {
  try {
    return buildBotToken(i, seq)
  } catch {
    return spawnRandomToken(seq)
  }
}
