/**
 * Free multi-account trader bots — 100–150 rotating usernames.
 * Zero gas. Buys pump; delayed sells take profit.
 * After each trade the display name rotates so the tape looks like many humans.
 */

const ADJ = [
  'Silent', 'Crazy', 'Lucky', 'Dark', 'Bright', 'Chill', 'Wild', 'Quick', 'Sneaky',
  'Based', 'Alpha', 'Sigma', 'Neon', 'Solar', 'Moon', 'Ghost', 'Iron', 'Golden',
  'Fuzzy', 'Spicy', 'Icy', 'Hyper', 'Lazy', 'Turbo', 'Pixel', 'Crypto', 'Degen',
  'Whale', 'Mini', 'Mega', 'Ultra', 'Cosmic', 'Atomic', 'Frozen', 'Blazing',
  'Quiet', 'Loud', 'Salty', 'Sweet', 'Bitter', 'Sharp', 'Soft', 'Hard', 'Raw',
]

const NOUN = [
  'Ape', 'Fox', 'Wolf', 'Cat', 'Dog', 'Frog', 'Owl', 'Bear', 'Bull', 'Hawk',
  'Shark', 'Tiger', 'Panda', 'Koala', 'Otter', 'Raven', 'Viper', 'Dragon',
  'Ninja', 'Wizard', 'Pirate', 'Knight', 'Samurai', 'Ghost', 'Alien', 'Robot',
  'Trader', 'Sniper', 'Farmer', 'Degen', 'Whale', 'Shrimp', 'Crab', 'Fish',
  'Moon', 'Rocket', 'Bag', 'Edge', 'Pulse', 'Wave', 'Storm', 'Flame',
]

const SUFFIX = [
  'x', 'z', 'hq', 'sol', 'fi', 'io', 'gg', 'xyz', 'eth', 'fun', 'lab', 'dao',
  'pro', 'vip', 'og', '247', '69', '420', '007', '99', '11', '88', '777',
]

export type TraderPersona = {
  id: string
  name: string
  buyBias: number
  sizeMin: number
  sizeMax: number
  holdMs: number
  bankroll: number
}

export type BotHolding = {
  tokens: number
  costSol: number
  boughtAt: number
}

export type TraderState = {
  persona: TraderPersona
  sol: number
  bags: Record<string, BotHolding>
  /** Current display handle shown on the tape */
  displayName: string
  tradeCount: number
}

export const FLEET_SIZE = 130

function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0]
}

/** Fresh username — used after every trade */
export function generateUsername(seed?: number): string {
  const n = seed ?? (Math.random() * 1e9) | 0
  const style = n % 5
  if (style === 0) return `${pick(ADJ)}${pick(NOUN)}${(n % 900) + 100}`
  if (style === 1) return `${pick(NOUN)}_${pick(SUFFIX)}${n % 100}`
  if (style === 2) return `${pick(ADJ).toLowerCase()}${pick(NOUN).toLowerCase()}${n % 999}`
  if (style === 3) return `0x${pick(NOUN)}${(n % 9000) + 1000}`
  return `${pick(ADJ)}${pick(SUFFIX)}${(n % 99) + 1}`
}

function makePersona(i: number): TraderPersona {
  // Mix of whales, retail, snipers, exit liquidity
  const roll = i % 10
  if (roll === 0) {
    return {
      id: `fleet_${i}`,
      name: generateUsername(i * 17),
      buyBias: 0.7 + Math.random() * 0.15,
      sizeMin: 0.5,
      sizeMax: 2.5,
      holdMs: 60_000 + Math.random() * 120_000,
      bankroll: 60 + Math.random() * 80,
    }
  }
  if (roll === 1 || roll === 2) {
    return {
      id: `fleet_${i}`,
      name: generateUsername(i * 31),
      buyBias: 0.8 + Math.random() * 0.12,
      sizeMin: 0.08,
      sizeMax: 0.6,
      holdMs: 25_000 + Math.random() * 50_000,
      bankroll: 15 + Math.random() * 25,
    }
  }
  if (roll === 3) {
    return {
      id: `fleet_${i}`,
      name: generateUsername(i * 41),
      buyBias: 0.32 + Math.random() * 0.15,
      sizeMin: 0.1,
      sizeMax: 0.9,
      holdMs: 12_000 + Math.random() * 40_000,
      bankroll: 18 + Math.random() * 30,
    }
  }
  return {
    id: `fleet_${i}`,
    name: generateUsername(i * 53),
    buyBias: 0.5 + Math.random() * 0.3,
    sizeMin: 0.03,
    sizeMax: 0.45,
    holdMs: 40_000 + Math.random() * 100_000,
    bankroll: 10 + Math.random() * 35,
  }
}

