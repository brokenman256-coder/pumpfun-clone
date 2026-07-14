/**
 * Client helpers for managed-market Phantom trades.
 * Buy → SOL to treasury. Sell → payout from bot wallet via /api/managed-sell.
 */

import type { WalletContextState } from '@solana/wallet-adapter-react'
import { paySolOnChain } from './pay'
import { PLATFORM_MARGIN_BPS } from '../engine/managedMarket'

export type ManagedSellRequest = {
  to: string
  amountSol: number
  tokenId: string
  symbol: string
  tokenAmount: number
  /** Optional buy memo / last buy sig for audit trail */
  ref?: string
}

export type ManagedSellResponse = {
  ok: boolean
  signature?: string
  error?: string
  amountSol?: number
  marginBps?: number
}

/** Buy: full solIn goes to treasury via Phantom; margin is booked in the managed engine. */
export async function managedBuyOnChain(params: {
  wallet: WalletContextState
  amountSol: number
  tokenId: string
  symbol: string
}): Promise<string> {
  const memo = `ignite:buy:${params.symbol}:${params.tokenId}:m${PLATFORM_MARGIN_BPS}`
  return paySolOnChain({
    wallet: params.wallet,
    amountSol: params.amountSol,
    memo,
  })
}

/**
 * Sell payout: asks the serverless bot wallet to send solOut to the trader.
 * Fails gracefully if the API is not configured (caller can still update local ledger).
 */
export async function requestManagedSellPayout(
  body: ManagedSellRequest,
): Promise<ManagedSellResponse> {
  try {
    const res = await fetch('/api/managed-sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json().catch(() => ({}))) as ManagedSellResponse
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || `Payout failed (${res.status})`,
      }
    }
    return { ...data, ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Network error on sell payout',
    }
  }
}
