import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import type { Token } from '../types'
import { isDisplayable } from '../lib/tokenFilters'

/** Target board mix: ~70% real DexScreener coins, ~30% our own (bot/local/on-chain). */
const DEX_SHARE = 0.7

/**
 * Caps how many "our own" coins ride alongside the DexScreener set so the
 * board stays at roughly the target mix instead of drifting however the
 * bot happens to be pacing. Never drops DexScreener coins to force the
 * ratio — if DexScreener is sparse (loading, rate-limited), we just show
 * more of our own rather than an emptier board.
 */
function applyBoardMix(list: Token[]): Token[] {
  const dex = list.filter((t) => t.source === 'dexscreener')
  const own = list.filter((t) => t.source !== 'dexscreener')
  if (dex.length === 0) return own
  const ownCap = Math.max(3, Math.round((dex.length * (1 - DEX_SHARE)) / DEX_SHARE))
  return [...dex, ...own.slice(0, ownCap)]
}

export function useTokenFeed() {
  const tokens = useStore((s) => s.tokens)
  const sort = useStore((s) => s.sort)
  const search = useStore((s) => s.search)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    // Simulated/demo tokens without a real meme image are made-up placeholders
    // — never hide real on-chain or DexScreener coins, image or not.
    let list: Token[] = tokens.filter(isDisplayable)
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.mint && t.mint.toLowerCase().includes(q)) ||
          (t.dexId && t.dexId.toLowerCase().includes(q)),
      )
    } else {
      // Only shape the mix on the unfiltered board — a search should search everything.
      list = applyBoardMix(list)
    }
    const copy = [...list]
    switch (sort) {
      case 'mayhem':
        return copy.sort((a, b) => b.volumeSol - a.volumeSol)
      case 'featured':
        return copy.sort((a, b) => b.replies - a.replies || b.marketCapUsd - a.marketCapUsd)
      case 'graduate':
        return copy
          .filter((t) => !t.complete)
          .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
      case 'movers':
      default:
        return copy.sort((a, b) => b.marketCapUsd - a.marketCapUsd)
    }
  }, [tokens, sort, search])

  return { tokens: filtered, count: filtered.length }
}
