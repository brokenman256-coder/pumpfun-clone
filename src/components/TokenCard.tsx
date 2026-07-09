import { Link } from 'react-router-dom'
import type { Token } from '../types'
import { formatUsd, shortAddr, timeAgo } from '../lib/format'
import { useCountUp } from '../hooks/useCountUp'
import { TokenImage } from './TokenImage'

export function TokenCard({ token }: { token: Token }) {
  const mcap = useCountUp(token.marketCapUsd, 300)
  const shake =
    token.shake === 'buy' ? 'shake-buy' : token.shake === 'sell' ? 'shake-sell' : ''

  return (
    <Link to={`/coin/${token.id}`} className={`block overflow-hidden rounded-2xl bg-[#14151b] ${shake}`}>
      <div className="relative aspect-square overflow-hidden bg-[#1a1b22]">
        <TokenImage
          src={token.imageUrl}
          seed={token.id}
          emoji={token.emoji}
          alt={token.name}
          className="h-full w-full object-cover"
        />
        {token.complete && (
          <span className="absolute right-2 top-2 rounded-md bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold text-black">
            GRAD
          </span>
        )}
        <span className="absolute bottom-2 left-2 text-lg drop-shadow">{token.emoji}</span>
      </div>
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-[13px] font-semibold text-white">{token.name}</p>
        <p className="truncate text-[12px] text-[#8b8d97]">${token.symbol}</p>
        <p className="text-[13px] font-bold text-[#86efac]">{formatUsd(mcap)} MC</p>
        <p className="flex items-center gap-1 truncate text-[11px] text-[#6b6d78]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#86efac]" />
          {shortAddr(token.creator)}
          <span>·</span>
          {timeAgo(token.createdAt)}
        </p>
      </div>
    </Link>
  )
}
