import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatUsd, formatSol } from '../lib/format'

export function ProfilePage() {
  const { connected, address, openModal, holdings, costBasis, solBalance } = useWallet()
  const tokens = useStore((s) => s.tokens)
  const comments = useStore((s) => s.comments)
  const [tab, setTab] = useState<'held' | 'created' | 'replies'>('held')

  const held = useMemo(() => {
    return Object.entries(holdings)
      .filter(([, amt]) => amt > 0)
      .map(([id, amt]) => {
        const t = tokens.find((x) => x.id === id)
        if (!t) return null
        const valueSol = amt * t.priceSol
        const cost = costBasis[id] ?? 0
        const pnl = valueSol - cost
        return { token: t, amount: amt, valueSol, cost, pnl }
      })
      .filter(Boolean) as {
      token: (typeof tokens)[0]
      amount: number
      valueSol: number
      cost: number
      pnl: number
    }[]
  }, [holdings, tokens, costBasis])

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
      <div className="py-20 text-center">
        <p className="mb-4 text-[#8b8d97]">connect wallet to view profile</p>
        <button
          type="button"
          onClick={openModal}
          className="rounded-full bg-[#86efac] px-5 py-2 text-sm font-bold text-black"
        >
          connect wallet
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-3 py-8 sm:px-4">
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#26272e] bg-[#15161b] p-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#86efac] text-2xl">
          🐸
        </div>
        <div>
          <p className="font-mono text-sm text-white">{shortAddr(address, 6)}</p>
          <p className="text-[#86efac]">{formatSol(solBalance)} SOL</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        {(
          [
            ['held', 'coins held'],
            ['created', 'coins created'],
            ['replies', 'replies'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === id ? 'bg-[#86efac] text-black' : 'bg-[#15161b] text-[#8b8d97]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'held' && (
        <div className="space-y-2">
          {held.length === 0 && (
            <p className="text-sm text-[#8b8d97]">no coins held yet — go pump something</p>
          )}
          {held.map(({ token, amount, valueSol, pnl }) => (
            <Link
              key={token.id}
              to={`/coin/${token.id}`}
              className="flex items-center gap-3 rounded-xl border border-[#26272e] bg-[#15161b] p-3 hover:border-[#86efac]/30"
            >
              <img src={token.imageUrl} alt="" className="h-10 w-10 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {token.emoji} ${token.symbol}
                </p>
                <p className="text-xs text-[#8b8d97]">
                  {amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} tokens ·{' '}
                  {formatUsd(token.marketCapUsd)} mcap
                </p>
              </div>
              <div className="text-right text-sm">
                <p>{formatSol(valueSol)} SOL</p>
                <p className={pnl >= 0 ? 'text-[#86efac]' : 'text-[#f87171]'}>
                  {pnl >= 0 ? '+' : ''}
                  {formatSol(pnl)} SOL
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'created' && (
        <div className="space-y-2">
          {created.length === 0 && (
            <p className="text-sm text-[#8b8d97]">
              no coins created · <Link to="/create" className="text-[#86efac]">launch one</Link>
            </p>
          )}
          {created.map((t) => (
            <Link
              key={t.id}
              to={`/coin/${t.id}`}
              className="flex items-center gap-3 rounded-xl border border-[#26272e] bg-[#15161b] p-3"
            >
              <img src={t.imageUrl} alt="" className="h-10 w-10 rounded-lg" />
              <div>
                <p className="font-semibold">
                  {t.emoji} {t.name} ${t.symbol}
                </p>
                <p className="text-xs text-[#86efac]">{formatUsd(t.marketCapUsd)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'replies' && (
        <div className="space-y-2">
          {replies.length === 0 && (
            <p className="text-sm text-[#8b8d97]">no replies yet</p>
          )}
          {replies.map((c) => (
            <div key={c.id} className="rounded-xl border border-[#26272e] bg-[#15161b] p-3 text-sm">
              <p>{c.text}</p>
              <Link to={`/coin/${c.tokenId}`} className="text-xs text-[#86efac]">
                view coin →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
