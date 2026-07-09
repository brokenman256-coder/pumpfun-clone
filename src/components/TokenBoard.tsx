import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { SortTab } from '../types'
import { TokenCard } from './TokenCard'
import { KingOfHill } from './KingOfHill'
import { useTokenFeed } from '../hooks/useTokenFeed'

const TABS: { id: SortTab; label: string }[] = [
  { id: 'featured', label: '🔥 featured' },
  { id: 'newest', label: '🌱 newest' },
  { id: 'market_cap', label: '💰 market cap' },
  { id: 'about_to_graduate', label: '🎓 about to graduate' },
]

export function TokenBoard() {
  const sort = useStore((s) => s.sort)
  const setSort = useStore((s) => s.setSort)
  const { tokens: sorted, count } = useTokenFeed()
  const [visible, setVisible] = useState(20)
  const [booting, setBooting] = useState(true)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 500)
    return () => clearTimeout(t)
  }, [])

  // Reset page window when filters change
  useEffect(() => {
    setVisible(20)
  }, [sort])

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => Math.min(v + 12, sorted.length))
        }
      },
      { rootMargin: '200px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sorted.length])

  const shown = sorted.slice(0, visible)

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4">
      <KingOfHill />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSort(t.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              sort === t.id
                ? 'bg-[#86efac] text-black'
                : 'bg-[#15161b] text-[#8b8d97] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-[#8b8d97]">{count} coins</span>
      </div>

      {booting ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-72 rounded-xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="fade-up rounded-xl border border-dashed border-[#26272e] py-20 text-center">
          <p className="text-4xl">🟢</p>
          <p className="mt-2 font-semibold">no coins found</p>
          <p className="text-sm text-[#8b8d97]">try another search or create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((t) => (
            <TokenCard key={t.id} token={t} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-8" />
      {visible < sorted.length && !booting && (
        <p className="py-2 text-center text-xs text-[#8b8d97]">scrolling for more…</p>
      )}
    </div>
  )
}
