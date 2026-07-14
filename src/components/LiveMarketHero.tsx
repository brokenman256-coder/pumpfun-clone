import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { formatUsd } from '../lib/format'

/** Animated sparkline path from recent candles or synthetic points */
function Sparkline({
  points,
  up,
  width = 120,
  height = 40,
}: {
  points: number[]
  up: boolean
  width?: number
  height?: number
}) {
  const path = useMemo(() => {
    if (points.length < 2) return ''
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    return points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * width
        const y = height - ((p - min) / range) * (height - 4) - 2
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }, [points, width, height])

  const fill = useMemo(() => {
    if (points.length < 2) return ''
    const min = Math.min(...points)
    const max = Math.max(...points)
    const range = max - min || 1
    const line = points
      .map((p, i) => {
        const x = (i / (points.length - 1)) * width
        const y = height - ((p - min) / range) * (height - 4) - 2
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
    return `${line} L${width},${height} L0,${height} Z`
  }, [points, width, height])

  const stroke = up ? '#86efac' : '#f87171'
  const gradId = up ? 'gUp' : 'gDn'

  return (
    <svg width={width} height={height} className="overflow-visible" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradId})`} className="spark-fill" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="spark-line"
      />
    </svg>
  )
}

function candlePoints(token: {
  candles: { close: number }[]
  priceSol: number
  marketCapUsd: number
  id: string
}): number[] {
  if (token.candles?.length >= 8) {
    return token.candles.slice(-24).map((c) => c.close)
  }
  // Synthetic smooth wave from seed so every card has motion
  let h = 0
  for (let i = 0; i < token.id.length; i++) h = (h * 31 + token.id.charCodeAt(i)) >>> 0
  const base = token.priceSol || 0.00001
  const pts: number[] = []
  for (let i = 0; i < 24; i++) {
    const wave = Math.sin((i + (h % 7)) * 0.45) * 0.08 + Math.cos(i * 0.2 + h) * 0.04
    pts.push(base * (1 + wave + (i / 24) * 0.05 * ((h % 3) - 1)))
  }
  return pts
}

/**
 * Live market strip — animated mini charts instead of demo/devnet badges.
 */
export function LiveMarketHero() {
  const tokens = useStore((s) => s.tokens)
  const trades = useStore((s) => s.tickerTrades)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2000)
    return () => clearInterval(id)
  }, [])

  const featured = useMemo(() => {
    return [...tokens]
      .filter((t) => !t.complete)
      .sort((a, b) => b.volumeUsd - a.volumeUsd || b.marketCapUsd - a.marketCapUsd)
      .slice(0, 5)
  }, [tokens, tick])

  const livePulse = trades[0]

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#1f2028] bg-gradient-to-br from-[#12131a] via-[#14151b] to-[#0e1218] p-3 sm:p-4 fade-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#86efac] opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#86efac]" />
          </span>
          <h2 className="text-sm font-black tracking-tight text-white sm:text-base">
            Live markets
          </h2>
          <span className="rounded-full bg-[#86efac]/10 px-2 py-0.5 text-[10px] font-bold text-[#86efac]">
            {tokens.length.toLocaleString()} pairs
          </span>
        </div>
        {livePulse && (
          <p className="max-w-[55%] truncate text-[11px] text-[#8b8d97] animate-fade-in">
            <span className={livePulse.side === 'buy' ? 'text-[#86efac]' : 'text-[#f87171]'}>
              {livePulse.side === 'buy' ? '▲ buy' : '▼ sell'}
            </span>{' '}
            {livePulse.solAmount.toFixed(3)} SOL
          </p>
        )}
      </div>

      <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
        {featured.map((t, i) => {
          const pts = candlePoints(t)
          const up = pts[pts.length - 1] >= pts[0]
          return (
            <Link
              key={t.id}
              to={`/coin/${t.id}`}
              className="group min-w-[148px] shrink-0 rounded-xl border border-[#26272e] bg-[#0e0f13]/80 p-2.5 transition duration-300 hover:-translate-y-0.5 hover:border-[#86efac]/40 hover:shadow-[0_8px_24px_rgba(134,239,172,0.08)]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="mb-1.5 flex items-center gap-1.5">
                <img
                  src={t.imageUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-white">${t.symbol}</p>
                  <p className="truncate text-[10px] text-[#6b6d78]">{formatUsd(t.marketCapUsd)}</p>
                </div>
                <span
                  className={`ml-auto text-[10px] font-bold ${up ? 'text-[#86efac]' : 'text-[#f87171]'}`}
                >
                  {up ? '▲' : '▼'}
                  {Math.abs(t.change24h).toFixed(1)}%
                </span>
              </div>
              <Sparkline points={pts} up={up} width={128} height={36} />
            </Link>
          )
        })}
        {featured.length === 0 && (
          <div className="flex h-20 w-full items-center justify-center text-xs text-[#6b6d78]">
            Markets warming up…
          </div>
        )}
      </div>
    </section>
  )
}
