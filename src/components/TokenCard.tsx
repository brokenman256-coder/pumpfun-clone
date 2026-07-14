import { Link } from 'react-router-dom'
import type { Token } from '../types'
import { formatUsd, shortAddr, timeAgo, formatSol } from '../lib/format'
import { useCountUp } from '../hooks/useCountUp'
import { TokenImage } from './TokenImage'
import { progressToGraduation } from '../engine/bondingCurve'
import {
  formatJackpotCountdown,
  freezeSolProgress,
  isJackpotArmed,
  isJackpotFrozen,
  multipleFromLaunch,
  JACKPOT_USER_SOL_MIN,
} from '../engine/jackpot'

export function TokenCard({ token }: { token: Token }) {
  const mcap = useCountUp(token.marketCapUsd, 300)
  const progress = progressToGraduation(token.marketCapUsd)
  const shake =
    token.shake === 'buy' ? 'shake-buy' : token.shake === 'sell' ? 'shake-sell' : ''
  const up = token.change24h >= 0
  const frozen = isJackpotFrozen(token)
  const armed = isJackpotArmed(token)
  const mult = multipleFromLaunch(
    token.launchPriceSol || token.priceSol,
    token.priceSol,
  )
  const realSol = token.realUserSolIn || 0

  return (
    <Link
      to={`/coin/${token.id}`}
      className={`block overflow-hidden rounded-2xl border bg-[#14151b] transition ${
        frozen
          ? 'border-amber-400/50 opacity-95'
          : armed
            ? 'border-violet-400/60 shadow-lg shadow-violet-500/20 ring-1 ring-violet-400/30'
            : 'border-[#1a1b22] hover:border-[#86efac]/35'
      } ${shake}`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#1a1b22]">
        <TokenImage
          src={token.imageUrl}
          seed={token.id}
          emoji={token.emoji}
          alt={token.name}
          className={`h-full w-full object-cover ${frozen ? 'grayscale-[30%]' : ''}`}
        />
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
          {frozen && (
            <span className="rounded-md bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-black">
              🎰 FROZEN {token.jackpotMultiple?.toFixed(1) || mult.toFixed(1)}×
            </span>
          )}
          {armed && !frozen && (
            <span className="animate-bounce rounded-md bg-violet-500 px-1.5 py-0.5 text-[9px] font-black text-white shadow-lg shadow-violet-500/50">
              🚀 FREEZE ↑ {mult.toFixed(1)}×
            </span>
          )}
          {token.source === 'dexscreener' && (
            <span className="rounded-md bg-[#3b82f6] px-1.5 py-0.5 text-[9px] font-bold text-white">
              DEX
            </span>
          )}
          {token.complete && (
            <span className="rounded-md bg-yellow-400 px-1.5 py-0.5 text-[9px] font-bold text-black">
              🎓 GRAD
            </span>
          )}
          {!token.complete && !frozen && !armed && progress > 70 && token.source !== 'dexscreener' && (
            <span className="rounded-md bg-[#86efac] px-1.5 py-0.5 text-[9px] font-bold text-black">
              HOT
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
          <div className="h-1 overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-full rounded-full ${token.complete ? 'bg-yellow-400' : 'bg-[#86efac]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-medium text-white/80">
            {progress.toFixed(0)}% to Raydium
          </p>
        </div>
      </div>

      <div className="space-y-1 p-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">
              {token.emoji} {token.name}
            </p>
            <p className="truncate text-[12px] text-[#8b8d97]">${token.symbol}</p>
          </div>
          <span className={`shrink-0 text-[11px] font-bold ${up ? 'text-[#86efac]' : 'text-[#f87171]'}`}>
            {up ? '▲' : '▼'}
            {Math.abs(token.change24h).toFixed(1)}%
          </span>
        </div>

        <p className="text-[14px] font-black text-[#86efac]">{formatUsd(mcap)} MC</p>
        {frozen && token.jackpotUnlockAt ? (
          <p className="text-[10px] font-semibold text-amber-400">
            frozen · vanishes in {formatJackpotCountdown(token.jackpotUnlockAt)}
          </p>
        ) : armed ? (
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-violet-300">
              hype · need {JACKPOT_USER_SOL_MIN} real SOL to freeze
            </p>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400"
                style={{ width: `${freezeSolProgress(realSol)}%` }}
              />
            </div>
            <p className="text-[9px] text-violet-200/80">
              {realSol.toFixed(1)}/{JACKPOT_USER_SOL_MIN} SOL · {mult.toFixed(1)}×
            </p>
          </div>
        ) : mult >= 1.5 ? (
          <p className="text-[10px] font-semibold text-[#86efac]/80">{mult.toFixed(1)}× from launch</p>
        ) : null}

        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[#6b6d78]">
          <span>vol {formatUsd(token.volumeUsd)}</span>
          <span>·</span>
          <span>
            🟢{token.buyCount} 🔴{token.sellCount}
          </span>
          <span>·</span>
          <span>💬 {token.replies}</span>
        </div>

        <p className="flex items-center gap-1 truncate text-[11px] text-[#6b6d78]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#86efac]" />
          @{token.creatorName || shortAddr(token.creator)}
          <span>·</span>
          {timeAgo(token.createdAt)}
          {token.lastTradeAt > Date.now() - 15_000 && (
            <span className="ml-1 font-semibold text-[#86efac]">LIVE</span>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          {token.dexId && (
            <span className="rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] text-blue-300">
              {token.dexId}
            </span>
          )}
          {token.tags?.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-[#8b8d97]">
              #{t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  )
}
