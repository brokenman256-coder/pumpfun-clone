import { useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import type { Token } from '../types'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { getBuyQuote, getSellQuote, TRADE_FEE_BPS } from '../engine/bondingCurve'
import { formatSol, formatTokens } from '../lib/format'
import { CHAIN_LABEL, EXPLORER_TX, CLUSTER } from '../chain/config'

const QUICK = [0.1, 0.5, 1]

export function TradePanel({ token }: { token: Token }) {
  const executeTrade = useStore((s) => s.executeTrade)
  const { connected, openModal, holdings, solBalance, paySol, refreshBalance } = useWallet()
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [txSig, setTxSig] = useState('')
  const [loading, setLoading] = useState(false)

  const holding = holdings[token.id] ?? 0
  const num = parseFloat(amount) || 0

  const estimate = useMemo(() => {
    if (num <= 0) return null
    return mode === 'buy'
      ? getBuyQuote(num, token.virtualSol, token.virtualTokens)
      : getSellQuote(num, token.virtualSol, token.virtualTokens)
  }, [num, mode, token.virtualSol, token.virtualTokens])

  async function place(quick?: number) {
    setError('')
    setStatus('')
    setTxSig('')
    if (!connected) {
      openModal()
      return
    }
    if (token.complete) {
      setError('Graduated — trade on Raydium')
      return
    }
    const a = quick ?? num
    if (a <= 0) {
      setError('Enter amount')
      return
    }

    setLoading(true)
    try {
      let signature: string | undefined
      if (mode === 'buy') {
        setStatus(`Approve ${a} SOL in Phantom…`)
        signature = await paySol(a, `buy:${token.symbol}:${token.id}`)
        setTxSig(signature)
        setStatus('Confirmed · updating curve…')
      }
      const res = executeTrade(token.id, mode, a, undefined, false, signature)
      if (!res.ok) {
        setError(res.error || 'Failed')
        return
      }
      setAmount('')
      await refreshBalance()
      setStatus(mode === 'buy' ? 'Buy confirmed ✓' : 'Sell filled ✓')
      if (mode === 'buy') {
        confetti({ particleCount: 70, spread: 55, origin: { y: 0.7 }, colors: ['#86efac', '#fff'] })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      setError(/reject|cancel|denied/i.test(msg) ? 'Cancelled in wallet' : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
      <div className="mb-3 flex items-center justify-between text-[10px]">
        <span className="rounded-full bg-[#86efac]/10 px-2 py-0.5 font-semibold text-[#86efac]">
          ⛓ {CHAIN_LABEL}
        </span>
        <span className="text-[#8b8d97]">bal {formatSol(solBalance)} SOL</span>
      </div>

      <div className="mb-3 flex rounded-lg bg-[#0e0f13] p-1">
        {(['buy', 'sell'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setAmount('')
              setError('')
            }}
            className={`flex-1 rounded-md py-2.5 text-sm font-bold capitalize ${
              mode === m
                ? m === 'buy'
                  ? 'bg-[#86efac] text-black'
                  : 'bg-[#f87171] text-white'
                : 'text-[#8b8d97]'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {token.complete ? (
        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-4 text-center">
          <p className="font-bold text-yellow-300">🎓 Graduated</p>
          <a href="https://raydium.io" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-[#86efac] underline">
            trade on Raydium →
          </a>
        </div>
      ) : (
        <>
          {mode === 'buy' && (
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              {QUICK.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={loading}
                  onClick={() => void place(v)}
                  className="rounded-lg border border-[#26272e] py-1.5 text-xs font-semibold text-[#8b8d97] hover:border-[#86efac]/40"
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(Math.max(0, solBalance - 0.01).toFixed(3)))}
                className="rounded-lg border border-[#26272e] py-1.5 text-xs font-semibold text-[#8b8d97]"
              >
                max
              </button>
            </div>
          )}
          {mode === 'sell' && (
            <button type="button" className="mb-2 text-xs text-[#86efac]" onClick={() => setAmount(String(holding))}>
              balance: {formatTokens(holding)} · max
            </button>
          )}
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#26272e] bg-[#0e0f13] px-4 py-3.5 pr-16 text-lg font-semibold outline-none focus:border-[#86efac]/40"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8b8d97]">
              {mode === 'buy' ? 'SOL' : token.symbol}
            </span>
          </div>
          {estimate && (
            <p className="mt-2 text-xs text-[#8b8d97]">
              {mode === 'buy' ? (
                <>
                  you get ≈{' '}
                  <span className="text-[#86efac]">
                    {formatTokens((estimate as { tokensOut: number }).tokensOut)} {token.symbol}
                  </span>
                </>
              ) : (
                <>
                  you get ≈{' '}
                  <span className="text-[#86efac]">
                    {formatSol((estimate as { solOut: number }).solOut)} SOL
                  </span>
                </>
              )}
              {' · '}fee {TRADE_FEE_BPS / 100}%
            </p>
          )}
          {status && <p className="mt-2 text-xs text-[#86efac]">{status}</p>}
          {error && <p className="mt-2 text-xs text-[#f87171]">{error}</p>}
          {txSig && (
            <a href={EXPLORER_TX(txSig)} target="_blank" rel="noreferrer" className="mt-1 block text-[10px] text-[#86efac] underline">
              view tx →
            </a>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void place()}
            className={`btn-press mt-3 w-full rounded-lg py-3.5 text-sm font-bold disabled:opacity-50 ${
              mode === 'buy' ? 'bg-[#86efac] text-black' : 'bg-[#f87171] text-white'
            }`}
          >
            {loading
              ? status || 'Confirm in wallet…'
              : !connected
                ? 'Sign in'
                : mode === 'buy'
                  ? `buy ${token.symbol}`
                  : `sell ${token.symbol}`}
          </button>
          <p className="mt-3 text-center text-[10px] text-[#555]">
            Buys send real SOL on {CLUSTER} to treasury.
            {CLUSTER === 'devnet' && (
              <>
                {' '}
                <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="text-[#86efac] underline">
                  faucet
                </a>
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
