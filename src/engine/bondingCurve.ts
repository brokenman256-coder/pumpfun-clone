/** Constant-product bonding curve (pump.fun-style) */

export const VIRTUAL_SOL = 30
export const VIRTUAL_TOKENS = 1_073_000_000
export const REAL_TOKEN_RESERVES = 793_100_000
export const TOTAL_SUPPLY = 1_000_000_000
export const GRADUATION_MCAP_USD = 69_000
export const SOL_PRICE_USD = 150
export const TRADE_FEE_BPS = 100 // 1%
export const CREATE_FEE_SOL = 0.02

export function getBuyQuote(
  solIn: number,
  virtualSol: number,
  virtualTokens: number,
  feeBps = TRADE_FEE_BPS,
) {
  const fee = solIn * (feeBps / 10_000)
  const solAfter = solIn - fee
  const tokensOut = (virtualTokens * solAfter) / (virtualSol + solAfter)
  return {
    tokensOut,
    fee,
    newVirtualSol: virtualSol + solAfter,
    newVirtualTokens: virtualTokens - tokensOut,
  }
}

export function getSellQuote(
  tokenIn: number,
  virtualSol: number,
  virtualTokens: number,
  feeBps = TRADE_FEE_BPS,
) {
  const solGross = (virtualSol * tokenIn) / (virtualTokens + tokenIn)
  const fee = solGross * (feeBps / 10_000)
  return {
    solOut: solGross - fee,
    fee,
    newVirtualSol: virtualSol - solGross,
    newVirtualTokens: virtualTokens + tokenIn,
  }
}

export function priceSol(virtualSol: number, virtualTokens: number) {
  return virtualSol / Math.max(virtualTokens, 1)
}

export function marketCapUsd(virtualSol: number, virtualTokens: number) {
  return priceSol(virtualSol, virtualTokens) * TOTAL_SUPPLY * SOL_PRICE_USD
}

export function progressToGraduation(mcap: number) {
  return Math.min(100, (mcap / GRADUATION_MCAP_USD) * 100)
}
