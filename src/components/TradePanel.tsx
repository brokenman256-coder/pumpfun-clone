import { useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { PublicKey } from '@solana/web3.js'
import type { Token } from '../types'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { getBuyQuote, getSellQuote, TRADE_FEE_BPS } from '../engine/bondingCurve'
import {
  managedBuyQuote,
  managedSellQuote,
  reservesFromToken,
  PLATFORM_MARGIN_BPS,
} from '../engine/managedMarket'
import { formatSol, formatTokens } from '../lib/format'
import { CHAIN_LABEL, EXPLORER_TX, CLUSTER, PERSONAL_MODE } from '../chain/config'
import { jupiterTradeUrl, raydiumTradeUrl } from '../chain/jupiter'
import { buyOnChain, sellOnChain, fetchBondingCurve, getConnection } from '../chain/launchpadClient'
import { managedBuyOnChain, requestManagedSellPayout } from '../chain/managedTrade'
import { postLiveTrade } from '../lib/liveBoardApi'

const MINT_DECIMALS = 9
const QUICK = [0.1, 0.5, 1, 5]

function isManaged(token: Token) {
  if (token.mint && token.curvePda) return false
  if (token.source === 'dexscreener') return false
  return token.managed === true || token.source === 'bot' || token.source === 'local' || !token.mint
}

export function TradePanel({ token }: { token: Token }) {
  const executeTrade = useStore((s) => s.executeTrade)
  const applyLiveToken = useStore((s) => s.applyLiveToken)
  const bookHolding = useStore((s) => s.bookHolding)
  const enterPersonalSession = useStore((s) => s.enterPersonalSession)
  const syncTokenFromChain = useStore((s) => s.syncTokenFromChain)
  const {
    connected,
    openModal,
    holdings,
    solBalance,
    refreshBalance,
    adapter,
    address,
    personalMode,
  } = useWallet()
  const onChain = Boolean(token.mint && token.curvePda) && !PERSONAL_MODE
  const managed = isManaged(token)
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [txSig, setTxSig] = useState('')
  const [loading, setLoading] = useState(false)

  const holding = holdings[token.id] ?? 0
  const num = parseFloat(amount) || 0
  const reserves = reservesFromToken(token)

  const estimate = useMemo(() => {
    if (num <= 0) return null
    if (managed || PERSONAL_MODE) {
      return mode === 'buy'
        ? managedBuyQuote(num, reserves)
        : managedSellQuote(num, reserves)
    }
    return mode === 'buy'
      ? getBuyQuote(num, token.virtualSol, token.virtualTokens)
      : getSellQuote(num, token.virtualSol, token.virtualTokens)
  }, [
    num,
    mode,
    managed,
    token.virtualSol,
    token.virtualTokens,
    reserves.curveSol,
    reserves.marginSol,
    reserves.virtualSol,
    reserves.virtualTokens,
  ])

  const feeLabel =
    managed || PERSONAL_MODE
      ? `${PLATFORM_MARGIN_BPS / 100}% system fee`
      : `${TRADE_FEE_BPS / 100}% fee`

  async function place(quick?: number) {
    setError('')
    setStatus('')
    setTxSig('')
    if (!connected) {
      if (PERSONAL_MODE) {
        enterPersonalSession()
      } else {
        openModal()
        return
      }
    }
    if (token.complete) {
      setError('Graduated')
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

      // ── PERSONAL: instant free trade, zero gas ─────────────
      if (PERSONAL_MODE || (managed && personalMode)) {
        setStatus(mode === 'buy' ? 'Filling buy…' : 'Filling sell…')
        const res = executeTrade(token.id, mode, a, undefined, false, `personal_${Date.now().toString(36)}`)
        if (!res.ok) {
          setError(res.error || 'Trade failed')
          return
        }
        signature = res.signature
        setTxSig(signature || '')
        setAmount('')
        setStatus(mode === 'buy' ? 'Buy filled ✓' : 'Sell filled ✓')
        if (mode === 'buy') {
          confetti({
            particleCount: 70,
            spread: 55,
            origin: { y: 0.7 },
            colors: ['#86efac', '#fff'],
          })
        }
        return
      }

      // ── Real on-chain launchpad program ───────────────────
      if (onChain && token.mint) {
        const mint = new PublicKey(token.mint)
        setStatus(`Confirm ${mode} in wallet…`)
        if (mode === 'buy') {
          signature = await buyOnChain({
            wallet: adapter,
            mint,
            solLamports: BigInt(Math.round(a * 1e9)),
          })
        } else {
          signature = await sellOnChain({
            wallet: adapter,
            mint,
            tokenAmountRaw: BigInt(Math.round(a * 10 ** MINT_DECIMALS)),
          })
        }
        setTxSig(signature)
        setStatus('Confirmed · syncing curve…')

        const curve = await fetchBondingCurve(getConnection(), mint)
        if (curve) {
          syncTokenFromChain(token.id, {
            virtualSolLamports: curve.virtualSolReserves,
            virtualTokenRaw: curve.virtualTokenReserves,
            realSolLamports: curve.realSolReserves,
            realTokenRaw: curve.realTokenReserves,
            complete: curve.complete,
            decimals: curve.decimals,
          })
        }
        executeTrade(token.id, mode, a, undefined, false, signature)
      }
      // ── Managed + real Phantom SOL ────────────────────────
      else if (managed) {
        if (mode === 'buy') {
          if (a > solBalance + 0.0001) {
            setError('Insufficient SOL')
            return
          }
          setStatus(`Approve ${a} SOL in Phantom…`)
          signature = await managedBuyOnChain({
            wallet: adapter,
            amountSol: a,
            tokenId: token.id,
            symbol: token.symbol,
          })
          setTxSig(signature)
          setStatus('SOL confirmed · curve…')
          const live = await postLiveTrade({
            tokenId: token.id,
            side: 'buy',
            amount: a,
            wallet: address || undefined,
            signature,
          })
          if (live.ok && live.token) {
            applyLiveToken(live.token)
            bookHolding(token.id, 'buy', live.tokensOut || 0, a, signature)
          } else {
            const res = executeTrade(token.id, 'buy', a, undefined, false, signature)
            if (!res.ok) {
              setError(res.error || 'Failed')
              return
            }
          }
        } else {
          const q = managedSellQuote(a, reserves)
          if (!q || q.solOut <= 0) {
            setError('Bad sell amount')
            return
          }
          if (a > holding + 1e-9) {
            setError('Insufficient tokens')
            return
          }
          setStatus('Booking sell…')
          const live = await postLiveTrade({
            tokenId: token.id,
            side: 'sell',
            amount: a,
            wallet: address || undefined,
          })
          let solOut = q.solOut
          if (live.ok && live.token) {
            applyLiveToken(live.token)
            solOut = live.solOut ?? q.solOut
            bookHolding(token.id, 'sell', a, solOut, live.trade?.signature)
          } else {
            const res = executeTrade(token.id, 'sell', a, undefined, false)
            if (!res.ok) {
              setError(res.error || 'Sell failed')
              return
            }
            solOut = res.solOut ?? q.solOut
          }
          if (address) {
            const payout = await requestManagedSellPayout({
              to: address,
              amountSol: solOut,
              tokenId: token.id,
              symbol: token.symbol,
              tokenAmount: a,
            })
            if (payout.ok && payout.signature) {
              signature = payout.signature
              setTxSig(payout.signature)
            }
          }
        }
      } else {
        const res = executeTrade(token.id, mode, a, undefined, false, signature)
        if (!res.ok) {
          setError(res.error || 'Failed')
          return
        }
      }

      setAmount('')
      await refreshBalance()
      setStatus(mode === 'buy' ? 'Buy confirmed ✓' : 'Sell filled ✓')
      if (mode === 'buy') {
        confetti({
          particleCount: 70,
          spread: 55,
          origin: { y: 0.7 },
          colors: ['#86efac', '#fff'],
        })
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      setError(/reject|cancel|denied/i.test(msg) ? 'Cancelled in wallet' : msg)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const tokensOut =
    estimate && 'tokensOut' in estimate
      ? (estimate as { tokensOut: number }).tokensOut
      : null
  const solOut =
    estimate && 'solOut' in estimate ? (estimate as { solOut: number }).solOut : null
  const marginAmt =
    estimate && 'margin' in estimate ? (estimate as { margin: number }).margin : null

  return (
    <div className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="rounded-full bg-[#86efac]/10 px-2 py-0.5 font-semibold text-[#86efac]">
          {CHAIN_LABEL}
        </span>
        {PERSONAL_MODE || personalMode ? (
          <span
            className="rounded-full bg-violet-400/15 px-2 py-0.5 font-semibold text-violet-300"
            title="Self-contained market. Bots trade free. No gas."
          >
            ⚡ personal · 0 gas · {PLATFORM_MARGIN_BPS / 100}% fee
          </span>
        ) : onChain ? (
          <span className="rounded-full bg-[#86efac]/10 px-2 py-0.5 font-semibold text-[#86efac]">
            🔒 on-chain
          </span>
        ) : managed ? (
          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-semibold text-emerald-300">
            ⚡ managed · {PLATFORM_MARGIN_BPS / 100}%
          </span>
        ) : (
          <span className="rounded-full bg-yellow-400/10 px-2 py-0.5 font-semibold text-yellow-300">
            external
          </span>
        )}
        <span className="text-[#8b8d97]">
          bal {formatSol(solBalance)} {PERSONAL_MODE ? 'vSOL' : 'SOL'}
        </span>
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
        </div>
      ) : (
        <>
          {mode === 'buy' && (
            <div className="mb-2 grid grid-cols-5 gap-1.5">
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
                onClick={() =>
                  setAmount(String(Math.max(0, solBalance - 0.01).toFixed(3)))
                }
                className="rounded-lg border border-[#26272e] py-1.5 text-xs font-semibold text-[#8b8d97]"
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
              {mode === 'buy' ? (PERSONAL_MODE ? 'vSOL' : 'SOL') : token.symbol}
            </span>
          </div>
          {estimate && (
            <p className="mt-2 text-xs text-[#8b8d97]">
              {mode === 'buy' && tokensOut != null ? (
                <>
                  you get ≈{' '}
                  <span className="text-[#86efac]">
                    {formatTokens(tokensOut)} {token.symbol}
                  </span>
                </>
              ) : solOut != null ? (
                <>
                  you get ≈{' '}
                  <span className="text-[#86efac]">{formatSol(solOut)} SOL</span>
                </>
              ) : null}
              {' · '}
              {feeLabel}
              {marginAmt != null && marginAmt > 0 && (
                <span className="text-[#555]"> · fee {formatSol(marginAmt)}</span>
              )}
            </p>
          )}
          {status && <p className="mt-2 text-xs text-[#86efac]">{status}</p>}
          {error && <p className="mt-2 text-xs text-[#f87171]">{error}</p>}
          {txSig && !PERSONAL_MODE && (
            <a
              href={EXPLORER_TX(txSig)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[10px] text-[#86efac] underline"
            >
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
              ? status || 'Working…'
              : !connected
                ? PERSONAL_MODE
                  ? 'Start trading'
                  : 'Connect wallet'
                : mode === 'buy'
                  ? `buy ${token.symbol}`
                  : `sell ${token.symbol}`}
          </button>
          <p className="mt-3 text-center text-[10px] text-[#555]">
            {PERSONAL_MODE
              ? 'Personal market: bots buy & sell free · your trades are instant · no gas · 5% system fee on fills.'
              : `Trades on ${CLUSTER}.`}
          </p>
          {!PERSONAL_MODE && (token.mint || token.source === 'dexscreener') && (
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px]">
              <a
                href={jupiterTradeUrl(token.mint || token.id)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#26272e] px-2 py-1 text-[#8b8d97] hover:text-[#86efac]"
              >
                Jupiter ↗
              </a>
              <a
                href={raydiumTradeUrl(token.mint || token.id)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#26272e] px-2 py-1 text-[#8b8d97] hover:text-[#86efac]"
              >
                Raydium ↗
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}
