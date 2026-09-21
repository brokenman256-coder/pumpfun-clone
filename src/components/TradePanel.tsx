import { useMemo, useState, useEffect } from 'react'
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
import { EXPLORER_TX, PERSONAL_MODE } from '../chain/config'
import { jupiterTradeUrl, raydiumTradeUrl } from '../chain/jupiter'
import { buyOnChain, sellOnChain, fetchBondingCurve, getConnection } from '../chain/launchpadClient'
import { managedBuyOnChain, requestManagedSellPayout } from '../chain/managedTrade'
import { postLiveTrade } from '../lib/liveBoardApi'
import { paySolOnChain, sendSplToDesk } from '../chain/pay'
import {
  deskBuy,
  deskDeliverHouse,
  deskMint,
  deskSell,
  isSolanaDeskToken,
} from '../lib/deskApi'
import {
  formatJackpotCountdown,
  isJackpotArmed,
  isSellLocked,
  multipleFromLaunch,
} from '../engine/jackpot'

import { FillReceipt, type FillInfo } from './FillReceipt'
import {
  FIRST_BUY_SOL,
  NEW_WALLET_MAX_SOL,
  isCappedNewWallet,
  loadJourney,
  markSellGuideSeen,
  recordRealBuy,
} from '../lib/traderJourney'

const MINT_DECIMALS = 9
const QUICK = [0.05, 0.1, 0.25, 0.5]

function isManaged(token: Token) {
  if (token.mint && token.curvePda) return false
  if (token.source === 'dexscreener') return false
  return token.managed === true || token.source === 'bot' || token.source === 'local' || !token.mint
}

