import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Chart } from '../components/Chart'
import { TradePanel } from '../components/TradePanel'
import { BondingProgress } from '../components/BondingProgress'
import { formatUsd, shortAddr, timeAgo, formatSol } from '../lib/format'
import { useWallet } from '../hooks/useWallet'
import { useState } from 'react'

export function TokenPage() {
  const { id } = useParams()
  const tokens = useStore((s) => s.tokens)
  const trades = useStore((s) => s.trades)
  const comments = useStore((s) => s.comments)
  const addComment = useStore((s) => s.addComment)
  const likeComment = useStore((s) => s.likeComment)
  const { connected, openModal } = useWallet()
  const [text, setText] = useState('')

  const token = tokens.find((t) => t.id === id)
  if (!token) {
    return (
      <div className="px-4 py-20 text-center">
        <p className="text-[#8b8d97]">Coin not found</p>
        <Link to="/" className="mt-3 inline-block text-[#86efac]">
          ← home
        </Link>
      </div>
    )
  }

  const tokenTrades = trades.filter((t) => t.tokenId === token.id).slice(0, 30)
  const tokenComments = comments.filter((c) => c.tokenId === token.id)

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 pb-8">
      <Link to="/" className="text-xs text-[#8b8d97] hover:text-white">
        ← back
      </Link>

      <div className="mt-3 flex items-start gap-3">
        <img src={token.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black">
            {token.name}{' '}
            <span className="text-[#8b8d97]">${token.symbol}</span>
          </h1>
          <p className="text-xs text-[#8b8d97]">
            {shortAddr(token.creator)} · {timeAgo(token.createdAt)} · 💬 {token.replies}
          </p>
          <p className="mt-1 text-lg font-bold text-[#86efac]">{formatUsd(token.marketCapUsd)} MC</p>
        </div>
      </div>

      <div className="mt-3">
        <BondingProgress mcap={token.marketCapUsd} complete={token.complete} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Chart token={token} />
          <p className="text-sm text-[#8b8d97]">{token.description}</p>

          <section className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
            <h2 className="mb-3 text-sm font-bold">thread</h2>
            <div className="mb-3 flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={connected ? 'add a reply…' : 'sign in to reply'}
                className="flex-1 rounded-full border border-[#26272e] bg-[#0e0f13] px-4 py-2 text-sm outline-none"
              />
              <button
                type="button"
                className="rounded-full bg-[#86efac] px-4 py-2 text-sm font-bold text-black"
                onClick={() => {
                  if (!connected) {
                    openModal()
                    return
                  }
                  addComment(token.id, text)
                  setText('')
                }}
              >
                post
              </button>
            </div>
            <div className="space-y-2">
              {tokenComments.length === 0 && (
                <p className="text-xs text-[#6b6d78]">no replies yet</p>
              )}
              {tokenComments.map((c) => (
                <div key={c.id} className="rounded-xl bg-[#0e0f13] p-3 text-sm">
                  <p className="text-[11px] text-[#6b6d78]">
                    {shortAddr(c.author)} · {timeAgo(c.createdAt)}
                  </p>
                  <p className="mt-1">{c.text}</p>
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-[#8b8d97]"
                    onClick={() => likeComment(c.id)}
                  >
                    ♡ {c.likes}
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
            <h2 className="mb-3 text-sm font-bold">trades</h2>
            <div className="space-y-1 text-xs">
              {tokenTrades.length === 0 && <p className="text-[#6b6d78]">no trades yet</p>}
              {tokenTrades.map((t) => (
                <div key={t.id} className="flex justify-between border-b border-[#1a1b22] py-1.5">
                  <span className={t.side === 'buy' ? 'text-[#86efac]' : 'text-[#f87171]'}>
                    {t.side}
                  </span>
                  <span>{formatSol(t.solAmount)} SOL</span>
                  <span className="text-[#6b6d78]">{shortAddr(t.wallet)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-16 lg:self-start">
          <TradePanel token={token} />
        </div>
      </div>
    </div>
  )
}
