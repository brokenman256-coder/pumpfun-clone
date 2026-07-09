import { useState } from 'react'
import confetti from 'canvas-confetti'
import { useWallet } from '../hooks/useWallet'
import { createSplTokenOnChain } from '../chain/createSplToken'
import { CHAIN_LABEL, CLUSTER, EXPLORER_TX } from '../chain/config'
import { useStore } from '../store/useStore'

/**
 * Create a REAL SPL cryptocurrency on Solana.
 * You sign with Phantom — tokens land in your wallet.
 */
export function CreateRealTokenPage() {
  const {
    connected,
    openModal,
    solBalance,
    address,
    refreshBalance,
    adapter,
  } = useWallet()
  const createToken = useStore((s) => s.createToken)

  const [name, setName] = useState('Pump Channel')
  const [symbol, setSymbol] = useState('PCHAN')
  const [supply, setSupply] = useState('1000000000')
  const [description, setDescription] = useState(
    'Official Solana token channel — fees & launches via ApuMe4A…ShUuh',
  )
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    mint: string
    signature: string
    supply: number
    tokenAccount: string
  } | null>(null)

  async function create() {
    setError('')
    setStatus('')
    setResult(null)

    if (!connected) {
      openModal()
      return
    }
    if (!name.trim() || !symbol.trim()) {
      setError('Name and symbol required')
      return
    }
    if (solBalance < 0.05) {
      setError(
        `Need ~0.05 SOL for rent + fees (you have ${solBalance.toFixed(4)}). ${
          CLUSTER === 'devnet'
            ? 'Switch Phantom to Devnet and get free SOL at faucet.solana.com'
            : 'Add SOL to your wallet'
        }`,
      )
      return
    }

    setLoading(true)
    try {
      setStatus('Approve token creation in Phantom…')
      const res = await createSplTokenOnChain({
        wallet: adapter,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase().slice(0, 8),
        supply: parseInt(supply.replace(/,/g, ''), 10) || 1_000_000_000,
        decimals: 9,
        revokeMint: true,
      })

      setStatus('Minted on Solana ✓')
      setResult({
        mint: res.mint,
        signature: res.signature,
        supply: res.supply,
        tokenAccount: res.tokenAccount,
      })

      // List on local board too
      try {
        createToken({
          name: name.trim(),
          symbol: symbol.trim().toUpperCase().slice(0, 8),
          description: `${description} · SPL mint: ${res.mint}`,
          imageUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=86efac`,
          signature: res.signature,
        })
      } catch {
        /* optional */
      }

      await refreshBalance()
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#86efac', '#facc15', '#fff'],
      })
      setStatus('Your cryptocurrency is live on Solana!')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Create failed'
      if (/reject|cancel|denied/i.test(msg)) setError('Cancelled in Phantom')
      else setError(msg)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const tokenExplorer = result
    ? CLUSTER === 'mainnet-beta'
      ? `https://solscan.io/token/${result.mint}`
      : `https://solscan.io/token/${result.mint}?cluster=${CLUSTER}`
    : ''

  return (
    <div className="mx-auto max-w-lg px-3 py-8 sm:px-4">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-[#86efac]/15 px-3 py-1 text-[11px] font-bold text-[#86efac]">
          ⛓ REAL SPL TOKEN · {CHAIN_LABEL}
        </span>
      </div>
      <h1 className="text-center text-2xl font-black text-white">
        Create your cryptocurrency
      </h1>
      <p className="mt-2 text-center text-sm text-[#8b8d97]">
        Mints a real Solana SPL token into your Phantom wallet. Fixed supply · mint authority burned.
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[#26272e] bg-[#15161b] p-5">
        <Field label="Coin name" value={name} onChange={setName} placeholder="Nexus Pump" />
        <Field
          label="Ticker (max 8)"
          value={symbol}
          onChange={(v) => setSymbol(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="NPMP"
        />
        <Field
          label="Total supply"
          value={supply}
          onChange={setSupply}
          placeholder="1000000000"
        />
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
          <p className="mt-1">
            Network must be <span className="font-semibold text-[#86efac]">{CLUSTER}</span> in
            Phantom
          </p>
          {CLUSTER === 'devnet' && (
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-[#86efac] underline"
            >
              Get free devnet SOL →
            </a>
          )}
        </div>

        {status && <p className="text-center text-sm text-[#86efac]">{status}</p>}
        {error && <p className="text-center text-sm text-[#f87171]">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={create}
          className="btn-press w-full rounded-full bg-[#86efac] py-3.5 text-sm font-bold text-black hover:bg-[#4ade80] disabled:opacity-50"
        >
          {loading
            ? status || 'Creating…'
            : connected
              ? 'Create my coin on Solana 🪙'
              : 'Connect Phantom first'}
        </button>
      </div>

      {result && (
        <div className="fade-up mt-6 space-y-3 rounded-2xl border border-[#86efac]/40 bg-[#0c1f14] p-5">
          <p className="text-lg font-bold text-[#86efac]">✅ Your coin is live!</p>
          <Row label="Mint address" value={result.mint} />
          <Row label="Your token account" value={result.tokenAccount} />
          <Row label="Supply" value={result.supply.toLocaleString()} />
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            <a
              href={tokenExplorer}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#86efac] px-4 py-2 font-bold text-black"
            >
              View on Solscan
            </a>
            <a
              href={EXPLORER_TX(result.signature)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#86efac]/40 px-4 py-2 text-[#86efac]"
            >
              View create tx
            </a>
            <button
              type="button"
              className="rounded-full border border-[#26272e] px-4 py-2 text-white"
              onClick={() => navigator.clipboard.writeText(result.mint)}
            >
              Copy mint
            </button>
          </div>
          <p className="text-[11px] text-[#8b8d97]">
            Open Phantom → Tokens. If missing: Manage token list → paste mint address.
          </p>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[#8b8d97]">{label}</p>
      <p className="break-all font-mono text-xs text-white">{value}</p>
    </div>
  )
}
