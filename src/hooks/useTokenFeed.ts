import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import type { Token } from '../types'

export function useTokenFeed() {
  const tokens = useStore((s) => s.tokens)
  const sort = useStore((s) => s.sort)
  const search = useStore((s) => s.search)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list: Token[] = tokens
    if (q) {
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.symbol.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          (t.mint && t.mint.toLowerCase().includes(q)) ||
          (t.dexId && t.dexId.toLowerCase().includes(q)),
      )
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
