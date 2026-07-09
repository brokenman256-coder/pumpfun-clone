import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { useWallet } from '../hooks/useWallet'
import { useStore } from '../store/useStore'
import { createSplTokenOnChain } from '../chain/createSplToken'
import { CREATE_FEE_SOL } from '../engine/bondingCurve'
import { CHAIN_LABEL, CLUSTER, EXPLORER_TX } from '../chain/config'

type Mode = 'board' | 'spl'

export function CreatePage() {
  const navigate = useNavigate()
  const createToken = useStore((s) => s.createToken)
  const {
    connected,
    openModal,
    solBalance,
    paySol,
    refreshBalance,
    adapter,
    address,
  } = useWallet()

  const [mode, setMode] = useState<Mode>('spl')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [supply, setSupply] = useState('1000000000')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ mint: string; signature: string } | null>(null)

  async function submit() {
    setError('')
    setStatus('')
    setResult(null)
    if (!connected) {
      openModal()
      return
    }
    if (!name.trim() || !symbol.trim()) {
      setError('Name and ticker required')
      return
    }

    setLoading(true)
    try {
      if (mode === 'board') {
        if (solBalance < CREATE_FEE_SOL) {
          setError(`Need ${CREATE_FEE_SOL} SOL for create fee`)
          setLoading(false)
          return
        }
        setStatus(`Pay ${CREATE_FEE_SOL} SOL create fee…`)
        const signature = await paySol(CREATE_FEE_SOL, `create:${symbol}:${name}`)
        setStatus('Launching on board…')
        const id = createToken({
          name: name.trim(),
          symbol: symbol.trim(),
          description: description.trim(),
          signature,
        })
        if (!id) throw new Error('Launch failed')
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#86efac', '#fff'] })
        await refreshBalance()
        navigate(`/coin/${id}`)
        return
      }

      // Real SPL mint
      if (solBalance < 0.05) {
        setError(
          `Need ~0.05 SOL for rent. ${CLUSTER === 'devnet' ? 'Use faucet.solana.com on Devnet.' : ''}`,
        )
        setLoading(false)
        return
      }
      setStatus('Approve mint in Phantom…')
      const res = await createSplTokenOnChain({
        wallet: adapter,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase().slice(0, 8),
        supply: parseInt(supply.replace(/,/g, ''), 10) || 1_000_000_000,
        decimals: 9,
        revokeMint: true,
      })
      setResult({ mint: res.mint, signature: res.signature })
      createToken({
        name: name.trim(),
        symbol: res.symbol,
        description: `${description} · mint ${res.mint}`,
        signature: res.signature,
        mint: res.mint,
      })
      await refreshBalance()
      confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 }, colors: ['#86efac', '#facc15'] })
      setStatus('Your coin is live on Solana!')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed'
      setError(/reject|cancel|denied/i.test(msg) ? 'Cancelled in wallet' : msg)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-3 py-6">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-[#86efac]/15 px-3 py-1 text-[11px] font-bold text-[#86efac]">
          ⛓ {CHAIN_LABEL}
        </span>
      </div>
      <h1 className="text-center text-2xl font-black">Create coin</h1>
      <p className="mt-2 text-center text-sm text-[#8b8d97]">
        Mint a real SPL token or launch on the board with on-chain SOL fee.
      </p>

      <div className="mt-4 flex rounded-xl bg-[#14151b] p-1">
        <button
          type="button"
          onClick={() => setMode('spl')}
          className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === 'spl' ? 'bg-[#86efac] text-black' : 'text-[#8b8d97]'}`}
        >
          Real SPL mint
        </button>
        <button
          type="button"
          onClick={() => setMode('board')}
          className={`flex-1 rounded-lg py-2 text-sm font-bold ${mode === 'board' ? 'bg-[#86efac] text-black' : 'text-[#8b8d97]'}`}
        >
          Board launch
        </button>
      </div>

      <div className="mt-5 space-y-3 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <Field label="name" value={name} onChange={setName} placeholder="Pepe Coin" />
        <Field
          label="ticker"
          value={symbol}
          onChange={(v) => setSymbol(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="PEPE"
        />
        {mode === 'spl' && (
          <Field label="supply" value={supply} onChange={setSupply} placeholder="1000000000" />
        )}
        <div>
          <label className="mb-1 block text-xs text-[#8b8d97]">description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-lg border border-[#26272e] bg-[#0e0f13] px-3 py-2 text-sm outline-none focus:border-[#86efac]/40"
          />
        </div>

        <div className="rounded-lg border border-[#26272e] bg-[#0e0f13] p-3 text-xs text-[#8b8d97]">
          <p>
            Wallet:{' '}
            {connected ? (
              <span className="text-[#86efac]">{address?.slice(0, 8)}…</span>
            ) : (
              'not connected'
            )}
          </p>
          <p>
            Balance: <span className="text-white">{solBalance.toFixed(4)} SOL</span>
          </p>
          {CLUSTER === 'devnet' && (
            <a href="https://faucet.solana.com" target="_blank" rel="noreferrer" className="mt-1 inline-block text-[#86efac] underline">
              Get free devnet SOL →
            </a>
          )}
        </div>

        {status && <p className="text-center text-sm text-[#86efac]">{status}</p>}
        {error && <p className="text-center text-sm text-[#f87171]">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void submit()}
          className="btn-press w-full rounded-full bg-[#86efac] py-3.5 text-sm font-bold text-black disabled:opacity-50"
        >
          {loading
            ? status || 'Working…'
            : connected
              ? mode === 'spl'
                ? 'Create my coin on Solana 🪙'
                : `Pay ${CREATE_FEE_SOL} SOL & launch 🚀`
              : 'Sign in with Phantom'}
        </button>
      </div>

      {result && (
        <div className="fade-up mt-5 space-y-2 rounded-2xl border border-[#86efac]/40 bg-[#0c1f14] p-5">
          <p className="text-lg font-bold text-[#86efac]">✅ Live on Solana</p>
          <p className="break-all font-mono text-xs text-white">{result.mint}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={
                CLUSTER === 'mainnet-beta'
                  ? `https://solscan.io/token/${result.mint}`
                  : `https://solscan.io/token/${result.mint}?cluster=${CLUSTER}`
              }
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#86efac] px-4 py-2 text-sm font-bold text-black"
            >
              Solscan
            </a>
            <a
              href={EXPLORER_TX(result.signature)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#86efac]/40 px-4 py-2 text-sm text-[#86efac]"
            >
              Tx
            </a>
            <button
              type="button"
              className="rounded-full border border-[#26272e] px-4 py-2 text-sm"
              onClick={() => navigator.clipboard.writeText(result.mint)}
            >
              Copy mint
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#8b8d97]">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#26272e] bg-[#0e0f13] px-3 py-2.5 text-sm outline-none focus:border-[#86efac]/40"
      />
    </div>
  )
}
