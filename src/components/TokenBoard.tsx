import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { SortTab } from '../types'
import { TokenCard } from './TokenCard'
import { BountiesStrip } from './BountiesStrip'
import { useTokenFeed } from '../hooks/useTokenFeed'

/** Map UI chips → store sort */
const CHIPS: { id: SortTab | 'mayhem'; label: string; emoji?: string }[] = [
  { id: 'market_cap', label: 'Movers', emoji: '⭐' },
  { id: 'newest', label: 'Mayhem', emoji: '🔥' },
  { id: 'featured', label: 'Featured' },
  { id: 'about_to_graduate', label: 'Graduate' },
]

export function TokenBoard() {
  const sort = useStore((s) => s.sort)
  const setSort = useStore((s) => s.setSort)
  const { tokens: sorted, count } = useTokenFeed()
  const [visible, setVisible] = useState(24)
  const [booting, setBooting] = useState(true)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 350)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    setVisible(24)
  }, [sort])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible((v) => Math.min(v + 16, sorted.length))
        }
      },
      { rootMargin: '280px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sorted.length])

  const shown = sorted.slice(0, visible)
  const trending = sorted.slice(0, 8)

  return (
    <div className="mx-auto max-w-lg px-3 pb-24 pt-3 sm:max-w-7xl sm:px-4">
      {/* Chip row — Movers / Mayhem like screenshots */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CHIPS.map((c) => {
          const active = sort === c.id
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSort(c.id as SortTab)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                active
                  ? 'bg-[#86efac] text-black'
                  : 'bg-[#1a1b22] text-[#9a9ba3] hover:text-white'
              }`}
            >
              {c.emoji ? `${c.emoji} ` : ''}
              {c.label}
            </button>
          )
        })}
        <button
          type="button"
          className="ml-auto shrink-0 rounded-full bg-[#1a1b22] p-2 text-[#6b6d78]"
          aria-label="Filters"
        >
          ⚙
        </button>
      </div>

      <BountiesStrip />

      {/* Trending strip */}
      <section className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-white">Trending now</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {trending.map((t) => (
            <div key={`tr_${t.id}`} className="w-[140px] shrink-0">
              <TokenCard token={t} />
            </div>
          ))}
        </div>
      </section>

      <div className="mb-2 flex items-center justify-between text-[12px] text-[#6b6d78]">
        <span>{count.toLocaleString()} coins live</span>
        <span>
          showing {shown.length}/{count}
        </span>
      </div>

      {booting ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#2a2b33] py-16 text-center">
          <p className="text-3xl">💊</p>
          <p className="mt-2 font-semibold">no coins found</p>
          <p className="text-sm text-[#8b8d97]">try another search or create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {shown.map((t) => (
            <TokenCard key={t.id} token={t} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="h-10" />
    </div>
  )
}
