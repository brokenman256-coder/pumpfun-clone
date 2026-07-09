import type { Token } from '../types'
import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  GRADUATION_MCAP_USD,
  marketCapUsd,
  priceSol,
} from './bondingCurve'

/** How many coins to seed on load (feels like a busy board) */
export const SEED_COUNT = 500

const ADJ = [
  'Super', 'Mega', 'Giga', 'Ultra', 'Based', 'Chad', 'Degen', 'Turbo', 'Hyper', 'Neon',
  'Pixel', 'Quantum', 'Cosmic', 'Solar', 'Lunar', 'Atomic', 'Baby', 'Mini', 'King', 'Queen',
  'Dark', 'Golden', 'Silver', 'Cyber', 'Retro', 'Alpha', 'Beta', 'Sigma', 'Omega', 'Prime',
  'Wild', 'Crazy', 'Lucky', 'Happy', 'Sad', 'Angry', 'Sleepy', 'Spicy', 'Salty', 'Sweet',
  'Pump', 'Moon', 'Rocket', 'Laser', 'Turbo', 'Ninja', 'Shadow', 'Holy', 'Cursed', 'Blessed',
]

const NOUNS = [
  'Pepe', 'Doge', 'Cat', 'Frog', 'Ape', 'Monkey', 'Rat', 'Pig', 'Duck', 'Goose',
  'Whale', 'Shark', 'Fish', 'Bird', 'Owl', 'Fox', 'Wolf', 'Bear', 'Bull', 'Horse',
  'Dragon', 'Goblin', 'Troll', 'Wizard', 'Ninja', 'Samurai', 'Pirate', 'Robot', 'Alien', 'Ghost',
  'Banana', 'Pickle', 'Pizza', 'Burger', 'Taco', 'Sushi', 'Cookie', 'Cake', 'Coffee', 'Beer',
  'Rocket', 'Moon', 'Star', 'Comet', 'Planet', 'Galaxy', 'Orbit', 'Laser', 'Sword', 'Shield',
  'Hat', 'Shoe', 'Sock', 'Glove', 'Crown', 'Ring', 'Coin', 'Bag', 'Pump', 'Dump',
  'Wojak', 'Chad', 'NPC', 'Boomer', 'Zoomer', 'Karen', 'Gigachad', 'Sigma', 'Meme', 'Clown',
]

const EMOJIS = [
  '🐸', '🐕', '🐱', '🦍', '🐀', '🐷', '🦆', '🦢', '🐋', '🦈',
  '🐟', '🐦', '🦉', '🦊', '🐺', '🐻', '🐂', '🐴', '🐉', '👺',
  '😈', '🧙', '🥷', '🤖', '👽', '👻', '🍌', '🥒', '🍕', '🍔',
  '🌮', '🍣', '🍪', '🎂', '☕', '🍺', '🚀', '🌙', '⭐', '☄️',
  '🪐', '🌌', '💫', '🔫', '⚔️', '🛡️', '🎩', '👟', '🧦', '👑',
  '💍', '🪙', '💰', '💎', '🔥', '💀', '🤡', '😎', '😭', '💪',
]

const DESCS = [
  'the next 100x no cap',
  'community first, devs last',
  'just a vibe coin tbh',
  'fair launch no team tokens',
  'we are so back',
  'this is the one fr fr',
  'rugproof (probably)',
  'born on the bonding curve',
  'only on solana',
  'touch grass after you moon',
  'liquidity locked in our hearts',
  'diamond hands only',
  'paper hands will be liquidated',
  'meme economy in full effect',
  'wen raydium? soon™',
  'dev is based and holding',
  'ct is cooking rn',
  'low mc high dreams',
  'send it or regret it',
  'the people\'s coin',
]

function randAddr(seed: number) {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  let s = ''
  let x = seed * 1103515245 + 12345
  for (let i = 0; i < 44; i++) {
    x = (x * 1103515245 + 12345) >>> 0
    s += chars[x % chars.length]
  }
  return s
}

