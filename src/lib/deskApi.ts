import type { Token } from '../types'
import { BOT_WALLET_ADDRESS } from '../chain/config'

export type DeskPosition = {
  wallet: string
  mint: string
  tokenId: string
  symbol: string
  tokens: number
  costSol: number
  decimals?: number
  updatedAt?: number
}

export type DeskQuote = {
  ok: boolean
  error?: string
  side?: 'buy' | 'sell'
  mint?: string
  decimals?: number
  inSol?: number
  outUi?: number
  outSol?: number
  feeSol?: number
  marginBps?: number
  priceImpactPct?: string | number
}

export type DeskFill = {
  ok: boolean
  error?: string
  side?: 'buy' | 'sell'
  mint?: string
  tokensOut?: number
  tokensIn?: number
  solIn?: number
  solOut?: number
  feeSol?: number
  depositSig?: string
  swapSig?: string
  payoutSig?: string
  payoutToken?: string
  payoutPending?: boolean
  position?: DeskPosition
}

export function isSolanaDeskToken(token: Token): boolean {
  if (token.curvePda) return false
  const chain = (token.chainId || 'solana').toLowerCase()
  if (chain !== 'solana') return false
  if (token.source !== 'dexscreener' && !token.mint) return false
  if (token.source === 'bot' || token.source === 'local' || token.managed) return false
  const mint = token.mint || token.id
  if (typeof mint !== 'string') return false
  if (mint.startsWith('0x')) return false
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)
}

export function deskMint(token: Token): string {
  return token.mint || token.id
}

export { BOT_WALLET_ADDRESS as DESK_WALLET }

export async function fetchDeskQuote(params: {
  mint: string
  side: 'buy' | 'sell'
  amountSol?: number
  tokenAmount?: number
}): Promise<DeskQuote> {
  const q = new URLSearchParams({
    action: 'quote',
    mint: params.mint,
    side: params.side,
  })
  if (params.amountSol) q.set('amountSol', String(params.amountSol))
  if (params.tokenAmount) q.set('tokenAmount', String(params.tokenAmount))
  try {
    const res = await fetch(`/api/proxy-desk?${q}`)
    return (await res.json()) as DeskQuote
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'quote failed' }
  }
}

export async function fetchDeskPositions(wallet: string): Promise<{
  ok: boolean
  positions: DeskPosition[]
  error?: string
}> {
  try {
    const res = await fetch(
      `/api/proxy-desk?action=positions&wallet=${encodeURIComponent(wallet)}`,
      { cache: 'no-store' },
    )
    const data = await res.json()
    return {
      ok: !!data.ok,
      positions: Array.isArray(data.positions) ? data.positions : [],
      error: data.error,
    }
  } catch (e) {
    return { ok: false, positions: [], error: e instanceof Error ? e.message : 'network' }
  }
}

export async function deskBuy(body: {
  signature: string
  mint: string
  amountSol: number
  wallet: string
  tokenId: string
  symbol: string
}): Promise<DeskFill> {
  try {
    const res = await fetch('/api/proxy-desk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy', ...body }),
    })
    return (await res.json()) as DeskFill
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'buy failed' }
  }
}

export async function deskSell(body: {
  mint: string
  tokenAmount: number
  wallet: string
  tokenId: string
  symbol: string
}): Promise<DeskFill> {
  try {
    const res = await fetch('/api/proxy-desk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sell', ...body }),
    })
    return (await res.json()) as DeskFill
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'sell failed' }
  }
}
