import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import {
  getJupiterQuote,
  executeJupiterSwap,
  WSOL,
  raydiumTradeUrl,
  jupiterTradeUrl,
  type QuoteResult,
} from '../chain/jupiter'
import { EXPLORER_TX, CLUSTER, CHAIN_LABEL } from '../chain/config'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

/**
 * Swap hub — Jupiter routes (Raydium/Orca/etc) + deep links
 */
export function SwapPage() {
  const { connected, openModal, adapter, solBalance } = useWallet()
  const [mint, setMint] = useState('')
  const [amountSol, setAmountSol] = useState('0.1')
  const [slippage, setSlippage] = useState('1')
  const [quote, setQuote] = useState<QuoteResult | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sig, setSig] = useState('')
  const [loading, setLoading] = useState(false)

  async function doQuote() {
    setError('')
    setQuote(null)
    if (!mint.trim()) {
      setError('Paste a token mint address')
      return
    }
    const sol = parseFloat(amountSol)
    if (!(sol > 0)) {
      setError('Enter SOL amount')
      return
    }
    setLoading(true)
    setStatus('Fetching Jupiter route (Raydium / Orca / …)…')
    try {
      const q = await getJupiterQuote({
        inputMint: WSOL,
        outputMint: mint.trim(),
        amount: Math.floor(sol * LAMPORTS_PER_SOL),
        slippageBps: Math.floor(parseFloat(slippage) * 100) || 100,
      })
      setQuote(q)
      setStatus('Route ready — confirm swap in wallet')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quote failed')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  async function doSwap() {
    setError('')
    if (!connected) {
      openModal()
      return
    }
    if (!quote) {
      setError('Get a quote first')
      return
    }
    setLoading(true)
    setStatus('Approve swap in Phantom…')
    try {
      const signature = await executeJupiterSwap({ wallet: adapter, quote })
      setSig(signature)
      setStatus('Swap confirmed on Solana ✓')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Swap failed'
      setError(/reject|cancel|denied/i.test(msg) ? 'Cancelled in wallet' : msg)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-3 py-6">
      <h1 className="text-2xl font-black">Swap</h1>
      <p className="mt-1 text-sm text-[#8b8d97]">
        Jupiter aggregator · routes through Raydium, Orca, Meteora & more · {CHAIN_LABEL}
      </p>

      <div className="mt-5 space-y-3 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <div>
          <label className="mb-1 block text-xs text-[#8b8d97]">You pay (SOL)</label>
          <input
            value={amountSol}
            onChange={(e) => setAmountSol(e.target.value)}
            className="w-full rounded-xl border border-[#26272e] bg-[#0e0f13] px-3 py-3 text-lg font-semibold outline-none focus:border-[#86efac]/40"
          />
          <p className="mt-1 text-[11px] text-[#6b6d78]">Balance {solBalance.toFixed(4)} SOL</p>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8b8d97]">Token mint (output)</label>
          <input
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="Paste SPL mint address"
            className="w-full rounded-xl border border-[#26272e] bg-[#0e0f13] px-3 py-3 font-mono text-sm outline-none focus:border-[#86efac]/40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#8b8d97]">Slippage %</label>
          <input
            value={slippage}
            onChange={(e) => setSlippage(e.target.value)}
            className="w-24 rounded-lg border border-[#26272e] bg-[#0e0f13] px-2 py-1.5 text-sm"
          />
        </div>

        {quote && (
          <div className="rounded-xl bg-[#0e0f13] p-3 text-xs text-[#8b8d97]">
            <p>
              Out amount (raw):{' '}
              <span className="font-mono text-[#86efac]">{quote.outAmount}</span>
            </p>
            <p>Price impact: {quote.priceImpactPct}%</p>
            <p>Routes: {quote.routePlan?.length || 0} hop(s)</p>
          </div>
        )}

        {status && <p className="text-center text-sm text-[#86efac]">{status}</p>}
        {error && <p className="text-center text-sm text-[#f87171]">{error}</p>}
        {sig && (
          <a
            href={EXPLORER_TX(sig)}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs text-[#86efac] underline"
          >
            View swap tx →
          </a>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void doQuote()}
            className="flex-1 rounded-full border border-[#86efac]/40 py-3 text-sm font-bold text-[#86efac] disabled:opacity-50"
          >
            Get quote
          </button>
          <button
            type="button"
            disabled={loading || !quote}
            onClick={() => void doSwap()}
            className="flex-1 rounded-full bg-[#86efac] py-3 text-sm font-bold text-black disabled:opacity-50"
          >
            {connected ? 'Swap' : 'Sign in'}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {mint && (
          <>
            <a
              href={jupiterTradeUrl(mint.trim())}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#26272e] px-3 py-1.5 text-[#8b8d97]"
            >
              Open Jupiter ↗
            </a>
            <a
              href={raydiumTradeUrl(mint.trim())}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#26272e] px-3 py-1.5 text-[#8b8d97]"
            >
              Open Raydium ↗
            </a>
          </>
        )}
        <p className="w-full text-[10px] text-[#555]">
          Network must match wallet ({CLUSTER}). Mainnet needs real SOL; Devnet liquidity may be thin.
        </p>
      </div>
    </div>
  )
}
