import { useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import type { Token } from '../types'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { getBuyQuote, getSellQuote, TRADE_FEE_BPS } from '../engine/bondingCurve'
import { formatSol } from '../lib/format'
import { CHAIN_LABEL, EXPLORER_TX, CLUSTER } from '../chain/config'

const QUICK = [0.1, 0.5, 1]

export function TradePanel({ token }: { token: Token }) {
  const executeTrade = useStore((s) => s.executeTrade)
  const { connected, openModal, holdings, solBalance, paySol, refreshBalance } = useWallet()
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('1')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [txSig, setTxSig] = useState('')
  const [loading, setLoading] = useState(false)

  const holding = holdings[token.id] ?? 0
  const num = parseFloat(amount) || 0

  const estimate = useMemo(() => {
    if (num <= 0) return null
    if (mode === 'buy') {
      return getBuyQuote(num, token.virtualSol, token.virtualTokens)
    }
    return getSellQuote(num, token.virtualSol, token.virtualTokens)
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
        // REAL on-chain SOL payment
        setStatus(`Approve ${a} SOL in Phantom…`)
        signature = await paySol(a, `buy:${token.symbol}:${token.id}:${a}`)
        setTxSig(signature)
        setStatus('Confirmed on Solana · updating curve…')
      }

      const res = executeTrade(token.id, mode, a, undefined, false, signature)
      if (!res.ok) {
        setError(res.error || 'Trade failed')
        return
      }

      setAmount('')
      await refreshBalance()
      setStatus(mode === 'buy' ? 'Buy confirmed on-chain ✓' : 'Sell filled ✓')

      if (mode === 'buy') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#86efac', '#4ade80', '#ffffff'],
        })
      }
      if (res.graduated) {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      if (/reject|cancel|denied/i.test(msg)) setError('Transaction cancelled in wallet')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#26272e] bg-[#15161b] p-4">
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
              setStatus('')
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
          <a
            href="https://raydium.io"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-[#86efac] underline"
          >
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
                  onClick={() => place(v)}
                  className="btn-press rounded-lg border border-[#26272e] py-1.5 text-xs font-semibold text-[#8b8d97] hover:border-[#86efac]/40 hover:text-[#86efac] disabled:opacity-40"
                >
                  {v} SOL
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(Math.max(0, solBalance - 0.01).toFixed(3)))}
                className="btn-press rounded-lg border border-[#26272e] py-1.5 text-xs font-semibold text-[#8b8d97] hover:border-[#86efac]/40"
              >
                max
              </button>
            </div>
          )}

          {mode === 'sell' && (
            <button
              type="button"
              className="mb-2 text-xs text-[#86efac]"
              onClick={() => setAmount(String(holding))}
            >
              balance: {holding.toLocaleString(undefined, { maximumFractionDigits: 0 })} · max
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
                    {(estimate as { tokensOut: number }).tokensOut.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}{' '}
                    {token.symbol}
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
              {' · '}fee {(TRADE_FEE_BPS / 100).toFixed(0)}% · slip {slippage}%
            </p>
          )}

          <div className="mt-2 flex items-center gap-2 text-[11px] text-[#8b8d97]">
            <span>slippage</span>
            <input
              value={slippage}
              onChange={(e) => setSlippage(e.target.value)}
              className="w-12 rounded border border-[#26272e] bg-[#0e0f13] px-1 py-0.5 text-center"
            />
            <span>%</span>
          </div>

          {status && <p className="mt-2 text-xs text-[#86efac]">{status}</p>}
          {error && <p className="mt-2 text-xs text-[#f87171]">{error}</p>}
          {txSig && (
            <a
              href={EXPLORER_TX(txSig)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[10px] text-[#86efac] underline"
            >
              view tx on solscan →
            </a>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => place()}
            className={`btn-press relative mt-3 w-full overflow-hidden rounded-lg py-3.5 text-sm font-bold disabled:opacity-50 ${
              mode === 'buy'
                ? 'bg-[#86efac] text-black hover:bg-[#4ade80]'
                : 'bg-[#f87171] text-white hover:bg-red-400'
            }`}
          >
            {loading
              ? status || 'Confirm in wallet…'
              : !connected
                ? 'connect wallet'
                : mode === 'buy'
                  ? `buy ${token.symbol} (on-chain)`
                  : `sell ${token.symbol}`}
          </button>

          <p className="mt-3 text-center text-[10px] leading-relaxed text-[#555]">
            Buys send real SOL on {CLUSTER} to the platform treasury. Phantom must be on{' '}
            <span className="text-[#86efac]">{CLUSTER}</span>.
            {CLUSTER === 'devnet' && (
              <>
                {' '}
                Free SOL:{' '}
                <a
                  href="https://faucet.solana.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#86efac] underline"
                >
                  faucet.solana.com
                </a>
              </>
            )}
          </p>
        </>
      )}
    </div>
  )
}
