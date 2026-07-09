import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatUsd, formatSol, formatTokens } from '../lib/format'

export function ProfilePage() {
  const { connected, address, openModal, holdings, costBasis, solBalance } = useWallet()
  const tokens = useStore((s) => s.tokens)
  const comments = useStore((s) => s.comments)
  const [tab, setTab] = useState<'held' | 'created' | 'replies'>('held')

  const held = useMemo(
    () =>
      Object.entries(holdings)
        .filter(([, amt]) => amt > 0)
        .map(([id, amt]) => {
          const t = tokens.find((x) => x.id === id)
          if (!t) return null
          const valueSol = amt * t.priceSol
          const cost = costBasis[id] ?? 0
          return { token: t, amount: amt, valueSol, cost, pnl: valueSol - cost }
        })
        .filter(Boolean) as {
        token: (typeof tokens)[0]
        amount: number
        valueSol: number
        cost: number
        pnl: number
      }[],
    [holdings, tokens, costBasis],
  )

  const created = useMemo(
    () => tokens.filter((t) => t.creator === address),
    [tokens, address],
  )
  const replies = useMemo(
    () => comments.filter((c) => c.author === address),
    [comments, address],
  )

  if (!connected || !address) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="mb-4 text-[#8b8d97]">Sign in with Phantom to view your bag</p>
        <button
          type="button"
          onClick={openModal}
          className="rounded-full bg-[#86efac] px-5 py-2 text-sm font-bold text-black"
        >
          Sign in
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg px-3 py-6">
      <div className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <p className="text-xs text-[#8b8d97]">your bag</p>
        <p className="mt-1 font-mono text-sm text-[#86efac]">{shortAddr(address, 6)}</p>
        <p className="mt-2 text-2xl font-black">{formatSol(solBalance)} SOL</p>
      </div>

      <div className="mt-4 flex gap-2">
        {(['held', 'created', 'replies'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? 'bg-[#86efac] text-black' : 'bg-[#1a1b22] text-[#8b8d97]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {tab === 'held' &&
          (held.length === 0 ? (
            <p className="text-sm text-[#6b6d78]">no holdings yet</p>
          ) : (
            held.map((h) => (
              <Link
                key={h.token.id}
                to={`/coin/${h.token.id}`}
                className="flex items-center justify-between rounded-xl border border-[#1f2028] bg-[#14151b] p-3"
              >
                <div>
                  <p className="font-semibold">${h.token.symbol}</p>
                  <p className="text-xs text-[#8b8d97]">{formatTokens(h.amount)} tokens</p>
                </div>
                <div className="text-right text-sm">
                  <p>{formatSol(h.valueSol)} SOL</p>
                  <p className={h.pnl >= 0 ? 'text-[#86efac]' : 'text-[#f87171]'}>
                    {h.pnl >= 0 ? '+' : ''}
                    {formatSol(h.pnl)}
                  </p>
                </div>
              </Link>
            ))
          ))}

        {tab === 'created' &&
          (created.length === 0 ? (
            <p className="text-sm text-[#6b6d78]">you haven&apos;t created a coin</p>
          ) : (
            created.map((t) => (
              <Link
                key={t.id}
                to={`/coin/${t.id}`}
                className="flex justify-between rounded-xl border border-[#1f2028] bg-[#14151b] p-3"
              >
                <span className="font-semibold">${t.symbol}</span>
                <span className="text-[#86efac]">{formatUsd(t.marketCapUsd)}</span>
              </Link>
            ))
          ))}

        {tab === 'replies' &&
          (replies.length === 0 ? (
            <p className="text-sm text-[#6b6d78]">no replies yet</p>
          ) : (
            replies.map((c) => (
              <div key={c.id} className="rounded-xl border border-[#1f2028] bg-[#14151b] p-3 text-sm">
                {c.text}
              </div>
            ))
          ))}
      </div>
    </div>
  )
}
