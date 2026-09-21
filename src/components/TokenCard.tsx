import { Link } from 'react-router-dom'
import type { Token } from '../types'
import { formatUsd, shortAddr, timeAgo } from '../lib/format'
import { useCountUp } from '../hooks/useCountUp'
import { TokenImage } from './TokenImage'
import { isHouseCoin } from '../engine/novaAiDesk'
import { CoinLights } from './CoinLights'

export function TokenCard({ token }: { token: Token }) {
  const mcap = useCountUp(token.marketCapUsd, 300)
  const shake =
    token.shake === 'buy' ? 'shake-buy' : token.shake === 'sell' ? 'shake-sell' : ''
  const up = token.change24h >= 0
  const house = isHouseCoin(token)
  const accent = token.communityAccent || (house ? '#e8a35a' : '#c084fc')
  const room = token.community || token.tags?.[0] || 'Live'

  return (
    <Link
      to={`/coin/${token.id}`}
      className={`room-card group relative block overflow-hidden ${shake}`}
      style={{ ['--room-accent' as string]: accent }}
    >
      <div className="relative aspect-[5/6] overflow-hidden">
        <TokenImage
          src={token.imageUrl}
          seed={token.id}
          emoji={token.emoji}
          alt={token.name}
          className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#100814] via-[#100814]/35 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#100814]"
            style={{ background: accent }}
          >
            {room}
          </span>
        </div>
        {token.lastTradeAt > Date.now() - 15_000 && (
          <span className="absolute right-2.5 top-2.5 rounded-full bg-[#100814]/80 px-2 py-0.5 text-[9px] font-bold tracking-widest text-[#e8a35a]">
            LIVE
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display text-[17px] leading-tight text-[#f4ead8]">
            {token.name}
          </p>
          <p className="mt-0.5 font-mono text-[11px] tracking-wider text-[#e8a35a]/90">
            ${token.symbol}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 px-3 py-2.5">
        <div className="flex items-end justify-between gap-2">
          <p className="font-display text-lg text-[#f4ead8]">{formatUsd(mcap)}</p>
          <span className={`text-[11px] font-bold ${up ? 'text-[#e8a35a]' : 'text-[#fb7185]'}`}>
            {up ? '▲' : '▼'}
            {Math.abs(token.change24h).toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[#b7a99a]">
          <span>
            {token.buyCount} in · {token.sellCount} out
          </span>
          <span>{timeAgo(token.createdAt)}</span>
        </div>
        <CoinLights token={token} compact />
        <p className="truncate text-[10px] text-[#7c6f66]">
          {token.creatorName || shortAddr(token.creator)}
        </p>
      </div>
    </Link>
  )
}
