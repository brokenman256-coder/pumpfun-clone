import type { Token, Trade, TradeSide } from '../types'

const headers = (): HeadersInit => ({ 'Content-Type': 'application/json' })

export type LiveBoardSnapshot = {
  ok: boolean
  source?: string
  marginBps?: number
  version?: number
  updatedAt?: string
  tokens?: Token[]
  recentTrades?: Trade[]
  usedMemeUrls?: string[]
  launched?: number
  error?: string
}

export async function fetchLiveBoard(): Promise<LiveBoardSnapshot> {
  try {
    const res = await fetch('/api/live-board', { cache: 'no-store' })
    if (!res.ok) {
      // Fallback to static file (CDN)
      const r2 = await fetch('/live-board.json', { cache: 'no-store' })
      if (!r2.ok) return { ok: false, error: `HTTP ${res.status}` }
      const data = (await r2.json()) as LiveBoardSnapshot
      return { ok: true, source: 'static', ...data }
    }
    return (await res.json()) as LiveBoardSnapshot
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network' }
  }
}

export async function launchLiveCoin(): Promise<{
  ok: boolean
  token?: Token
  error?: string
}> {
  try {
    const res = await fetch('/api/live-board', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'launch' }),
    })
    const data = await res.json()
    return data
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network' }
  }
}

export async function publishLiveCoin(token: Token): Promise<{ ok: boolean }> {
  try {
    const res = await fetch('/api/live-board', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'publish', token }),
    })
    return await res.json()
  } catch {
    return { ok: false }
  }
}

export async function postLiveTrade(params: {
  tokenId: string
  side: TradeSide
  amount: number
  wallet?: string
  signature?: string
}): Promise<{
  ok: boolean
  error?: string
  token?: Token
  trade?: Trade
  tokensOut?: number
  solOut?: number
  margin?: number
  canPayout?: boolean
}> {
  try {
    const res = await fetch('/api/live-board', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ action: 'trade', ...params }),
    })
    return await res.json()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network' }
  }
}