export function createTraderFleet(count = FLEET_SIZE): TraderState[] {
  const n = Math.min(150, Math.max(100, count))
  return Array.from({ length: n }, (_, i) => {
    const persona = makePersona(i)
    return {
      persona,
      sol: persona.bankroll,
      bags: {},
      displayName: persona.name,
      tradeCount: 0,
    }
  })
}

/** Rotate public handle after a trade */
export function rotateDisplayName(trader: TraderState): TraderState {
  const next = generateUsername(Date.now() + trader.tradeCount * 9973)
  return {
    ...trader,
    displayName: next,
    tradeCount: trader.tradeCount + 1,
    persona: { ...trader.persona, name: next },
  }
}

export function pickPersona(fleet: TraderState[]): TraderState {
  return fleet[(Math.random() * fleet.length) | 0]
}

export function tradeSize(p: TraderPersona): number {
  return p.sizeMin + Math.random() * (p.sizeMax - p.sizeMin)
}

export function decideSide(
  trader: TraderState,
  tokenId: string,
  tokenAgeMs: number,
): 'buy' | 'sell' | 'skip' {
  const bag = trader.bags[tokenId]
  const p = trader.persona

  if (!bag || bag.tokens <= 1) {
    if (trader.sol < p.sizeMin * 0.5) return 'skip'
    return Math.random() < p.buyBias ? 'buy' : 'skip'
  }

  const held = Date.now() - bag.boughtAt
  if (held > p.holdMs && Math.random() < 0.55) return 'sell'
  if (held > p.holdMs * 0.4 && p.buyBias < 0.45 && Math.random() < 0.4) return 'sell'
  if (tokenAgeMs < 60_000 && Math.random() < p.buyBias) return 'buy'
  if (trader.sol > p.sizeMin && Math.random() < p.buyBias * 0.7) return 'buy'
  if (bag.tokens > 0 && Math.random() < 0.35) return 'sell'
  return 'skip'
}

export function sellFraction(trader: TraderState, tokenId: string): number {
  const bag = trader.bags[tokenId]
  if (!bag) return 0
  return bag.tokens * (0.25 + Math.random() * 0.75)
}

/**
 * Human-like sell sequence after a real user invests.
 * Staggered partial sells over minutes — not a single dump.
 */
export type HumanSellStep = {
  delayMs: number
  /** Fraction of *current bot inventory on this token* to sell (0–1) */
  sellFrac: number
  /** Optional small buy first (fear of missing more) */
  preBuySol?: number
}

export function planHumanSellSequence(userSolIn: number): HumanSellStep[] {
  // Scale reaction to size of user buy
  const intensity = Math.min(1.5, 0.4 + userSolIn * 0.35)
  const steps: HumanSellStep[] = []

  // 1) Pause — humans don't sell instantly
  // 2) Small "nervous" sell
  steps.push({
    delayMs: 8_000 + Math.random() * 15_000,
    sellFrac: 0.08 * intensity + Math.random() * 0.06,
  })
  // 3) Maybe a tiny FOMO buy from another account feel
  if (Math.random() > 0.45) {
    steps.push({
      delayMs: 20_000 + Math.random() * 25_000,
      sellFrac: 0,
      preBuySol: 0.05 + Math.random() * 0.2 * intensity,
    })
  }
  // 4) Medium distribution
  steps.push({
    delayMs: 45_000 + Math.random() * 40_000,
    sellFrac: 0.15 * intensity + Math.random() * 0.1,
  })
  // 5) Another pause sell
  steps.push({
    delayMs: 90_000 + Math.random() * 60_000,
    sellFrac: 0.12 + Math.random() * 0.12,
  })
  // 6) Final drip (partial, not full nuke)
  steps.push({
    delayMs: 150_000 + Math.random() * 90_000,
    sellFrac: 0.18 + Math.random() * 0.15,
  })

  return steps
}

/** Pick N distinct fleet members for a reaction sequence */
export function pickActors(fleet: TraderState[], n: number): number[] {
  const idxs = fleet.map((_, i) => i)
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
  }
  return idxs.slice(0, Math.min(n, idxs.length))
}
