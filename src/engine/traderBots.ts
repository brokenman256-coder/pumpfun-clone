/**
 * Free multi-account trader bots — pure in-app market making.
 * No Phantom, no gas, no RPC. Buys pump mcap; delayed sells take profit.
 */

export type TraderPersona = {
  id: string
  name: string
  /** Bias toward buying (0–1) */
  buyBias: number
  /** Typical trade size in SOL */
  sizeMin: number
  sizeMax: number
  /** How long (ms) to hold before profit-taking sells kick in */
  holdMs: number
  /** Max SOL this bot may deploy per session (virtual) */
  bankroll: number
}

/** Distinct “accounts” that trade the board */
export const TRADER_PERSONAS: TraderPersona[] = [
  { id: 'bot_whale_01', name: 'WhaleAlpha', buyBias: 0.72, sizeMin: 0.4, sizeMax: 2.2, holdMs: 90_000, bankroll: 80 },
  { id: 'bot_degen_02', name: 'DegenApe', buyBias: 0.78, sizeMin: 0.08, sizeMax: 0.55, holdMs: 45_000, bankroll: 25 },
  { id: 'bot_sniper_03', name: 'CurveSniper', buyBias: 0.85, sizeMin: 0.15, sizeMax: 0.9, holdMs: 35_000, bankroll: 30 },
  { id: 'bot_retail_04', name: 'RetailFren', buyBias: 0.62, sizeMin: 0.03, sizeMax: 0.2, holdMs: 120_000, bankroll: 12 },
  { id: 'bot_swing_05', name: 'SwingSer', buyBias: 0.55, sizeMin: 0.2, sizeMax: 1.0, holdMs: 150_000, bankroll: 40 },
  { id: 'bot_farm_06', name: 'VolumeFarm', buyBias: 0.5, sizeMin: 0.05, sizeMax: 0.35, holdMs: 25_000, bankroll: 20 },
  { id: 'bot_smart_07', name: 'SmartBag', buyBias: 0.48, sizeMin: 0.25, sizeMax: 1.4, holdMs: 100_000, bankroll: 50 },
  { id: 'bot_fomo_08', name: 'FomoKid', buyBias: 0.88, sizeMin: 0.1, sizeMax: 0.7, holdMs: 40_000, bankroll: 18 },
  { id: 'bot_exit_09', name: 'ExitLiquidity', buyBias: 0.35, sizeMin: 0.15, sizeMax: 0.8, holdMs: 20_000, bankroll: 22 },
  { id: 'bot_night_10', name: 'NightOwl', buyBias: 0.65, sizeMin: 0.06, sizeMax: 0.4, holdMs: 80_000, bankroll: 15 },
]

export type BotHolding = {
  tokens: number
  costSol: number
  boughtAt: number
}

export type TraderState = {
  persona: TraderPersona
  sol: number
  /** tokenId → holding */
  bags: Record<string, BotHolding>
}

export function createTraderFleet(): TraderState[] {
  return TRADER_PERSONAS.map((p) => ({
    persona: p,
    sol: p.bankroll,
    bags: {},
  }))
}

export function pickPersona(fleet: TraderState[]): TraderState {
  return fleet[(Math.random() * fleet.length) | 0]
}

export function tradeSize(p: TraderPersona): number {
  return p.sizeMin + Math.random() * (p.sizeMax - p.sizeMin)
}

/** Decide buy vs sell for this tick */
export function decideSide(
  trader: TraderState,
  tokenId: string,
  tokenAgeMs: number,
): 'buy' | 'sell' | 'skip' {
  const bag = trader.bags[tokenId]
  const p = trader.persona

  // No bag → mostly buy (if bankroll left)
  if (!bag || bag.tokens <= 1) {
    if (trader.sol < p.sizeMin * 0.5) return 'skip'
    return Math.random() < p.buyBias ? 'buy' : 'skip'
  }

  // Holding long enough → chance to sell (profit / rotate)
  const held = Date.now() - bag.boughtAt
  if (held > p.holdMs && Math.random() < 0.55) return 'sell'
  // Early dump personas
  if (held > p.holdMs * 0.4 && p.buyBias < 0.45 && Math.random() < 0.4) return 'sell'
  // New coin FOMO buys
  if (tokenAgeMs < 60_000 && Math.random() < p.buyBias) return 'buy'
  // Default mix
  if (trader.sol > p.sizeMin && Math.random() < p.buyBias * 0.7) return 'buy'
  if (bag.tokens > 0 && Math.random() < 0.35) return 'sell'
  return 'skip'
}

export function sellFraction(trader: TraderState, tokenId: string): number {
  const bag = trader.bags[tokenId]
  if (!bag) return 0
  // Sell 25–100% of bag
  return bag.tokens * (0.25 + Math.random() * 0.75)
}
