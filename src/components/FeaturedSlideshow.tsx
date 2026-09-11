import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { formatUsd } from '../lib/format'
import { progressToGraduation } from '../engine/bondingCurve'

const SLIDE_MS = 5000

/**
 * Big auto-advancing hero banner for the top of the board — top coins by
 * market cap, one large slide at a time with a smooth crossfade + a subtle
 * parallax image scale. Pauses on hover/touch; dot navigation for manual
 * control.
 */
export function FeaturedSlideshow() {
  const tokens = useStore((s) => s.tokens)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | null>(null)

  const slides = useMemo(() => {
    return [...tokens]
      .filter((t) => !t.complete && t.imageUrl)
      .sort((a, b) => b.marketCapUsd - a.marketCapUsd)
      .slice(0, 6)
  }, [tokens])

  useEffect(() => {
    if (index >= slides.length) setIndex(0)
  }, [slides.length, index])

  useEffect(() => {
    if (paused || slides.length < 2) return
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length)
    }, SLIDE_MS)
    return () => {
      if (timer.current) clearInterval(timer.current)
    }
  }, [paused, slides.length])

  if (slides.length === 0) return null
  const active = slides[index]
  const progress = progressToGraduation(active.marketCapUsd)

  return (
    <section
      className="relative mb-4 overflow-hidden rounded-2xl border border-[#1f2028] fade-up"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
        {slides.map((t, i) => (
          <Link
            key={t.id}
            to={`/coin/${t.id}`}
            aria-hidden={i !== index}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}
          >
            <img
              src={t.imageUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-[5000ms] ease-linear"
              style={{ transform: i === index ? 'scale(1.08)' : 'scale(1)' }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.opacity = '0'
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <span className="mb-2 inline-block rounded-full bg-[#7c3aed]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7c3aed]">
                Featured
              </span>
              <h3 className="text-xl font-black text-white drop-shadow sm:text-3xl">
                {t.emoji} {t.name}
              </h3>
              <p className="mt-1 text-sm text-white/70 sm:text-base">${t.symbol}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span className="rounded-full bg-white/10 px-3 py-1 font-bold text-white backdrop-blur">
                  {formatUsd(t.marketCapUsd)} MC
                </span>
                <span className="text-white/70">{progress.toFixed(0)}% to Raydium</span>
              </div>
              <div className="mt-3 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-[#7c3aed] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 right-3 flex gap-1.5">
          {slides.map((t, i) => (
            <button
              key={t.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-6 bg-[#7c3aed]' : 'w-1.5 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
