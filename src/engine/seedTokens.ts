import type { Token } from '../types'
import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  GRADUATION_MCAP_USD,
  marketCapUsd,
  priceSol,
} from './bondingCurve'

const SEEDS: {
  name: string
  symbol: string
  emoji: string
  description: string
  imageHue: number
}[] = [
  { name: 'Pepe Supreme', symbol: 'PEPES', emoji: '🐸', description: 'the most memeable frog on solana', imageHue: 120 },
  { name: 'Doge Moon', symbol: 'DMOON', emoji: '🐕', description: 'much wow very moon', imageHue: 40 },
  { name: 'Wojak Tears', symbol: 'WOJAK', emoji: '😭', description: 'i know that feel bro', imageHue: 200 },
  { name: 'Catwifhat', symbol: 'CWIF', emoji: '🐱', description: 'a cat. with a hat. obviously', imageHue: 330 },
  { name: 'Bonk Army', symbol: 'BONKA', emoji: '🦴', description: 'bonk the competition', imageHue: 25 },
  { name: 'Solana Sloth', symbol: 'SLOTH', emoji: '🦥', description: 'slow and steady rugs you last', imageHue: 80 },
  { name: 'Giga Chad', symbol: 'GIGA', emoji: '💪', description: 'yes. just yes.', imageHue: 210 },
  { name: 'NPC Coin', symbol: 'NPC', emoji: '🤖', description: 'wake up you are in a simulation', imageHue: 280 },
  { name: 'Fartcoin Jr', symbol: 'FARTJ', emoji: '💨', description: 'silent but deadly', imageHue: 160 },
  { name: 'Popcat Pop', symbol: 'POPP', emoji: '😺', description: 'pop pop pop', imageHue: 15 },
  { name: 'AI Overlord', symbol: 'AIOL', emoji: '🧠', description: 'we are already in charge', imageHue: 260 },
  { name: 'Laser Eyes', symbol: 'LASER', emoji: '👀', description: 'laser eyes never die', imageHue: 0 },
  { name: 'Based Frog', symbol: 'BASED', emoji: '🐸', description: 'based and coin pilled', imageHue: 140 },
  { name: 'Crypto Clown', symbol: 'CLOWN', emoji: '🤡', description: 'we are all clowns here', imageHue: 350 },
  { name: 'Moon Bag', symbol: 'MBAG', emoji: '🎒', description: 'never selling the bag', imageHue: 190 },
  { name: 'Pumpkin Spice', symbol: 'PSPICE', emoji: '🎃', description: 'seasonal degen energy', imageHue: 30 },
  { name: 'Goblin Mode', symbol: 'GOBLIN', emoji: '👺', description: 'no thoughts just vibes', imageHue: 100 },
  { name: 'Banana Zone', symbol: 'BNANA', emoji: '🍌', description: 'slip into the zone', imageHue: 50 },
  { name: 'Rizzler', symbol: 'RIZZ', emoji: '😎', description: 'unspoken rizz on chain', imageHue: 220 },
  { name: 'Skibidi Sol', symbol: 'SKBD', emoji: '🚽', description: 'skibidi bop yes yes', imageHue: 300 },
  { name: 'ChadGPT', symbol: 'CGPT', emoji: '🤖', description: 'chatgpt but jacked', imageHue: 175 },
  { name: 'Pixel Ape', symbol: 'PAPE', emoji: '🦍', description: '8-bit ape energy', imageHue: 10 },
  { name: 'Trollface', symbol: 'TROLL', emoji: '😈', description: 'problem?', imageHue: 320 },
  { name: 'Diamond Hands', symbol: 'DIAM', emoji: '💎', description: 'paper hands not allowed', imageHue: 195 },
  { name: 'Rocket Rat', symbol: 'RRAT', emoji: '🐀', description: 'rats in the rocket', imageHue: 70 },
  { name: 'Meme Lord', symbol: 'MLORD', emoji: '👑', description: 'bow to the meme economy', imageHue: 45 },
  { name: 'Solana Salmon', symbol: 'SALM', emoji: '🐟', description: 'swimming upstream to ath', imageHue: 340 },
  { name: 'Nyan Pump', symbol: 'NYAN', emoji: '🌈', description: 'nyan nyan nyan pump', imageHue: 290 },
]

function randAddr() {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let s = ''
  for (let i = 0; i < 44; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function imageUrl(seed: string, hue: number) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${hue.toString(16).padStart(2, '0')}efac`
}

/** Build tokens with varied mcaps by applying synthetic buy pressure */
export function createSeedTokens(): Token[] {
  const now = Date.now()
  return SEEDS.map((s, i) => {
    // distribute mcaps roughly $4k–$62k
    const targetMcap = 4000 + ((i * 7919) % 58000)
    let virtualSol = VIRTUAL_SOL
    let virtualTokens = VIRTUAL_TOKENS
    let realSol = 0
    let realTokens = REAL_TOKEN_RESERVES

    // approximate buys until near target mcap
    let guard = 0
    while (marketCapUsd(virtualSol, virtualTokens) < targetMcap && guard < 80) {
      const buy = 0.3 + (i % 5) * 0.15
      const fee = buy * 0.01
      const solAfter = buy - fee
      const tokensOut = (virtualTokens * solAfter) / (virtualSol + solAfter)
      virtualSol += solAfter
      virtualTokens -= tokensOut
      realSol += buy
      realTokens -= tokensOut
      guard++
    }

    const mcap = marketCapUsd(virtualSol, virtualTokens)
    const complete = mcap >= GRADUATION_MCAP_USD

    const id = `tok_${i}_${s.symbol}`
    return {
      id,
      name: s.name,
      symbol: s.symbol,
      emoji: s.emoji,
      description: s.description,
      imageUrl: imageUrl(s.symbol + i, s.imageHue),
      imageHue: s.imageHue,
      creator: randAddr(),
      virtualSol,
      virtualTokens,
      realSol,
      realTokens,
      priceSol: priceSol(virtualSol, virtualTokens),
      marketCapUsd: mcap,
      volumeSol: realSol * 1.4,
      replies: Math.floor(Math.random() * 120),
      complete,
      createdAt: now - (SEEDS.length - i) * 45_000 - Math.random() * 60_000,
      candles: [],
      holders: [
        { wallet: 'bonding-curve', amount: realTokens, isCurve: true },
        { wallet: randAddr().slice(0, 8) + 'creator', amount: 50_000_000, isCreator: true },
      ],
      shake: null,
    } as Token
  })
}

export function randomWallet() {
  return randAddr()
}
