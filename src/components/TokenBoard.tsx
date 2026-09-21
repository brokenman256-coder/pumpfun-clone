import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { SortTab } from '../types'
import { TokenCard } from './TokenCard'
import { LiveTradeTape } from './LiveTradeTape'
import { useTokenFeed } from '../hooks/useTokenFeed'
const CHIPS: { id: SortTab; label: string }[] = [
  { id: 'movers', label: 'Live' },
  { id: 'mayhem', label: 'Volume' },
  { id: 'featured', label: 'Featured' },
  { id: 'graduate', label: 'New' },
]

export function TokenBoard() {
  const sort = useStore((s) => s.sort)
  const setSort = useStore((s) => s.setSort)
  const { tokens: sorted, count } = useTokenFeed()
  const [visible, setVisible] = useState(24)
  const [booting, setBooting] = useState(true)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 300)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => setVisible(24), [sort])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible((v) => Math.min(v + 16, sorted.length))
      },
      { rootMargin: '280px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [sorted.length])

  const shown = sorted.slice(0, visible)
  const trending = sorted.slice(0, 8)

  return (
    <div className="mx-auto max-w-lg px-3 pb-8 pt-3 sm:max-w-6xl">
      <div className="hero-atlas mb-4 p-5">
        <p className="relative z-10 text-[11px] uppercase tracking-[0.2em] text-[#e8a35a]/90">
          Est. 2021
        </p>
        <p className="relative z-10 mt-2 font-display text-3xl text-[#f4ead8] sm:text-4xl">
          Markets
        </p>
        <p className="relative z-10 mt-2 max-w-lg text-sm leading-relaxed text-[#f4ead8]/80">
          A Solana trading venue for listed tokens. Connect a wallet to trade.
          Balances settle in Phantom.
        </p>
      </div>
      <LiveTradeTape />

      <div className="no-scrollbar mb-4 flex items-center gap-2 overflow-x-auto">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSort(c.id)}
            className={`chip-press shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition duration-200 ${
              sort === c.id
                ? 'bg-[#e8a35a] text-[#100814] shadow-[0_0_20px_rgba(232,163,90,0.25)]'
                : 'bg-[#1a1018] text-[#b7a99a] hover:bg-[#2a1822] hover:text-[#f4ead8]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="mb-5">
        <h2 className="mb-2 font-display text-xl tracking-tight text-[#f4ead8]">
          Trending
        </h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
          {trending.map((t, i) => (
            <div
              key={`tr_${t.id}`}
              className="w-[220px] shrink-0 fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <TokenCard token={t} />
            </div>
          ))}
        </div>
      </section>

      <div className="mb-2 flex justify-between text-[12px] text-[#6b6d78]">
        <span>{count.toLocaleString()} coins live</span>
        <span>
          {shown.length}/{count}
        </span>
      </div>

      {booting ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-2xl" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#334155] py-16 text-center fade-up">
          <p className="text-3xl">🔥</p>
          <p className="mt-2 font-semibold">Loading listings…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((t, i) => (
            <div
              key={t.id}
              className="fade-up"
              style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}
            >
              <TokenCard token={t} />
            </div>
          ))}
        </div>
      )}
      <div ref={sentinel} className="h-10" />
    </div>
  )
}
