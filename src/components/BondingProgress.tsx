import { progressToGraduation } from '../engine/bondingCurve'
import { formatUsd } from '../lib/format'

export function BondingProgress({ mcap, complete }: { mcap: number; complete: boolean }) {
  const p = progressToGraduation(mcap)
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-[#8b8d97]">
        <span>bonding curve</span>
        <span>
          {formatUsd(mcap)} · {p.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#26272e]">
        <div
          className={`h-full rounded-full ${complete ? 'bg-yellow-400' : 'bond-fill'}`}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}
