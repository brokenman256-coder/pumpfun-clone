import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import type { Token } from '../types'
import { isDisplayable } from '../lib/tokenFilters'
import { rankScore } from '../engine/novaAiDesk'
import { isPumpFunDex } from '../lib/dexscreener'

/** House rooms lead. External listings are unfavoured. */
const DEX_SHARE = 0.3
const RAYDIUM_SHARE = 0.08
const OWN_SHARE = 0.7

/**
 * Caps how many coins of each kind ride on the board so the mix stays at the
 * target (10% Raydium / 50% other DexScreener / 40% our own) instead of
 * drifting however the bot happens to be pacing. Never drops DexScreener
 * coins to force the ratio — if DexScreener is sparse (loading,
 * rate-limited), we just show more of our own rather than an emptier board.
 */
function applyBoardMix(list: Token[]): Token[] {
  const pump = list.filter((t) => isPumpFunDex(t.dexId) && t.chainId === 'solana')
  const rest = list.filter((t) => !(isPumpFunDex(t.dexId) && t.chainId === 'solana'))
  const dex = rest.filter((t) => t.source === 'dexscreener')
  const own = rest.filter((t) => t.source !== 'dexscreener')
  if (dex.length === 0 && pump.length === 0) return own
  const isRaydium = (t: Token) => (t.dexId || '').toLowerCase() === 'raydium'
  const raydium = dex.filter(isRaydium)
  const otherDex = dex.filter((t) => !isRaydium(t))
  const raydiumCap = Math.max(1, Math.round((RAYDIUM_SHARE / DEX_SHARE) * Math.max(dex.length, 8)))
  const otherCap = Math.max(3, Math.round(((DEX_SHARE - RAYDIUM_SHARE) / DEX_SHARE) * Math.max(dex.length, 8)))
  const ownCap = Math.max(3, Math.round((OWN_SHARE / DEX_SHARE) * Math.max(dex.length, 8)))
  const mixed = [
    ...pump,
    ...raydium.slice(0, raydiumCap),
    ...otherDex.slice(0, otherCap),
    ...own.slice(0, ownCap),
  ]
  const seen = new Set<string>()
  return mixed.filter((t) => {
    if (seen.has(t.id)) return false
    seen.add(t.id)
    return true
  })
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
        return copy.sort(
          (a, b) =>
            Number(!!b.featured) - Number(!!a.featured) ||
            b.replies - a.replies ||
            b.marketCapUsd - a.marketCapUsd,
        )
      case 'graduate':
        return copy
          .filter((t) => !t.complete)
          .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
      case 'movers':
      default:
        return copy.sort((a, b) => rankScore(b) - rankScore(a))
    }
  }, [tokens, sort, search])

  return { tokens: filtered, count: filtered.length }
}
