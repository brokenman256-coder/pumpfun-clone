/** Beginner rails. Public copy stays simple; limits are local to the wallet. */

const KEY = 'nova_journey_v1'

export const FIRST_BUY_SOL = 0.05
export const NEW_WALLET_MAX_SOL = 0.2
export const NEW_WALLET_UNLOCK_BUYS = 3

export type Journey = {
  realBuys: number
  firstBuyAt: number | null
  sellGuideSeen: boolean
  lastMint: string | null
}

function empty(): Journey {
  return { realBuys: 0, firstBuyAt: null, sellGuideSeen: false, lastMint: null }
}

function readAll(): Record<string, Journey> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const p = JSON.parse(raw) as Record<string, Journey>
    return p && typeof p === 'object' ? p : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, Journey>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* */
  }
}

export function loadJourney(wallet: string | null | undefined): Journey {
  if (!wallet) return empty()
  return readAll()[wallet] || empty()
}

export function recordRealBuy(wallet: string, mint?: string): Journey {
  const all = readAll()
  const cur = all[wallet] || empty()
  const next: Journey = {
    ...cur,
    realBuys: cur.realBuys + 1,
    firstBuyAt: cur.firstBuyAt || Date.now(),
    lastMint: mint || cur.lastMint,
  }
  all[wallet] = next
  writeAll(all)
  return next
}

export function markSellGuideSeen(wallet: string) {
  const all = readAll()
  const cur = all[wallet] || empty()
  all[wallet] = { ...cur, sellGuideSeen: true }
  writeAll(all)
}

export function isCappedNewWallet(wallet: string | null | undefined): boolean {
  return loadJourney(wallet).realBuys < NEW_WALLET_UNLOCK_BUYS
}


