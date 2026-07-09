import { Link } from 'react-router-dom'
import type { Token } from '../types'
import { formatUsd, shortAddr, timeAgo } from '../lib/format'
import { progressToGraduation } from '../engine/bondingCurve'
import { useCountUp } from '../hooks/useCountUp'

export function TokenCard({ token }: { token: Token }) {
  const mcap = useCountUp(token.marketCapUsd, 350)
  const progress = progressToGraduation(token.marketCapUsd)
  const shakeClass =
    token.shake === 'buy' ? 'shake-buy' : token.shake === 'sell' ? 'shake-sell' : ''

  return (
    <Link
      to={`/coin/${token.id}`}
      className={`card-lift block overflow-hidden rounded-xl border border-[#26272e] bg-[#15161b] ${shakeClass}`}
    >
      <div className="relative aspect-square bg-[#1a1b22]">
        <img
          src={token.imageUrl}
          alt={token.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute left-2 top-2 text-2xl drop-shadow">{token.emoji}</span>
        {token.complete && (
          <span className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black">
            GRADUATED
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {token.name}{' '}
              <span className="font-medium text-[#8b8d97]">(${token.symbol})</span>
            </p>
            <p className="text-[11px] text-[#8b8d97]">
              {timeAgo(token.createdAt)} · {shortAddr(token.creator)}
            </p>
          </div>
          <span className="shrink-0 text-[11px] text-[#8b8d97]">💬 {token.replies}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-[#8b8d97]">{token.description}</p>
        <div className="mt-2 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase text-[#8b8d97]">market cap</p>
            <p className="text-sm font-bold text-[#86efac]">{formatUsd(mcap)}</p>
          </div>
          <p className="text-[10px] text-[#8b8d97]">{progress.toFixed(0)}% to raydium</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#26272e]">
          <div
            className={`h-full rounded-full ${token.complete ? 'bg-yellow-400' : 'bond-fill'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
