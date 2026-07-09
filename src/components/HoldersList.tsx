import type { Holder } from '../types'
import { shortAddr, formatTokens } from '../lib/format'

export function HoldersList({ holders }: { holders: Holder[] }) {
  if (!holders?.length) {
    return <p className="text-xs text-[#6b6d78]">no holder data yet</p>
  }

  return (
    <div className="space-y-1.5">
      {holders.slice(0, 12).map((h, i) => (
        <div
          key={h.wallet + i}
          className="flex items-center justify-between rounded-lg bg-[#0e0f13] px-3 py-2 text-xs"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="w-5 text-[#6b6d78]">{i + 1}</span>
            <span className="truncate font-mono text-white">
              {h.isCurve ? '🫧 bonding curve' : h.isCreator ? '👑 creator' : shortAddr(h.wallet)}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-semibold text-[#86efac]">{h.pct.toFixed(2)}%</p>
            <p className="text-[10px] text-[#6b6d78]">{formatTokens(h.amount)}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
