import type { Holder, Token } from '../types'
import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  TOTAL_SUPPLY,
  marketCapUsd,
  priceSol,
  SOL_PRICE_USD,
} from './bondingCurve'
import { hash, tokenEmoji } from '../lib/tokenImage'
import { curatedMemeFor } from '../lib/curatedMemes'

/** Light seed so live bot coins dominate the board */
export const SEED_COUNT = 18

const NAMES = [
  'Pepe', 'Doge', 'Wojak', 'Bonk', 'Popcat', 'Wif', 'MooDeng', 'Goat',
  'ChillGuy', 'Fartcoin', 'Neiro', 'Ai16z', 'Act', 'Zerebro', 'Virtual',
  'Pengu', 'Meow', 'Trump', 'Melania', 'Giga', 'Sigma', 'Based', 'Chad',
  'Frog', 'Cat', 'Dog', 'Moon', 'Rocket', 'Pump', 'Solana', 'Meme',
  'Apu', 'Brett', 'Andy', 'Landwolf', 'Toshi', 'Mog', 'Spx', 'Fwoog',
]

const TAGS = ['meme', 'ai', 'animal', 'political', 'culture', 'degen', 'solana', 'community']

const HANDLES = [
  'anon', 'degen', 'whale', 'dev', 'ape', 'ser', 'chad', 'fren', 'based', 'alpha',
]

export function randomWallet() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let s = ''
  for (let i = 0; i < 44; i++) s += chars[(Math.random() * chars.length) | 0]
  return s
}

function pick<T>(arr: T[]) {
  return arr[(Math.random() * arr.length) | 0]
}

function makeHolders(creator: string, realTokens: number): Holder[] {
  const curveAmt = REAL_TOKEN_RESERVES * 0.55
  const rest = Math.max(0, realTokens * 0.45)
  const list: Holder[] = [
    { wallet: 'bonding-curve', amount: curveAmt, pct: (curveAmt / TOTAL_SUPPLY) * 100, isCurve: true },
    { wallet: creator, amount: rest * 0.35, pct: ((rest * 0.35) / TOTAL_SUPPLY) * 100, isCreator: true },
  ]
  let left = rest * 0.65
  for (let i = 0; i < 8; i++) {
    const amt = left * (0.08 + Math.random() * 0.18)
    left -= amt
    list.push({
      wallet: randomWallet(),
      amount: amt,
      pct: (amt / TOTAL_SUPPLY) * 100,
    })
  }
  return list.sort((a, b) => b.amount - a.amount)
}

export function createSeedTokens(count = SEED_COUNT): Token[] {
  const now = Date.now()
  const tokens: Token[] = []

  for (let i = 0; i < count; i++) {
    const nameBase = NAMES[i % NAMES.length]
    const suffix = pick(['', 'Coin', 'Inu', 'AI', 'Sol', 'Fun', 'DAO'])
    const name = `${nameBase}${suffix ? ' ' + suffix : ''}`
    const symbol = (nameBase.slice(0, 5) + (i % 10)).toUpperCase().slice(0, 8)
    const seed = `${symbol}_${i}_${nameBase}`
    const emoji = tokenEmoji(seed)
    const h = hash(seed)
    const progress = (h % 1000) / 1000
    const virtualSol = VIRTUAL_SOL + progress * 55
    const virtualTokens = VIRTUAL_TOKENS / (1 + progress * 2.2)
    const mcap = marketCapUsd(virtualSol, virtualTokens)
    const pSol = priceSol(virtualSol, virtualTokens)
    const change24h = ((h % 200) - 80) / 10 // -8% .. +12%
    const volumeSol = 0.5 + (h % 500) / 10
    const buys = 20 + (h % 400)
    const sells = 10 + (h % 200)
    const creator = randomWallet()
    const complete = mcap >= 65_000 && (h % 17 === 0)

    tokens.push({
      id: `mint_${i}_${symbol.toLowerCase()}`,
      name,
      symbol,
      emoji,
      description: `${name} ($${symbol}) is a community-driven memecoin on Solana. Bonding curve live · NFA · DYOR.`,
      imageUrl: curatedMemeFor(seed, hash).url,
      imageHue: h % 360,
      creator,
      creatorName: `${pick(HANDLES)}${(h % 900) + 100}`,
      virtualSol,
      virtualTokens,
      realSol: progress * 28,
      realTokens: REAL_TOKEN_RESERVES * (1 - progress * 0.4),
      priceSol: pSol,
      marketCapUsd: mcap,
      change24h,
      athUsd: mcap * (1.05 + (h % 40) / 100),
      volumeSol,
      volumeUsd: volumeSol * SOL_PRICE_USD,
      buyCount: buys,
      sellCount: sells,
      replies: (h % 120) + 3,
      complete,
      createdAt: now - (h % 72) * 3_600_000 - (h % 50) * 60_000,
      lastTradeAt: now - (h % 120) * 1000,
      candles: [],
      holders: makeHolders(creator, REAL_TOKEN_RESERVES),
      shake: null,
      website: undefined,
      twitter: h % 2 === 0 ? `https://x.com/${symbol.toLowerCase()}` : undefined,
      telegram: h % 4 === 0 ? `https://t.me/${symbol.toLowerCase()}` : undefined,
      tags: [TAGS[h % TAGS.length], TAGS[(h + 3) % TAGS.length], 'managed'],
      source: 'local',
      managed: true,
      curveSol: progress * 28 * 0.95,
      marginSol: progress * 28 * 0.05,
    })
  }

  return tokens.sort((a, b) => b.createdAt - a.createdAt)
}

export function spawnRandomToken(seq: number): Token {
  const nameBase = pick(NAMES)
  const symbol = (nameBase.slice(0, 5) + seq).toUpperCase().slice(0, 8)
  const seed = `live_${seq}_${symbol}_${Date.now()}`
  const emoji = tokenEmoji(seed)
  const creator = randomWallet()
  const mcap = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
  const pSol = priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS)
  return {
    id: `live_${seq}_${Date.now().toString(36)}`,
    name: `${nameBase} ${seq}`,
    symbol,
    emoji,
    description: `Fresh launch #${seq} — just deployed on the curve.`,
    imageUrl: curatedMemeFor(seed, hash).url,
    imageHue: (seq * 31) % 360,
    creator,
    creatorName: `dev${seq}`,
    virtualSol: VIRTUAL_SOL,
    virtualTokens: VIRTUAL_TOKENS,
    realSol: 0,
    realTokens: REAL_TOKEN_RESERVES,
    priceSol: pSol,
    marketCapUsd: mcap,
    change24h: 0,
    athUsd: mcap,
    volumeSol: 0,
    volumeUsd: 0,
    buyCount: 0,
    sellCount: 0,
    replies: 0,
    complete: false,
    createdAt: Date.now(),
    lastTradeAt: Date.now(),
    candles: [],
    holders: makeHolders(creator, REAL_TOKEN_RESERVES),
    shake: null,
    tags: ['new', 'meme', 'managed'],
    source: 'local',
    managed: true,
    curveSol: 0,
    marginSol: 0,
  }
}