export function TradePanel({ token }: { token: Token }) {
  const executeTrade = useStore((s) => s.executeTrade)
  const applyLiveToken = useStore((s) => s.applyLiveToken)
  const bookHolding = useStore((s) => s.bookHolding)
  const syncTokenFromChain = useStore((s) => s.syncTokenFromChain)
  const {
    connected,
    openModal,
    holdings,
    solBalance,
    refreshBalance,
    adapter,
    address,
    isRealTrader,
    connectPhantom,
  } = useWallet()

  const onChain = Boolean(token.mint && token.curvePda)
  const managed = isManaged(token)
  const desk = isSolanaDeskToken(token)
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [txSig, setTxSig] = useState('')
  const [loading, setLoading] = useState(false)
  const [fill, setFill] = useState<FillInfo | null>(null)
  const journey = loadJourney(address)
  const newWallet = isCappedNewWallet(address)

  useEffect(() => {
    if (!amount && journey.realBuys === 0 && mode === 'buy') {
      setAmount(String(FIRST_BUY_SOL))
    }
  }, [journey.realBuys, mode])

  const holding = holdings[token.id] ?? 0
  const num = parseFloat(amount) || 0
  const reserves = reservesFromToken(token)
  const sellLocked = isSellLocked(token)
  const armed = isJackpotArmed(token)
  const mult = multipleFromLaunch(
    token.launchPriceSol || token.priceSol,
    token.priceSol,
  )

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
      ? `${PLATFORM_MARGIN_BPS / 100}% fee`
      : `${TRADE_FEE_BPS / 100}% fee`

  async function place(quick?: number) {
    setError('')
    setStatus('')
    setTxSig('')

    // Real traders must use Phantom for managed board coins
    if (managed && !isRealTrader && !PERSONAL_MODE) {
      openModal()
      return
    }

    if (!isRealTrader) {
      openModal()
      return
    }

    if (token.tradingPaused) {
      setError('Trading is paused for this market')
      return
    }
    if (token.complete && !desk) {
      setError('This market has graduated')
      return
    }
    const a = quick ?? num
    if (a <= 0) {
      setError('Enter amount')
      return
    }
    if (isRealTrader && mode === 'buy' && newWallet && a > NEW_WALLET_MAX_SOL) {
      setError(`New wallets can buy up to ${NEW_WALLET_MAX_SOL} SOL per order.`)
      return
    }

    setLoading(true)
    try {
      let signature: string | undefined

      // ── Real Solana coin: SOL → desk wallet → Jupiter buy/sell ──
      if (desk) {
        if (!isRealTrader || !address) {
          openModal()
          return
        }
        const mint = deskMint(token)
        if (mode === 'buy') {
          if (a > solBalance + 0.0001) {
            setError(`Insufficient SOL in Phantom (need ~${a})`)
            return
          }
          setStatus(`Send ${a} SOL to the NOVA desk…`)
          signature = await paySolOnChain({
            wallet: adapter,
            amountSol: a,
            memo: `nova:desk:buy:${mint.slice(0, 24)}`,
          })
          setTxSig(signature)
          setStatus('Desk buying on Jupiter…')
          const fill = await deskBuy({
            signature,
            mint,
            amountSol: a,
            wallet: address,
            tokenId: token.id,
            symbol: token.symbol,
          })
          if (!fill.ok) {
            setError(fill.error || 'Desk buy failed')
            return
          }
          bookHolding(token.id, 'buy', fill.tokensOut || 0, a, fill.swapSig || signature)
          setTxSig(fill.swapSig || signature)
          if (address) recordRealBuy(address, mint)
          setFill({
            side: 'buy',
            symbol: token.symbol,
            mint,
            sol: a,
            tokens: fill.tokensOut,
          })
          setStatus('Filled · token is in Phantom')
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#e8a35a', '#c084fc', '#f4ead8'],
          })
        } else {
          if (a > holding + 1e-9) {
            setError('Insufficient tokens on the desk')
            return
          }
          setStatus('Approve token in Phantom…')
          const tokenTransferSig = await sendSplToDesk({
            wallet: adapter,
            mint,
            amountUi: a,
          })
          setTxSig(tokenTransferSig)
          setStatus('Settling sell…')
          const fill = await deskSell({
            mint,
            tokenAmount: a,
            wallet: address,
            tokenId: token.id,
            symbol: token.symbol,
            tokenTransferSig,
          })
          if (!fill.ok) {
            setError(fill.error || 'Desk sell failed')
            return
          }
          bookHolding(token.id, 'sell', a, fill.solOut || 0, fill.payoutSig || fill.swapSig)
          setTxSig(fill.payoutSig || fill.swapSig || '')
          setStatus(
            fill.payoutPending
              ? 'Sold on Jupiter · payout pending'
              : `Sold · ${fill.solOut?.toFixed(4)} SOL sent to Phantom ✓`,
          )
        }
        setAmount('')
        await refreshBalance()
        return
      }

      // ── Real Phantom trader on managed market ─────────────
      // Pays real SOL to treasury; curve still system-managed
      if (managed && isRealTrader) {
        if (mode === 'buy') {
          if (a > solBalance + 0.0001) {
            setError(`Insufficient SOL in Phantom (need ~${a})`)
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
          setStatus('SOL received · updating market…')

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
            if (address && (live.tokensOut || 0) > 0) {
              setStatus('Sending tokens to Phantom…')
              const d = await deskDeliverHouse({
                tokenId: token.id,
                wallet: address,
                tokensOut: live.tokensOut || 0,
                signature,
              })
              if (d.ok && d.mint) {
                applyLiveToken({ ...live.token, mint: d.mint })
                setTxSig(d.deliverSig || signature)
              }
            }
          } else {
            const res = executeTrade(
              token.id,
              'buy',
              a,
              address || undefined,
              false,
              signature,
            )
            if (!res.ok) {
              setError(res.error || 'Curve update failed')
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
          setStatus('Booking sell on market…')
          const live = await postLiveTrade({
            tokenId: token.id,
            side: 'sell',
            amount: a,
            wallet: address || undefined,
          })
          let solOut = q.solOut
          let payoutToken: string | undefined
          if (live.ok && live.token) {
            applyLiveToken(live.token)
            solOut = live.solOut ?? q.solOut
            payoutToken = live.payoutToken
            bookHolding(token.id, 'sell', a, solOut, live.trade?.signature)
          } else {
            const res = executeTrade(token.id, 'sell', a, address || undefined, false)
            if (!res.ok) {
              setError(res.error || 'Sell failed')
              return
            }
            solOut = res.solOut ?? q.solOut
          }

          setStatus(`Sending ${solOut.toFixed(4)} SOL to your Phantom…`)
          if (address && payoutToken) {
            const payout = await requestManagedSellPayout({
              payoutToken,
              to: address,
              amountSol: solOut,
              tokenId: token.id,
              symbol: token.symbol,
              tokenAmount: a,
            })
            if (payout.ok && payout.signature) {
              signature = payout.signature
              setTxSig(payout.signature)
              setStatus('SOL sent to Phantom ✓')
            } else {
              // Curve already moved; explain payout setup
              setStatus(
                payout.error ||
                  'Sell booked · fund BOT_WALLET_SECRET on server for auto-payouts',
              )
              if (payout.error) {
                setError('Sell booked. SOL payout is delayed — retry in a moment.')
              }
            }
          } else if (address) {
            setStatus('Sell booked. SOL returns to Phantom shortly.')
          }
        }
        setAmount('')
        await refreshBalance()
        if (mode === 'buy') {
          if (address) recordRealBuy(address, token.mint || token.id)
          setFill({
            side: 'buy',
            symbol: token.symbol,
            mint: token.mint || token.id,
            sol: a,
          })
          setStatus('Filled · token is in Phantom')
          confetti({
            particleCount: 80,
            spread: 55,
            origin: { y: 0.7 },
            colors: ['#e8a35a', '#c084fc', '#f4ead8'],
          })
        } else if (!error) {
          setFill({ side: 'sell', symbol: token.symbol, mint: token.mint, sol: solOut || 0 })
          setStatus((s) => s || 'Sold · SOL to Phantom')
        }
        return
      }



      // ── Full on-chain program token ───────────────────────
      if (onChain && token.mint) {
        if (!isRealTrader) {
          openModal()
          return
        }
        const mint = new PublicKey(token.mint)
        setStatus(`Confirm ${mode} in Phantom…`)
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
        setAmount('')
        await refreshBalance()
        setStatus(mode === 'buy' ? 'Buy confirmed ✓' : 'Sell filled ✓')
        return
      }

      setError('Connect Phantom to trade')
      openModal()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Transaction failed'
      setError(/reject|cancel|denied/i.test(msg) ? 'Cancelled in Phantom' : msg)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const tokensOut =
    estimate && 'tokensOut' in estimate
      ? (estimate as { tokensOut: number }).tokensOut
      : null
  const solOutEst =
    estimate && 'solOut' in estimate ? (estimate as { solOut: number }).solOut : null
  const marginAmt =
    estimate && 'margin' in estimate ? (estimate as { margin: number }).margin : null

  return (
    <div className="trade-panel rounded-2xl border border-[#1e293b] bg-[#111827] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3b82f6] opacity-50" />
            <span className="relative h-2 w-2 rounded-full bg-[#3b82f6]" />
          </span>
          <span className="text-xs font-bold text-white">Trade</span>
          <span className="text-[10px] text-[#6b6d78]">{PLATFORM_MARGIN_BPS / 100}% fee</span>
        </div>
        <span className="rounded-full bg-[#0a0e1a] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#3b82f6]">
          {formatSol(solBalance)} SOL
        </span>
      </div>

      {!isRealTrader && (
        <button
          type="button"
          onClick={() => openModal()}
          className="btn-press mb-3 w-full rounded-xl border border-[#00c805]/35 bg-gradient-to-r from-[#00c805]/15 to-transparent py-2.5 text-xs font-bold text-[#00c805] transition hover:border-[#00c805]/55 hover:from-[#00c805]/25"
        >
          Connect Phantom / wallet to trade
        </button>
      )}

      <div className="mb-3 flex rounded-xl bg-[#0a0e1a] p-1">
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
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold capitalize transition duration-200 ${
              mode === m
                ? m === 'buy'
                  ? 'bg-[#3b82f6] text-white shadow-[0_0_20px_rgba(59,130,246,0.25)]'
                  : 'bg-[#f87171] text-white shadow-[0_0_20px_rgba(248,113,113,0.2)]'
                : 'text-[#8b8d97] hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {sellLocked && (
        <div className="mb-3 animate-pulse rounded-xl border border-violet-400/50 bg-violet-500/15 p-3 text-center shadow-lg shadow-violet-500/20">
          <p className="text-sm font-black text-violet-200">
            🚀 PAST 2× · BUY ONLY · {mult.toFixed(1)}×
          </p>
          <p className="mt-1 text-[11px] text-violet-100/80">
            You can still <strong>buy</strong>. <strong>Selling is locked</strong>. After 24h
            this coin disappears completely.
          </p>
          {token.jackpotUnlockAt && (
            <p className="mt-2 text-xs font-bold text-violet-200">
              Vanishes in {formatJackpotCountdown(token.jackpotUnlockAt)}
            </p>
          )}
        </div>
      )}

      {token.complete && !desk ? (
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
                  className="rounded-lg border border-[#334155] py-1.5 text-xs font-semibold text-[#8b8d97] hover:border-[#3b82f6]/40"
                >
                  {v}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setAmount(String(Math.max(0, solBalance - 0.01).toFixed(3)))
                }
                className="rounded-lg border border-[#334155] py-1.5 text-xs font-semibold text-[#8b8d97]"
              >
                max
              </button>
            </div>
          )}
          {mode === 'sell' && !sellLocked && (
            <button
              type="button"
              className="mb-2 text-xs text-[#3b82f6]"
              onClick={() => setAmount(String(holding))}
            >
              balance: {formatTokens(holding)} · max
            </button>
          )}
          {mode === 'sell' && sellLocked && (
            <p className="mb-2 text-xs font-semibold text-violet-300">
              Selling locked while coin is past 2×
            </p>
          )}
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-[#334155] bg-[#0a0e1a] px-4 py-3.5 pr-16 text-lg font-semibold outline-none focus:border-[#3b82f6]/40"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8b8d97]">
              {mode === 'buy' ? 'SOL' : token.symbol}
            </span>
          </div>
          {estimate && (
            <p className="mt-2 text-xs text-[#8b8d97]">
              {mode === 'buy' && tokensOut != null ? (
                <>
                  you get ≈{' '}
                  <span className="text-[#3b82f6]">
                    {formatTokens(tokensOut)} {token.symbol}
                  </span>
                </>
              ) : solOutEst != null ? (
                <>
                  you get ≈{' '}
                  <span className="text-[#3b82f6]">{formatSol(solOutEst)} SOL</span>
                </>
              ) : null}
              {' · '}
              {feeLabel}
              {marginAmt != null && marginAmt > 0 && (
                <span className="text-[#555]"> · fee {formatSol(marginAmt)}</span>
              )}
            </p>
          )}
          {status && <p className="mt-2 text-xs text-[#3b82f6]">{status}</p>}
          {error && <p className="mt-2 text-xs text-[#f87171]">{error}</p>}
          {txSig && isRealTrader && (
            <a
              href={EXPLORER_TX(txSig)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[10px] text-[#3b82f6] underline"
            >
              view tx on Solscan →
            </a>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => void place()}
            className={`btn-press mt-3 w-full rounded-lg py-3.5 text-sm font-bold disabled:opacity-50 ${
              mode === 'buy' ? 'bg-[#3b82f6] text-white' : 'bg-[#f87171] text-white'
            }`}
          >
            {loading
              ? status || 'Confirm in wallet…'
              : !isRealTrader
                ? 'Connect Phantom'
                : mode === 'buy'
                  ? `Buy ${token.symbol}`
                  : `Sell ${token.symbol}`}
          </button>
          {isRealTrader && mode === 'buy' && newWallet && (
            <p className="mt-2 text-center text-[11px] leading-relaxed text-[#b7a99a]">
              Suggested first order: {FIRST_BUY_SOL} SOL. New accounts are limited to{' '}
              {NEW_WALLET_MAX_SOL} SOL per buy. Digital assets can lose value.
            </p>
          )}
          {isRealTrader && (
            <p className="mt-2 text-center text-[10px] text-[#7c6f66]">
              Fills settle to your connected wallet.
            </p>
          )}
          {fill && (
            <FillReceipt
              fill={fill}
              onClose={() => setFill(null)}
              showSellGuide={Boolean(address && !loadJourney(address).sellGuideSeen)}
              onSellGuide={() => {
                if (address) markSellGuideSeen(address)
                setFill((f) => (f ? { ...f } : f))
              }}
            />
          )}
          {!PERSONAL_MODE && (token.mint || token.source === 'dexscreener') && (
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-[10px]">
              <a
                href={jupiterTradeUrl(token.mint || token.id)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#334155] px-2 py-1 text-[#8b8d97]"
              >
                Jupiter ↗
              </a>
              <a
                href={raydiumTradeUrl(token.mint || token.id)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-[#334155] px-2 py-1 text-[#8b8d97]"
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
