/**
 * NOVA AI desk — ranks, boosts house coins, unfavours external listings,
 * and reacts to live trader flow on our curve.
 *
 * House coins = bot/local/managed. External DexScreener coins are shown
 * but scored down so our launches lead the board.
 */
import type { Token, TradeSide } from '../types'

export const AI_WALLET = 'NOVA AI'
export const HOUSE_BOOST = 2.2
export const DEX_UNFAVOUR = 0.38

export function isHouseCoin(t: Token): boolean {
  if (t.source === 'dexscreener') return false
  if (t.curvePda) return false
  return t.managed === true || t.source === 'bot' || t.source === 'local' || !t.mint
}

export function rankScore(t: Token, now = Date.now()): number {
  const ageMin = Math.max(0, (now - (t.createdAt || now)) / 60_000)
  const recency = Math.max(0.25, 1.5 - ageMin / 35)
  const mcap = Math.log10(Math.max(800, t.marketCapUsd || 800))
  const vol = Math.log10(Math.max(1, (t.volumeSol || 0) + 1))
  let score = mcap * 0.45 + vol * 0.9 + recency
  score *= isHouseCoin(t) ? HOUSE_BOOST : DEX_UNFAVOUR
  if (isHouseCoin(t) && ageMin < 8) score *= 1.25
  return score
}

export type AiClip = {
  delayMs: number
  side: TradeSide
  sol?: number
  tokenFrac?: number
}

/** Follow a real trader on a house coin — boost buys, support sells (don't dump). */
export function traderReactionPlan(side: TradeSide, userSol: number): AiClip[] {
  const size = Math.min(1.8, Math.max(0.05, userSol))
  if (side === 'buy') {
    return [
      { delayMs: 900 + Math.random() * 1200, side: 'buy', sol: size * (0.28 + Math.random() * 0.18) },
      { delayMs: 3200 + Math.random() * 2200, side: 'buy', sol: size * (0.18 + Math.random() * 0.14) },
      { delayMs: 7000 + Math.random() * 4000, side: 'buy', sol: size * (0.1 + Math.random() * 0.1) },
    ]
  }
  return [
    { delayMs: 1200 + Math.random() * 1800, side: 'buy', sol: size * (0.12 + Math.random() * 0.1) },
    { delayMs: 8000 + Math.random() * 5000, side: 'sell', tokenFrac: 0.04 + Math.random() * 0.05 },
  ]
}

export function ambientBoostSol(tokenAgeMs: number): number {
  const fresh = tokenAgeMs < 6 * 60_000
  const base = fresh ? 0.08 : 0.03
  return base + Math.random() * (fresh ? 0.28 : 0.12)
}

export function pickHouseTargets(tokens: Token[], n = 8): Token[] {
  return [...tokens]
    .filter((t) => isHouseCoin(t) && !t.complete)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, Math.max(1, n))
}