function imageUrl(seed: string, hue: number) {
  const bg = (hue % 360).toString(16).padStart(2, '0')
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}efac`
}

function makeName(i: number) {
  const a = ADJ[i % ADJ.length]
  const b = NOUNS[(i * 7) % NOUNS.length]
  const suffix = i > ADJ.length * NOUNS.length ? ` ${i % 99}` : ''
  // occasionally reverse or combine differently
  if (i % 5 === 0) return `${b} ${a}${suffix}`
  if (i % 11 === 0) return `${a}${b}${suffix}`
  return `${a} ${b}${suffix}`
}

function makeSymbol(name: string, i: number) {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase()
  let sym = (letters.slice(0, 4) + letters.slice(-2)).slice(0, 6)
  if (sym.length < 3) sym = `TKN${i % 100}`
  // ensure uniqueness-ish
  if (i > 50) sym = `${sym.slice(0, 4)}${(i % 36).toString(36).toUpperCase()}`
  return sym.slice(0, 8)
}

function buildToken(i: number, now: number): Token {
  const name = makeName(i)
  const symbol = makeSymbol(name, i)
  const emoji = EMOJIS[i % EMOJIS.length]
  const description = DESCS[i % DESCS.length]
  const imageHue = (i * 47) % 360

  // mcap spread: many small, some mid, few near graduation
  let targetMcap: number
  const roll = (i * 13) % 100
  if (roll < 55) targetMcap = 800 + (i % 80) * 90 // $0.8k–$8k fresh
  else if (roll < 85) targetMcap = 8000 + (i % 120) * 200 // $8k–$32k
  else if (roll < 97) targetMcap = 32000 + (i % 100) * 300 // $32k–$62k
  else targetMcap = 62000 + (i % 20) * 200 // near graduate

  let virtualSol = VIRTUAL_SOL
  let virtualTokens = VIRTUAL_TOKENS
  let realSol = 0
  let realTokens = REAL_TOKEN_RESERVES

  // Fast approximate curve push using fewer iterations
  // price * supply * 150 = mcap => need virtualSol/virtualTokens ratio
  // Use closed-form-ish stepping
  let guard = 0
  while (marketCapUsd(virtualSol, virtualTokens) < targetMcap && guard < 120) {
    const buy = 0.15 + (i % 7) * 0.08
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
  const id = `tok_${i}_${symbol}`

  // age: mix of seconds to hours old
  const ageMs =
    roll < 40
      ? (i % 120) * 1000 // last 2 min
      : roll < 70
        ? (i % 60) * 60_000 // last hour
        : (i % 48) * 3600_000 // last 2 days

  return {
    id,
    name,
    symbol,
    emoji,
    description,
    imageUrl: imageUrl(`${symbol}_${i}`, imageHue),
    imageHue,
    creator: randAddr(i + 99),
    virtualSol,
    virtualTokens,
    realSol,
    realTokens,
    priceSol: priceSol(virtualSol, virtualTokens),
    marketCapUsd: mcap,
    volumeSol: realSol * (0.8 + (i % 10) * 0.15),
    replies: Math.floor((i * 17) % 400),
    complete,
    createdAt: now - ageMs,
    candles: [],
    holders: [
      { wallet: 'bonding-curve', amount: Math.max(0, realTokens), isCurve: true },
      { wallet: randAddr(i + 1).slice(0, 12) + 'dev', amount: 40_000_000 + (i % 20) * 1_000_000, isCreator: true },
      { wallet: randAddr(i + 2), amount: 5_000_000 + (i % 50) * 100_000 },
      { wallet: randAddr(i + 3), amount: 2_000_000 + (i % 30) * 50_000 },
    ],
    shake: null,
  }
}

/** Build a large board of meme coins */
export function createSeedTokens(count = SEED_COUNT): Token[] {
  const now = Date.now()
  const tokens: Token[] = []
  const usedSym = new Set<string>()

  for (let i = 0; i < count; i++) {
    let t = buildToken(i, now)
    // unique symbols
    let n = 0
    while (usedSym.has(t.symbol) && n < 20) {
      t = buildToken(i + count * (n + 1), now)
      t.symbol = `${t.symbol.slice(0, 5)}${n}`
      n++
    }
    usedSym.add(t.symbol)
    tokens.push(t)
  }

  // sort newest-first-ish mixed with volume so board feels alive
  tokens.sort((a, b) => b.createdAt - a.createdAt)
  return tokens
}

/** Spawn one brand-new coin (for continuous launch simulation) */
export function spawnRandomToken(seq: number): Token {
  const now = Date.now()
  const t = buildToken(10_000 + seq * 97, now)
  t.createdAt = now
  t.virtualSol = VIRTUAL_SOL
  t.virtualTokens = VIRTUAL_TOKENS
  t.realSol = 0
  t.realTokens = REAL_TOKEN_RESERVES
  t.priceSol = priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS)
  t.marketCapUsd = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
  t.volumeSol = 0
  t.replies = 0
  t.complete = false
  t.id = `tok_live_${seq}_${Date.now().toString(36)}`
  t.symbol = `${t.symbol.slice(0, 5)}${(seq % 36).toString(36).toUpperCase()}`.slice(0, 8)
  t.name = `${ADJ[seq % ADJ.length]} ${NOUNS[(seq * 3) % NOUNS.length]}`
  t.candles = []
  return t
}

export function randomWallet() {
  return randAddr(Math.floor(Math.random() * 1e9))
}
