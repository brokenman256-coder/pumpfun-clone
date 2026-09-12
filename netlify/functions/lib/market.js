/** Pure JS managed-market math for serverless (mirrors src/engine/managedMarket). */

export const VIRTUAL_SOL = 30
export const VIRTUAL_TOKENS = 1_073_000_000
export const REAL_TOKEN_RESERVES = 793_100_000
export const TOTAL_SUPPLY = 1_000_000_000
export const GRADUATION_MCAP_USD = 69_000
export const SOL_PRICE_USD = 150
export const PLATFORM_MARGIN_BPS = 500
export const SELL_SAFETY_BPS = 50

export function getBuyQuote(solIn, virtualSol, virtualTokens) {
  const tokensOut = (virtualTokens * solIn) / (virtualSol + solIn)
  return {
    tokensOut,
    newVirtualSol: virtualSol + solIn,
    newVirtualTokens: virtualTokens - tokensOut,
  }
}

export function getSellQuote(tokenIn, virtualSol, virtualTokens) {
  const solGross = (virtualSol * tokenIn) / (virtualTokens + tokenIn)
  return {
    solOut: solGross,
    newVirtualSol: virtualSol - solGross,
    newVirtualTokens: virtualTokens + tokenIn,
  }
}

export function priceSol(vSol, vTok) {
  return vSol / Math.max(vTok, 1)
}

export function marketCapUsd(vSol, vTok) {
  return priceSol(vSol, vTok) * TOTAL_SUPPLY * SOL_PRICE_USD
}

function bps(amount, basisPoints) {
  return amount * (basisPoints / 10_000)
}

export function managedBuyQuote(solIn, r) {
  if (solIn <= 0) return null
  const margin = bps(solIn, PLATFORM_MARGIN_BPS)
  const solToCurve = solIn - margin
  if (solToCurve <= 0) return null
  const q = getBuyQuote(solToCurve, r.virtualSol, r.virtualTokens)
  if (q.tokensOut <= 0) return null
  const px = priceSol(q.newVirtualSol, q.newVirtualTokens)
  const mcap = marketCapUsd(q.newVirtualSol, q.newVirtualTokens)
  return {
    tokensOut: q.tokensOut,
    margin,
    solToCurve,
    solPaid: solIn,
    newVirtualSol: q.newVirtualSol,
    newVirtualTokens: q.newVirtualTokens,
    newCurveSol: (r.curveSol || 0) + solToCurve,
    newMarginSol: (r.marginSol || 0) + margin,
    priceSol: px,
    marketCapUsd: mcap,
    graduated: mcap >= GRADUATION_MCAP_USD,
  }
}

export function managedSellQuote(tokenIn, r) {
  if (tokenIn <= 0) return null
  const q = getSellQuote(tokenIn, r.virtualSol, r.virtualTokens)
  if (q.solOut <= 0) return null
  const solGross = q.solOut
  const margin = bps(solGross, PLATFORM_MARGIN_BPS)
  const solOut = solGross - margin
  const safety = bps(solOut, SELL_SAFETY_BPS)
  const canPayout = (r.curveSol || 0) >= solOut + safety
  return {
    solGross,
    margin,
    solOut,
    newVirtualSol: q.newVirtualSol,
    newVirtualTokens: q.newVirtualTokens,
    newCurveSol: Math.max(0, (r.curveSol || 0) - solOut),
    newMarginSol: (r.marginSol || 0) + margin,
    priceSol: priceSol(q.newVirtualSol, q.newVirtualTokens),
    marketCapUsd: marketCapUsd(q.newVirtualSol, q.newVirtualTokens),
    canPayout,
  }
}

export function solToReachMcap(targetMcapUsd) {
  if (targetMcapUsd <= marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)) return 0
  let vSol = VIRTUAL_SOL
  let vTok = VIRTUAL_TOKENS
  let spent = 0
  for (let i = 0; i < 40; i++) {
    if (marketCapUsd(vSol, vTok) >= targetMcapUsd) break
    const step = Math.max(0.01, vSol * 0.08)
    const q = getBuyQuote(step, vSol, vTok)
    vSol = q.newVirtualSol
    vTok = q.newVirtualTokens
    spent += step
  }
  return spent
}

export function seedReservesToMcap(targetMcapUsd) {
  const base = {
    virtualSol: VIRTUAL_SOL,
    virtualTokens: VIRTUAL_TOKENS,
    curveSol: 0,
    marginSol: 0,
  }
  const need = solToReachMcap(targetMcapUsd)
  if (need <= 0) return { ...base, seedSol: 0, seedTokens: 0, realTokens: REAL_TOKEN_RESERVES }
  const gross = need / (1 - PLATFORM_MARGIN_BPS / 10_000)
  const buy = managedBuyQuote(gross, base)
  if (!buy) return { ...base, seedSol: 0, seedTokens: 0, realTokens: REAL_TOKEN_RESERVES }
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

export function randomBotTargetMcap() {
  const base = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
  const mult = 1.05 + Math.random() * 5.5
  return Math.min(GRADUATION_MCAP_USD * 0.4, base * mult)
}
