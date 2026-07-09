import type { Token } from '../types'
import { progressToGraduation, GRADUATION_MCAP_USD } from '../engine/bondingCurve'
import { formatUsd } from '../lib/format'

export function BondingProgress({ token }: { token: Token }) {
  const p = progressToGraduation(token.marketCapUsd)
  return (
    <div className="rounded-xl border border-[#26272e] bg-[#15161b] p-4">
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-[#8b8d97]">
          {token.complete
            ? 'graduated to Raydium 🎓'
            : 'bonding curve progress'}
        </span>
        <span className="font-bold text-[#86efac]">{p.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#26272e]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            token.complete ? 'bg-yellow-400' : 'bond-fill'
          }`}
          style={{ width: `${p}%` }}
        />
      </div>
      {!token.complete && (
        <p className="mt-2 text-[11px] text-[#8b8d97]">
          when the market cap reaches {formatUsd(GRADUATION_MCAP_USD)} all the liquidity from the
          bonding curve is deposited into Raydium and burned 🔥
        </p>
      )}
    </div>
  )
}
