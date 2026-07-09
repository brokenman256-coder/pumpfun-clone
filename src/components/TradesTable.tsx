import type { Trade } from '../types'
import { shortAddr, formatSol, timeAgo } from '../lib/format'

export function TradesTable({ trades }: { trades: Trade[] }) {
  if (!trades.length) {
    return <p className="py-8 text-center text-sm text-[#8b8d97]">no trades yet — be the first 🟢</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-[#8b8d97]">
          <tr className="border-b border-[#26272e]">
            <th className="py-2 pr-2 font-medium">time</th>
            <th className="py-2 pr-2 font-medium">wallet</th>
            <th className="py-2 pr-2 font-medium">type</th>
            <th className="py-2 pr-2 font-medium">SOL</th>
            <th className="py-2 pr-2 font-medium">tokens</th>
            <th className="py-2 font-medium">tx</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr
              key={t.id}
              className={t.side === 'buy' ? 'trade-row-buy' : 'trade-row-sell'}
            >
              <td className="py-2 pr-2 text-[#8b8d97]">{timeAgo(t.createdAt)}</td>
              <td className="py-2 pr-2">{shortAddr(t.wallet)}</td>
              <td
                className={`py-2 pr-2 font-bold uppercase ${
                  t.side === 'buy' ? 'text-[#86efac]' : 'text-[#f87171]'
                }`}
              >
                {t.side}
              </td>
              <td className="py-2 pr-2">{formatSol(t.solAmount)}</td>
              <td className="py-2 pr-2">
                {t.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </td>
              <td className="py-2">
                {/* TODO: real solscan link when on-chain */}
                <span className="cursor-default text-[#86efac]/70" title={t.signature}>
                  {t.signature.slice(0, 6)}…
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
