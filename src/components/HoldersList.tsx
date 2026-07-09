import type { Token } from '../types'
import { shortAddr } from '../lib/format'

export function HoldersList({ token }: { token: Token }) {
  const total = token.holders.reduce((s, h) => s + h.amount, 0) || 1
  const top = token.holders.slice(0, 20)

  return (
    <div className="space-y-2">
      {top.map((h, i) => {
        const pct = (h.amount / total) * 100
        const label = h.isCurve
          ? 'bonding curve'
          : h.isCreator
            ? `${shortAddr(h.wallet)} (dev)`
            : shortAddr(h.wallet)
        return (
          <div key={h.wallet + i}>
            <div className="mb-0.5 flex justify-between text-[11px]">
              <span className={h.isCurve || h.isCreator ? 'text-yellow-300' : 'text-[#8b8d97]'}>
                {i + 1}. {label}
              </span>
              <span className="text-white">{pct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#26272e]">
              <div
                className={`h-full rounded-full ${
                  h.isCurve ? 'bg-yellow-400' : h.isCreator ? 'bg-orange-400' : 'bg-[#86efac]'
                }`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
