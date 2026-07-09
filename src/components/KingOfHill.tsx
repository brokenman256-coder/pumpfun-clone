import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { formatUsd, shortAddr } from '../lib/format'
import { useCountUp } from '../hooks/useCountUp'

export function KingOfHill() {
  const tokens = useStore((s) => s.tokens)
  const king = [...tokens]
    .filter((t) => !t.complete)
    .sort((a, b) => b.marketCapUsd - a.marketCapUsd)[0]

  const mcap = useCountUp(king?.marketCapUsd ?? 0)

  if (!king) return null

  return (
    <Link
      to={`/coin/${king.id}`}
      className="king-glow fade-up mb-5 block overflow-hidden rounded-2xl border border-[#86efac]/35 bg-gradient-to-r from-[#14261c] via-[#15161b] to-[#15161b] p-4 sm:p-5"
    >
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#86efac]">
        <span className="crown-pulse text-xl">👑</span>
        King of the Hill
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20">
          <img src={king.imageUrl} alt={king.name} className="h-full w-full object-cover" />
          <span className="absolute -right-1 -top-1 text-2xl">{king.emoji}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-white sm:text-xl">
            {king.name}{' '}
            <span className="text-[#8b8d97]">${king.symbol}</span>
          </p>
          <p className="text-sm text-[#86efac]">{formatUsd(mcap)} market cap</p>
          <p className="text-xs text-[#8b8d97]">created by {shortAddr(king.creator)}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-[10px] uppercase text-[#8b8d97]">24h vol</p>
          <p className="font-semibold text-white">{king.volumeSol.toFixed(1)} SOL</p>
        </div>
      </div>
    </Link>
  )
}
