/**
 * Managed market engine — system-owned bonding curves for board coins.
 *
 * Traders pay/receive real SOL via Phantom (treasury + bot wallet payout).
 * Price, supply, mcap, and candles are managed here so trading works without
 * pre-funding a separate liquidity pool per coin.
 *
 * Platform margin: 5% on every buy and sell (reserved, never paid out as
 * trader proceeds). That buffer funds ops and keeps sell payouts solvent.
 */

import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  TOTAL_SUPPLY,
  GRADUATION_MCAP_USD,
  SOL_PRICE_USD,
  getBuyQuote,
  getSellQuote,
  priceSol,
  marketCapUsd,
} from './bondingCurve'

/** Safe platform margin — 5% */
export const PLATFORM_MARGIN_BPS = 500

/** Extra buffer kept in curve before allowing a sell payout (bps of solOut) */
export const SELL_SAFETY_BPS = 50

export type ManagedReserves = {
  virtualSol: number
  virtualTokens: number
  /** Real SOL deposited by buyers (available for sells after margin) */
  curveSol: number
  /** Cumulative platform margin retained (SOL) */
  marginSol: number
  realTokens: number
}

export type ManagedBuyResult = {
  tokensOut: number
  fee: number
  margin: number
  solToCurve: number
  solPaid: number
  newVirtualSol: number
  newVirtualTokens: number
  newCurveSol: number
  newMarginSol: number
  priceSol: number
  marketCapUsd: number
  graduated: boolean
}

export type ManagedSellResult = {
  solGross: number
  margin: number
  solOut: number
  fee: number
  newVirtualSol: number
  newVirtualTokens: number
  newCurveSol: number
  newMarginSol: number
  priceSol: number
  marketCapUsd: number
  /** True when curveSol can cover solOut + safety buffer */
  canPayout: boolean
}

export function initialManagedReserves(): ManagedReserves {
  return {
    virtualSol: VIRTUAL_SOL,
    virtualTokens: VIRTUAL_TOKENS,
    curveSol: 0,
    marginSol: 0,
    realTokens: REAL_TOKEN_RESERVES,
  }
}

function bps(amount: number, basisPoints: number) {
  return amount * (basisPoints / 10_000)
}

/** Quote a managed buy: trader pays solIn; 5% margin; rest hits the curve. */
export function managedBuyQuote(
  solIn: number,
  r: ManagedReserves,
  marginBps = PLATFORM_MARGIN_BPS,
): ManagedBuyResult | null {
  if (solIn <= 0) return null
  const margin = bps(solIn, marginBps)
  const solToCurve = solIn - margin
  if (solToCurve <= 0) return null

  const q = getBuyQuote(solToCurve, r.virtualSol, r.virtualTokens, 0)
  if (q.tokensOut <= 0) return null

  const newPrice = priceSol(q.newVirtualSol, q.newVirtualTokens)
  const newMcap = marketCapUsd(q.newVirtualSol, q.newVirtualTokens)

  return {
    tokensOut: q.tokensOut,
    fee: 0,
    margin,
    solToCurve,
    solPaid: solIn,
    newVirtualSol: q.newVirtualSol,
    newVirtualTokens: q.newVirtualTokens,
    newCurveSol: r.curveSol + solToCurve,
    newMarginSol: r.marginSol + margin,
    priceSol: newPrice,
    marketCapUsd: newMcap,
    graduated: newMcap >= GRADUATION_MCAP_USD,
  }
}

/**
 * Quote a managed sell. Trader receives solOut = gross - 5% margin.
 * canPayout is false if curve liquidity cannot cover the payout safely.
 */
