import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Chart } from '../components/Chart'
import { TradePanel } from '../components/TradePanel'
import { BondingProgress } from '../components/BondingProgress'
import { TradesTable } from '../components/TradesTable'
import { ThreadSection } from '../components/ThreadSection'
import { HoldersList } from '../components/HoldersList'
import { shortAddr, formatUsd } from '../lib/format'

export function TokenPage() {
  const { id } = useParams()
  const token = useStore((s) => s.tokens.find((t) => t.id === id))
  const ensureCandles = useStore((s) => s.ensureCandles)
  const trades = useStore((s) => s.trades.filter((t) => t.tokenId === id).slice(0, 50))
  const [tab, setTab] = useState<'trades' | 'thread' | 'holders'>('trades')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id) ensureCandles(id)
  }, [id, ensureCandles])

  if (!token) {
    return (
      <div className="py-20 text-center text-[#8b8d97]">
        coin not found · <Link to="/" className="text-[#86efac]">go home</Link>
      </div>
    )
  }

  function copy() {
    navigator.clipboard.writeText(token!.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4">
      <Link to="/" className="mb-4 inline-block text-sm text-[#8b8d97] hover:text-[#86efac]">
        ← back
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex gap-4 rounded-xl border border-[#26272e] bg-[#15161b] p-4">
            <img
              src={token.imageUrl}
              alt={token.name}
              className="h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold sm:text-2xl">
                {token.emoji} {token.name}{' '}
                <span className="text-[#86efac]">${token.symbol}</span>
                {token.complete && (
                  <span className="ml-2 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold text-black">
                    GRADUATED
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-[#8b8d97]">{token.description}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8b8d97]">
                <span>created by {shortAddr(token.creator)}</span>
                <button
                  type="button"
                  onClick={copy}
                  className="rounded border border-[#26272e] px-2 py-0.5 hover:border-[#86efac]/40"
                >
                  {copied ? 'copied!' : 'copy CA'}
                </button>
                {token.twitter && (
                  <a href={token.twitter} className="text-[#86efac]" target="_blank" rel="noreferrer">
                    X
                  </a>
                )}
                {token.telegram && (
                  <a href={token.telegram} className="text-[#86efac]" target="_blank" rel="noreferrer">
                    TG
                  </a>
                )}
                {token.website && (
                  <a href={token.website} className="text-[#86efac]" target="_blank" rel="noreferrer">
                    web
                  </a>
                )}
              </div>
              <p className="mt-1 text-xs text-[#86efac]">{formatUsd(token.marketCapUsd)} mcap</p>
            </div>
          </div>

          <Chart token={token} />
          <BondingProgress token={token} />

          <div className="rounded-xl border border-[#26272e] bg-[#15161b] p-4">
            <div className="mb-3 flex gap-2">
              {(
                [
                  ['trades', 'trades'],
                  ['thread', `thread (${token.replies})`],
                  ['holders', 'holders'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    tab === id ? 'bg-[#86efac] text-black' : 'bg-[#0e0f13] text-[#8b8d97]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {tab === 'trades' && <TradesTable trades={trades} />}
            {tab === 'thread' && <ThreadSection tokenId={token.id} />}
            {tab === 'holders' && <HoldersList token={token} />}
          </div>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <TradePanel token={token} />
        </div>
      </div>
    </div>
  )
}
