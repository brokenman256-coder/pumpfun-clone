import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { TokenImage } from './TokenImage'
import { formatUsd } from '../lib/format'
import { progressToGraduation } from '../engine/bondingCurve'

/** Highest market-cap incomplete coin — pump.fun "king of the hill" */
export function KingOfHill() {
  const tokens = useStore((s) => s.tokens)
  const king = [...tokens]
    .filter((t) => !t.complete)
    .sort((a, b) => b.marketCapUsd - a.marketCapUsd)[0]

  if (!king) return null
  const progress = progressToGraduation(king.marketCapUsd)

  return (
    <Link
      to={`/coin/${king.id}`}
      className="mb-4 flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-gradient-to-r from-[#1a1508] to-[#14151b] p-3"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-2 ring-yellow-400/50">
        <TokenImage
          src={king.imageUrl}
          seed={king.id}
          emoji={king.emoji}
          alt={king.name}
          className="h-full w-full object-cover"
        />
        <span className="absolute -right-1 -top-1 text-base">👑</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-yellow-300">
          King of the hill
        </p>
        <p className="truncate text-sm font-bold text-white">
          {king.emoji} {king.name} <span className="text-[#8b8d97]">${king.symbol}</span>
        </p>
        <p className="text-xs text-[#86efac]">{formatUsd(king.marketCapUsd)} MC · {progress.toFixed(0)}% to Raydium</p>
      </div>
      <span className="text-2xl">🔥</span>
    </Link>
  )
}
