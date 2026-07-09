import type { Token } from '../types'
import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  marketCapUsd,
  priceSol,
} from './bondingCurve'

export const SEED_COUNT = 120

const NAMES = [
  'Pepe', 'Doge', 'Wojak', 'Bonk', 'Popcat', 'Wif', 'MooDeng', 'Goat',
  'ChillGuy', 'Fartcoin', 'Neiro', 'Ai16z', 'Act', 'Zerebro', 'Virtual',
  'Pengu', 'Meow', 'Trump', 'Melania', 'Giga', 'Sigma', 'Based', 'Chad',
  'Frog', 'Cat', 'Dog', 'Moon', 'Rocket', 'Pump', 'Solana', 'Meme',
]

const EMOJIS = ['🐸', '🐕', '🚀', '💊', '🌙', '🔥', '💎', '🦍', '🐱', '👑', '⚡', '🟢']

export function randomWallet() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let s = ''
  for (let i = 0; i < 44; i++) s += chars[(Math.random() * chars.length) | 0]
  return s
}

function pick<T>(arr: T[]) {
  return arr[(Math.random() * arr.length) | 0]
}

export function createSeedTokens(count = SEED_COUNT): Token[] {
  const now = Date.now()
  const tokens: Token[] = []
  for (let i = 0; i < count; i++) {
    const nameBase = pick(NAMES)
    const name = `${nameBase} ${pick(['Coin', 'Inu', 'AI', 'Sol', 'Fun', ''])}`.trim()
    const symbol = nameBase.slice(0, 6).toUpperCase() + (i % 9 || '')
    const progress = Math.random()
    const virtualSol = VIRTUAL_SOL + progress * 50
    const virtualTokens = VIRTUAL_TOKENS / (1 + progress * 2)
    const mcap = marketCapUsd(virtualSol, virtualTokens)
    tokens.push({
      id: `mint_${i}_${symbol.toLowerCase()}`,
      name,
      symbol,
      emoji: pick(EMOJIS),
      description: `${name} — launched on the bonding curve. NFA.`,
      imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}${i}&backgroundColor=0e0f13,15161b,86efac`,
      imageHue: (i * 47) % 360,
      creator: randomWallet(),
      virtualSol,
      virtualTokens,
      realSol: progress * 20,
      realTokens: REAL_TOKEN_RESERVES * (1 - progress * 0.5),
      priceSol: priceSol(virtualSol, virtualTokens),
      marketCapUsd: mcap,
      volumeSol: Math.random() * 40,
      replies: (Math.random() * 80) | 0,
      complete: mcap >= 69_000 * 0.95 && Math.random() > 0.85,
      createdAt: now - Math.random() * 86_400_000 * 3,
      candles: [],
      holders: [],
      shake: null,
    })
  }
  return tokens.sort((a, b) => b.createdAt - a.createdAt)
}

export function spawnRandomToken(seq: number): Token {
  const nameBase = pick(NAMES)
  const symbol = (nameBase.slice(0, 5) + seq).toUpperCase().slice(0, 8)
  return {
    id: `live_${seq}_${Date.now().toString(36)}`,
    name: `${nameBase} ${seq}`,
    symbol,
    emoji: pick(EMOJIS),
    description: `Fresh launch #${seq}`,
    imageUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${symbol}&backgroundColor=86efac`,
    imageHue: (seq * 31) % 360,
    creator: randomWallet(),
    virtualSol: VIRTUAL_SOL,
    virtualTokens: VIRTUAL_TOKENS,
    realSol: 0,
    realTokens: REAL_TOKEN_RESERVES,
    priceSol: priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS),
    marketCapUsd: marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS),
    volumeSol: 0,
    replies: 0,
    complete: false,
    createdAt: Date.now(),
    candles: [],
    holders: [],
    shake: null,
  }
}
