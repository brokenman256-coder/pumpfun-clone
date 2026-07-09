import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { shortAddr, formatSol } from '../lib/format'

export function TickerBar() {
  const trades = useStore((s) => s.tickerTrades)
  const tokens = useStore((s) => s.tokens)
  const byId = Object.fromEntries(tokens.map((t) => [t.id, t]))

  if (!trades.length) {
    return (
      <div className="border-b border-[#26272e] bg-[#12131a] px-3 py-2 text-xs text-[#8b8d97]">
        waiting for live trades…
      </div>
    )
  }

  const items = [...trades, ...trades]

  return (
    <div className="overflow-hidden border-b border-[#26272e] bg-[#12131a]">
      <div className="marquee-track gap-8 py-2 pl-4 text-xs">
        {items.map((tr, i) => {
          const tok = byId[tr.tokenId]
          if (!tok) return null
          const buy = tr.side === 'buy'
          return (
            <Link
              key={`${tr.id}-${i}`}
              to={`/coin/${tok.id}`}
              className={`ticker-item inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap ${
                buy ? 'text-[#86efac]' : 'text-[#f87171]'
              }`}
            >
              <span className="text-white/80">{shortAddr(tr.wallet)}</span>
              <span className="font-semibold">{buy ? 'bought' : 'sold'}</span>
              <span className="font-bold">{formatSol(tr.solAmount)} SOL</span>
              <span className="text-white/50">of</span>
              <span className="font-bold text-white">${tok.symbol}</span>
              <span>{tok.emoji}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
