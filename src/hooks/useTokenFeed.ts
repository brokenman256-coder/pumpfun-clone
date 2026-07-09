/**
 * Live token feed selector + helpers.
 * TODO: when on-chain, replace store reads with websocket / RPC subscription.
 */
import { useMemo } from 'react'
import { useStore, selectSortedTokens } from '../store/useStore'
import type { SortTab, Token } from '../types'

export function useTokenFeed(options?: { sort?: SortTab; search?: string }) {
  const tokens = useStore((s) => s.tokens)
  const sort = options?.sort ?? useStore((s) => s.sort)
  const search = options?.search ?? useStore((s) => s.search)
  const trades = useStore((s) => s.trades)
  const tickerTrades = useStore((s) => s.tickerTrades)

  const sorted = useMemo(
    () => selectSortedTokens(tokens, sort, search),
    [tokens, sort, search],
  )

  const king = useMemo(() => {
    return [...tokens]
      .filter((t) => !t.complete)
      .sort((a, b) => b.marketCapUsd - a.marketCapUsd)[0] as Token | undefined
  }, [tokens])

  const getToken = (id: string) => tokens.find((t) => t.id === id)

  const tradesFor = (tokenId: string, limit = 50) =>
    trades.filter((t) => t.tokenId === tokenId).slice(0, limit)

  return {
    tokens: sorted,
    allTokens: tokens,
    king,
    tickerTrades,
    getToken,
    tradesFor,
    count: sorted.length,
  }
}
