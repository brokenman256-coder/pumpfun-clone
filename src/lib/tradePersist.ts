/**
 * Persist managed holdings so Phantom trades survive refresh.
 * Tokens themselves are rebuilt by bots / seeds; wallet ledger is local.
 */

const HOLDINGS_KEY = 'ignite_holdings_v1'
const COST_KEY = 'ignite_costbasis_v1'
const USED_MEMES_KEY = 'ignite_used_memes_v1'

export function loadHoldings(): Record<string, number> {
  try {
    const raw = localStorage.getItem(HOLDINGS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadCostBasis(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COST_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveWalletLedger(
  holdings: Record<string, number>,
  costBasis: Record<string, number>,
) {
  try {
    localStorage.setItem(HOLDINGS_KEY, JSON.stringify(holdings))
    localStorage.setItem(COST_KEY, JSON.stringify(costBasis))
  } catch {
    /* quota */
  }
}

export function loadUsedMemeUrls(): string[] {
  try {
    const raw = localStorage.getItem(USED_MEMES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveUsedMemeUrls(urls: string[]) {
  try {
    localStorage.setItem(USED_MEMES_KEY, JSON.stringify(urls.slice(-500)))
  } catch {
    /* */
  }
}
