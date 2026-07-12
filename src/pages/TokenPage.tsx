import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { Chart } from '../components/Chart'
import { TradePanel } from '../components/TradePanel'
import { BondingProgress } from '../components/BondingProgress'
import { HoldersList } from '../components/HoldersList'
import { TokenImage } from '../components/TokenImage'
import { formatUsd, shortAddr, timeAgo, formatSol, safeHref } from '../lib/format'
import { useWallet } from '../hooks/useWallet'
import { EXPLORER_ADDR, CLUSTER } from '../chain/config'
import { progressToGraduation, SOL_PRICE_USD } from '../engine/bondingCurve'

export function TokenPage() {
  const { id } = useParams()
  const tokens = useStore((s) => s.tokens)
  const trades = useStore((s) => s.trades)
  const comments = useStore((s) => s.comments)
  const addComment = useStore((s) => s.addComment)
  const likeComment = useStore((s) => s.likeComment)
  const { connected, openModal } = useWallet()
  const [text, setText] = useState('')
  const [tab, setTab] = useState<'thread' | 'trades' | 'holders'>('thread')
  const [copied, setCopied] = useState(false)

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

  const tokenTrades = trades.filter((t) => t.tokenId === token.id).slice(0, 40)
  const tokenComments = comments.filter((c) => c.tokenId === token.id)
  const progress = progressToGraduation(token.marketCapUsd)
  const up = token.change24h >= 0
  const ca = token.mint || token.id

  const stats = useMemo(
    () => [
      { label: 'Market cap', value: formatUsd(token.marketCapUsd) },
      { label: 'Price', value: `${token.priceSol.toExponential(2)} SOL` },
      { label: '24h', value: `${up ? '+' : ''}${token.change24h.toFixed(1)}%`, color: up ? 'text-[#86efac]' : 'text-[#f87171]' },
      { label: 'Volume', value: formatUsd(token.volumeUsd) },
      { label: 'ATH', value: formatUsd(token.athUsd) },
      { label: 'Buys / Sells', value: `${token.buyCount} / ${token.sellCount}` },
      { label: 'Replies', value: String(token.replies) },
      { label: 'Progress', value: `${progress.toFixed(1)}%` },
    ],
    [token, up, progress],
  )

  function copyCa() {
    void navigator.clipboard.writeText(ca)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 pb-8">
      <Link to="/" className="text-xs text-[#8b8d97] hover:text-white">
        ← board
      </Link>

      {/* Header */}
      <div className="mt-3 flex items-start gap-3">
        <TokenImage
          src={token.imageUrl}
          seed={token.id}
          emoji={token.emoji}
          alt={token.name}
          className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-2 ring-[#86efac]/30"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-black">
              {token.emoji} {token.name}
            </h1>
            <span className="rounded-full bg-[#86efac]/15 px-2 py-0.5 text-xs font-bold text-[#86efac]">
              ${token.symbol}
            </span>
            {token.complete && (
              <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-300">
                🎓 Graduated
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#8b8d97]">
            by @{token.creatorName} · {timeAgo(token.createdAt)} · last trade {timeAgo(token.lastTradeAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-2xl font-black text-[#86efac]">{formatUsd(token.marketCapUsd)}</p>
            <span className={`text-sm font-bold ${up ? 'text-[#86efac]' : 'text-[#f87171]'}`}>
              {up ? '▲' : '▼'} {Math.abs(token.change24h).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* CA + socials */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyCa}
          className="rounded-full border border-[#26272e] bg-[#14151b] px-3 py-1.5 font-mono text-[11px] text-[#86efac]"
        >
          {copied ? 'copied ✓' : `CA ${shortAddr(ca, 6)}`}
        </button>
        {safeHref(token.twitter) && (
          <a href={safeHref(token.twitter)} target="_blank" rel="noreferrer" className="rounded-full border border-[#26272e] px-3 py-1.5 text-[11px]">
            𝕏 Twitter
          </a>
        )}
        {safeHref(token.telegram) && (
          <a href={safeHref(token.telegram)} target="_blank" rel="noreferrer" className="rounded-full border border-[#26272e] px-3 py-1.5 text-[11px]">
            Telegram
          </a>
        )}
        {safeHref(token.website) && (
          <a href={safeHref(token.website)} target="_blank" rel="noreferrer" className="rounded-full border border-[#26272e] px-3 py-1.5 text-[11px]">
            Website
          </a>
        )}
        <a
          href={EXPLORER_ADDR(token.mint || token.creator)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#26272e] px-3 py-1.5 text-[11px] text-[#8b8d97]"
        >
          Solscan
        </a>
        {safeHref(token.pairUrl) && (
          <a
            href={safeHref(token.pairUrl)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#3b82f6] px-3 py-1.5 text-[11px] font-bold text-white"
          >
            DexScreener ↗
          </a>
        )}
        {token.liquidityUsd != null && token.liquidityUsd > 0 && (
          <span className="rounded-full border border-[#26272e] px-3 py-1.5 text-[11px] text-[#8b8d97]">
            Liq {formatUsd(token.liquidityUsd)}
          </span>
        )}
      </div>

      {/* Tags */}
      {token.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {token.tags.map((t) => (
            <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#8b8d97]">
              #{t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">
        <BondingProgress mcap={token.marketCapUsd} complete={token.complete} />
      </div>

      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#1f2028] bg-[#14151b] p-3">
            <p className="text-[10px] uppercase tracking-wide text-[#6b6d78]">{s.label}</p>
            <p className={`mt-0.5 text-sm font-bold ${s.color || 'text-white'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Chart token={token} />

          <p className="text-sm leading-relaxed text-[#a0a1a8]">{token.description}</p>

          {/* Tabs */}
          <div className="flex gap-2">
            {(['thread', 'trades', 'holders'] as const).map((t) => (
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

          {tab === 'thread' && (
            <section className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
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
                  <p className="text-xs text-[#6b6d78]">no replies yet — be first</p>
                )}
                {tokenComments.map((c) => (
                  <div key={c.id} className="rounded-xl bg-[#0e0f13] p-3 text-sm">
                    <p className="text-[11px] text-[#6b6d78]">
                      {shortAddr(c.author)} · {timeAgo(c.createdAt)}
                    </p>
                    <p className="mt-1">{c.text}</p>
                    <button type="button" className="mt-1 text-[11px] text-[#8b8d97]" onClick={() => likeComment(c.id)}>
                      ♡ {c.likes}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'trades' && (
            <section className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
              <div className="space-y-1 text-xs">
                {tokenTrades.length === 0 && <p className="text-[#6b6d78]">no trades yet</p>}
                {tokenTrades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between border-b border-[#1a1b22] py-2">
                    <span className={t.side === 'buy' ? 'font-bold text-[#86efac]' : 'font-bold text-[#f87171]'}>
                      {t.side.toUpperCase()}
                    </span>
                    <span>{formatSol(t.solAmount)} SOL</span>
                    <span className="text-[#6b6d78]">~{formatUsd(t.solAmount * SOL_PRICE_USD)}</span>
                    <span className="font-mono text-[#6b6d78]">{shortAddr(t.wallet)}</span>
                    <span className="text-[#555]">{timeAgo(t.createdAt)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'holders' && (
            <section className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
              <HoldersList holders={token.holders} />
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-16 lg:self-start">
          <TradePanel token={token} />
          <p className="mt-2 text-center text-[10px] text-[#555]">network: {CLUSTER}</p>
        </div>
      </div>
    </div>
  )
}
