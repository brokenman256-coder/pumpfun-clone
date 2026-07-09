import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import {
  GATEWAY_PRESETS,
  processPayment,
  supportedWallets,
  type PaymentPurpose,
} from '../chain/paymentGateway'
import { useStore } from '../store/useStore'
import { FEE_RECIPIENT, EXPLORER_TX, CHAIN_LABEL } from '../chain/config'
import { shortAddr } from '../lib/format'

/**
 * Official multi-wallet payment gateway UI
 */
export function PayPage() {
  const { connected, openModal, connectPhantom, adapter, solBalance } = useWallet()
  const pushPayment = useStore((s) => s.pushPayment)
  const payments = useStore((s) => s.payments)
  const [purpose, setPurpose] = useState<PaymentPurpose>('create_fee')
  const [amount, setAmount] = useState(String(GATEWAY_PRESETS[0].amountSol))
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function pay() {
    setError('')
    setStatus('')
    if (!connected) {
      openModal()
      void connectPhantom()
      return
    }
    const sol = parseFloat(amount)
    if (!(sol > 0)) {
      setError('Invalid amount')
      return
    }
    setLoading(true)
    setStatus('Approve payment in wallet…')
    try {
      const result = await processPayment(adapter, {
        amountSol: sol,
        purpose,
        memo: `gateway:${purpose}`,
      })
      pushPayment(result)
      setStatus(`Paid ${sol} SOL ✓`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment failed'
      setError(/reject|cancel|denied/i.test(msg) ? 'Cancelled in wallet' : msg)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-3 py-6">
      <h1 className="text-2xl font-black">Payment gateway</h1>
      <p className="mt-1 text-sm text-[#8b8d97]">
        Official SOL checkout · Phantom, Solflare & Wallet Standard · {CHAIN_LABEL}
      </p>

      <div className="mt-4 rounded-2xl border border-[#86efac]/25 bg-[#0c1f14] p-4 text-xs text-[#8b8d97]">
        Treasury (recipient)
        <p className="mt-1 break-all font-mono text-[#86efac]">{FEE_RECIPIENT}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {supportedWallets().map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-[#1f2028] bg-[#14151b] p-3 text-center"
          >
            <p className="text-xl">{w.icon}</p>
            <p className="mt-1 text-[11px] font-bold text-white">{w.id}</p>
            <p className="text-[9px] text-[#6b6d78]">{w.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <p className="text-xs font-bold uppercase text-[#6b6d78]">Select product</p>
        {GATEWAY_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPurpose(p.id)
              setAmount(String(p.amountSol))
            }}
            className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left ${
              purpose === p.id
                ? 'border-[#86efac]/50 bg-[#86efac]/10'
                : 'border-[#26272e] bg-[#0e0f13]'
            }`}
          >
            <div>
              <p className="text-sm font-bold text-white">{p.label}</p>
              <p className="text-[11px] text-[#8b8d97]">{p.desc}</p>
            </div>
            <span className="font-bold text-[#86efac]">{p.amountSol} SOL</span>
          </button>
        ))}

        <div>
          <label className="mb-1 block text-xs text-[#8b8d97]">Amount (SOL)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-[#26272e] bg-[#0e0f13] px-3 py-2.5 text-sm outline-none"
          />
          <p className="mt-1 text-[11px] text-[#6b6d78]">
            Wallet bal {solBalance.toFixed(4)} SOL
          </p>
        </div>

        {status && <p className="text-center text-sm text-[#86efac]">{status}</p>}
        {error && <p className="text-center text-sm text-[#f87171]">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void pay()}
          className="w-full rounded-full bg-[#86efac] py-3.5 text-sm font-bold text-black disabled:opacity-50"
        >
          {loading ? 'Processing…' : connected ? 'Pay with wallet' : 'Connect wallet to pay'}
        </button>
      </div>

      {payments.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-bold">Recent payments</h2>
          <div className="space-y-2">
            {payments.slice(0, 10).map((p) => (
              <div
                key={p.signature}
                className="rounded-xl border border-[#1f2028] bg-[#14151b] px-3 py-2 text-xs"
              >
                <p className="font-semibold text-white">
                  {p.amountSol} SOL · {p.purpose}
                </p>
                <a
                  href={EXPLORER_TX(p.signature)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] text-[#86efac]"
                >
                  {shortAddr(p.signature, 8)}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
