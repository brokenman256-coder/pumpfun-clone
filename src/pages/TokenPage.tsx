import { Link, useParams } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Chart } from '../components/Chart'
import { TradePanel } from '../components/TradePanel'
import { BondingProgress } from '../components/BondingProgress'
import { HoldersList } from '../components/HoldersList'
import { TokenImage } from '../components/TokenImage'
import { formatUsd, shortAddr, timeAgo, formatSol, safeHref } from '../lib/format'
import { useWallet } from '../hooks/useWallet'
import { EXPLORER_ADDR } from '../chain/config'
import { progressToGraduation, SOL_PRICE_USD } from '../engine/bondingCurve'
import { multipleFromLaunch } from '../engine/jackpot'

export function TokenPage() {
  const { id } = useParams()
  const tokens = useStore((s) => s.tokens)
  const trades = useStore((s) => s.trades)
  const comments = useStore((s) => s.comments)
  const addComment = useStore((s) => s.addComment)
  const likeComment = useStore((s) => s.likeComment)
  const ensureCandles = useStore((s) => s.ensureCandles)
  const { connected, openModal } = useWallet()
  const [text, setText] = useState('')
  const [tab, setTab] = useState<'thread' | 'trades' | 'holders'>('trades')
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)
  const [prevMcap, setPrevMcap] = useState<number | null>(null)

  const token = tokens.find((t) => t.id === id)

  useEffect(() => {
    if (token) ensureCandles(token.id)
  }, [token?.id, ensureCandles])

  useEffect(() => {
    if (!token) return
    if (prevMcap != null && token.marketCapUsd !== prevMcap) {
      setFlash(token.marketCapUsd > prevMcap ? 'up' : 'down')
      const t = window.setTimeout(() => setFlash(null), 600)
      return () => clearTimeout(t)
    }
    setPrevMcap(token.marketCapUsd)
  }, [token?.marketCapUsd, prevMcap, token])

  if (!token) {
    return (
      <div className="px-4 py-20 text-center fade-up">
        <p className="text-[#8b8d97]">Coin not found</p>
        <Link to="/" className="mt-3 inline-block text-[#00c805]">
          ← back to board
        </Link>
      </div>
    )
  }

  const tokenTrades = trades.filter((t) => t.tokenId === token.id).slice(0, 50)
  const tokenComments = comments.filter((c) => c.tokenId === token.id)
  const progress = progressToGraduation(token.marketCapUsd)
  const up = token.change24h >= 0
  const ca = token.mint || token.id
  const mult = multipleFromLaunch(token.launchPriceSol || token.priceSol, token.priceSol)

  const stats = useMemo(
    () => [
      { label: 'Market cap', value: formatUsd(token.marketCapUsd) },
      { label: 'FDV / price', value: `${token.priceSol.toExponential(2)} SOL` },
      {
        label: '24h',
        value: `${up ? '+' : ''}${token.change24h.toFixed(1)}%`,
        color: up ? 'text-[#00c805]' : 'text-[#f23645]',
      },
      { label: 'Volume', value: formatUsd(token.volumeUsd) },
      { label: 'ATH', value: formatUsd(token.athUsd) },
      { label: 'TXNS', value: `${token.buyCount + token.sellCount}` },
      { label: 'Buys / Sells', value: `${token.buyCount} / ${token.sellCount}` },
      { label: 'Since launch', value: `${mult.toFixed(2)}×` },
    ],
    [token, up, mult],
  )

  function copyCa() {
    void navigator.clipboard.writeText(ca)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  function share() {
    const url = window.location.href
    void navigator.clipboard.writeText(url)
    setShared(true)
    window.setTimeout(() => setShared(false), 1500)
  }

  return (
    <div className="mx-auto max-w-6xl px-3 py-3 pb-10 sm:py-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-[#848e9c] transition hover:text-white"
        >
          ← Board
        </Link>
        <button
          type="button"
          onClick={share}
          className="rounded-full border border-[#1a1d24] bg-[#12151a] px-3 py-1 text-[11px] font-semibold text-[#848e9c] transition hover:text-white"
        >
          {shared ? 'Link copied ✓' : 'Share'}
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 fade-up">
        <TokenImage
          src={token.imageUrl}
          seed={token.id}
          emoji={token.emoji}
          alt={token.name}
          className="h-14 w-14 shrink-0 rounded-2xl object-cover ring-2 ring-[#00c805]/25 sm:h-16 sm:w-16"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-black sm:text-xl">{token.name}</h1>
            <span className="rounded-md bg-[#12151a] px-2 py-0.5 text-xs font-bold text-[#848e9c]">
              ${token.symbol}
            </span>
            {token.complete && (
              <span className="rounded-md bg-yellow-400/15 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                Graduated
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-[#5d6573]">
            by {token.creatorName} · {timeAgo(token.createdAt)} · last {timeAgo(token.lastTradeAt)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p
              className={`text-2xl font-black tabular-nums transition duration-300 sm:text-3xl ${
                flash === 'up'
                  ? 'text-[#00c805]'
                  : flash === 'down'
                    ? 'text-[#f23645]'
                    : 'text-white'
              }`}
            >
              {formatUsd(token.marketCapUsd)}
            </p>
            <span className={`text-sm font-bold ${up ? 'text-[#00c805]' : 'text-[#f23645]'}`}>
              {up ? '▲' : '▼'} {Math.abs(token.change24h).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Action chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyCa}
          className="rounded-lg border border-[#1a1d24] bg-[#12151a] px-3 py-1.5 font-mono text-[11px] text-[#00c805] transition hover:border-[#00c805]/40"
        >
          {copied ? 'Copied ✓' : `CA ${shortAddr(ca, 6)}`}
        </button>
        {safeHref(token.twitter) && (
          <a
            href={safeHref(token.twitter)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#1a1d24] px-3 py-1.5 text-[11px] text-[#848e9c] hover:text-white"
          >
            𝕏
          </a>
        )}
        {safeHref(token.telegram) && (
          <a
            href={safeHref(token.telegram)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#1a1d24] px-3 py-1.5 text-[11px] text-[#848e9c] hover:text-white"
          >
            TG
          </a>
        )}
        {safeHref(token.website) && (
          <a
            href={safeHref(token.website)}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-[#1a1d24] px-3 py-1.5 text-[11px] text-[#848e9c] hover:text-white"
          >
            Web
          </a>
        )}
        <a
          href={EXPLORER_ADDR(token.mint || token.creator)}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[#1a1d24] px-3 py-1.5 text-[11px] text-[#5d6573] hover:text-white"
        >
          Explorer
        </a>
      </div>

      <div className="mt-3">
        <BondingProgress mcap={token.marketCapUsd} complete={token.complete} />
      </div>

      {/* Main: chart + trade (pump.fun style) */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Chart token={token} />

          {/* Compact stats under chart */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[#1a1d24] bg-[#0b0e11] px-3 py-2.5"
              >
                <p className="text-[10px] uppercase tracking-wide text-[#5d6573]">{s.label}</p>
                <p className={`mt-0.5 text-sm font-bold tabular-nums ${s.color || 'text-white'}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <p className="text-sm leading-relaxed text-[#848e9c]">{token.description}</p>

          <div className="flex gap-1 rounded-xl bg-[#0b0e11] p-1">
            {(['trades', 'thread', 'holders'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition ${
                  tab === t ? 'bg-[#1e2329] text-white' : 'text-[#5d6573] hover:text-[#848e9c]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'trades' && (
            <section className="overflow-hidden rounded-2xl border border-[#1a1d24] bg-[#0b0e11]">
              <div className="grid grid-cols-[64px_1fr_1fr_1fr_auto] gap-2 border-b border-[#1a1d24] px-3 py-2 text-[10px] font-semibold uppercase text-[#5d6573]">
                <span>Side</span>
                <span>Amount</span>
                <span>USD</span>
                <span>Account</span>
                <span>Time</span>
              </div>
              <div className="max-h-[360px] space-y-0 overflow-y-auto">
                {tokenTrades.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-[#5d6573]">No trades yet</p>
                )}
                {tokenTrades.map((t) => (
                  <div
                    key={t.id}
                    className="grid grid-cols-[64px_1fr_1fr_1fr_auto] gap-2 border-b border-[#12151a] px-3 py-2 text-xs tabular-nums"
                  >
                    <span className={`font-bold ${t.side === 'buy' ? 'text-[#00c805]' : 'text-[#f23645]'}`}>
                      {t.side.toUpperCase()}
                    </span>
                    <span className="text-white">{formatSol(t.solAmount)}</span>
                    <span className="text-[#848e9c]">{formatUsd(t.solAmount * SOL_PRICE_USD)}</span>
                    <span className="font-mono text-[#5d6573]">{shortAddr(t.wallet, 3)}</span>
                    <span className="text-[#5d6573]">{timeAgo(t.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'thread' && (
            <section className="rounded-2xl border border-[#1a1d24] bg-[#0b0e11] p-4">
              <div className="mb-3 flex gap-2">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={connected ? 'Add a comment…' : 'Connect to comment'}
                  className="flex-1 rounded-xl border border-[#1a1d24] bg-[#12151a] px-4 py-2.5 text-sm outline-none focus:border-[#00c805]/40"
                />
                <button
                  type="button"
                  className="btn-press rounded-xl bg-[#00c805] px-4 py-2 text-sm font-bold text-black"
                  onClick={() => {
                    if (!connected) {
                      openModal()
                      return
                    }
                    addComment(token.id, text)
                    setText('')
                  }}
                >
                  Post
                </button>
              </div>
              <div className="space-y-2">
                {tokenComments.length === 0 && (
                  <p className="text-xs text-[#5d6573]">No comments yet</p>
                )}
                {tokenComments.map((c) => (
                  <div key={c.id} className="rounded-xl bg-[#12151a] p-3 text-sm">
                    <p className="text-[11px] text-[#5d6573]">
                      {shortAddr(c.author)} · {timeAgo(c.createdAt)}
                    </p>
                    <p className="mt-1 text-[#e8e8ed]">{c.text}</p>
                    <button
                      type="button"
                      className="mt-1 text-[11px] text-[#5d6573] hover:text-[#00c805]"
                      onClick={() => likeComment(c.id)}
                    >
                      ♡ {c.likes}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'holders' && (
            <section className="rounded-2xl border border-[#1a1d24] bg-[#0b0e11] p-4">
              <HoldersList holders={token.holders} />
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-14 lg:self-start">
          <TradePanel token={token} />
        </div>
      </div>
    </div>
  )
}