export function managedSellQuote(
  tokenIn: number,
  r: ManagedReserves,
  marginBps = PLATFORM_MARGIN_BPS,
): ManagedSellResult | null {
  if (tokenIn <= 0) return null
  const q = getSellQuote(tokenIn, r.virtualSol, r.virtualTokens, 0)
  if (q.solOut <= 0) return null

  const solGross = q.solOut
  const margin = bps(solGross, marginBps)
  const solOut = solGross - margin
  const safety = bps(solOut, SELL_SAFETY_BPS)
  const need = solOut + safety
  const newCurveSol = Math.max(0, r.curveSol - solOut)
  const canPayout = r.curveSol >= need

  return {
    solGross,
    margin,
    solOut,
    fee: 0,
    newVirtualSol: q.newVirtualSol,
    newVirtualTokens: q.newVirtualTokens,
    newCurveSol,
    newMarginSol: r.marginSol + margin,
    priceSol: priceSol(q.newVirtualSol, q.newVirtualTokens),
    marketCapUsd: marketCapUsd(q.newVirtualSol, q.newVirtualTokens),
    canPayout,
  }
}

/**
 * Approximate SOL into the curve required to reach a target mcap (USD),
 * starting from initial virtual reserves. Iterative (constant product).
 */
export function solToReachMcap(targetMcapUsd: number): number {
  if (targetMcapUsd <= marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)) return 0
  let vSol = VIRTUAL_SOL
  let vTok = VIRTUAL_TOKENS
  let spent = 0
  // Cap iterations so we never loop forever on huge targets
  for (let i = 0; i < 40; i++) {
    const mcap = marketCapUsd(vSol, vTok)
    if (mcap >= targetMcapUsd) break
    // Grow by 8% of virtual SOL each step (damped as we approach)
    const step = Math.max(0.01, vSol * 0.08)
    const q = getBuyQuote(step, vSol, vTok, 0)
    vSol = q.newVirtualSol
    vTok = q.newVirtualTokens
    spent += step
  }
  return spent
}

/**
 * Seed a brand-new curve toward a target mcap using a synthetic seed buy.
 * Returns reserves after seed; margin is taken on the seed too (5%).
 */
export function seedReservesToMcap(
  targetMcapUsd: number,
  marginBps = PLATFORM_MARGIN_BPS,
): ManagedReserves & { seedSol: number; seedTokens: number } {
  const base = initialManagedReserves()
  const curveSolNeeded = solToReachMcap(targetMcapUsd)
  if (curveSolNeeded <= 0) {
    return { ...base, seedSol: 0, seedTokens: 0 }
  }
  // Gross paid so that after 5% margin the curve receives curveSolNeeded
  const gross = curveSolNeeded / (1 - marginBps / 10_000)
  const buy = managedBuyQuote(gross, base, marginBps)
  if (!buy) return { ...base, seedSol: 0, seedTokens: 0 }
  return {
    virtualSol: buy.newVirtualSol,
    virtualTokens: buy.newVirtualTokens,
    curveSol: buy.newCurveSol,
    marginSol: buy.newMarginSol,
    realTokens: Math.max(0, REAL_TOKEN_RESERVES - buy.tokensOut),
    seedSol: buy.solPaid,
    seedTokens: buy.tokensOut,
  }
}

/** Random target mcap band for bot launches (USD). Keeps board lively but below graduation. */
export function randomBotTargetMcap(): number {
  const base = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
  // ~$4.5k start → random between ~$5k and ~$28k
  const mult = 1.05 + Math.random() * 5.5
  return Math.min(GRADUATION_MCAP_USD * 0.4, base * mult)
}

export function reservesFromToken(t: {
  virtualSol: number
  virtualTokens: number
  realSol?: number
  realTokens?: number
  curveSol?: number
  marginSol?: number
}): ManagedReserves {
  return {
    virtualSol: t.virtualSol,
    virtualTokens: t.virtualTokens,
    curveSol: t.curveSol ?? t.realSol ?? 0,
    marginSol: t.marginSol ?? 0,
    realTokens: t.realTokens ?? REAL_TOKEN_RESERVES,
  }
}

export { TOTAL_SUPPLY, SOL_PRICE_USD, GRADUATION_MCAP_USD, REAL_TOKEN_RESERVES }
