import { useStore } from '../store/useStore'
import { formatSol, shortAddr, timeAgo } from '../lib/format'

/** Horizontal scrolling live trades — essential crypto site tape */
export function LiveTradeTape() {
  const trades = useStore((s) => s.tickerTrades)
  const tokens = useStore((s) => s.tokens)

  if (trades.length === 0) {
    return (
      <div className="mb-3 overflow-hidden rounded-xl border border-[#1a1d24] bg-[#0b0e11] px-3 py-2">
        <p className="text-[11px] text-[#5d6573]">Waiting for trades…</p>
      </div>
    )
  }

  const items = [...trades, ...trades] // seamless loop

  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border border-[#1a1d24] bg-[#0b0e11]">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#0b0e11] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#0b0e11] to-transparent" />
      <div className="tape-scroll flex gap-6 whitespace-nowrap py-2.5 pl-3">
        {items.map((tr, i) => {
          const tok = tokens.find((t) => t.id === tr.tokenId)
          const buy = tr.side === 'buy'
          return (
            <span
              key={`${tr.id}_${i}`}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            >
              <span className={buy ? 'text-[#00c805]' : 'text-[#f23645]'}>
                {buy ? '▲ BUY' : '▼ SELL'}
              </span>
              <span className="text-white">{formatSol(tr.solAmount)} SOL</span>
              <span className="text-[#5d6573]">
                ${tok?.symbol || '???'} · {shortAddr(tr.wallet, 3)} · {timeAgo(tr.createdAt)}
              </span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
