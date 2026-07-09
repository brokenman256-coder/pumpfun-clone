import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { CREATE_FEE_SOL } from '../engine/bondingCurve'
import { CHAIN_LABEL, CLUSTER } from '../chain/config'

export function CreateCoinForm() {
  const navigate = useNavigate()
  const createToken = useStore((s) => s.createToken)
  const { connected, openModal, solBalance, paySol, refreshBalance } = useWallet()
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [preview, setPreview] = useState('')
  const [twitter, setTwitter] = useState('')
  const [telegram, setTelegram] = useState('')
  const [website, setWebsite] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [launching, setLaunching] = useState(false)

  function onFile(file?: File) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setPreview(url)
      setImageUrl(url)
    }
    reader.readAsDataURL(file)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStatus('')
    if (!connected) {
      openModal()
      return
    }
    if (!name.trim() || !symbol.trim()) {
      setError('name and ticker required')
      return
    }
    if (solBalance < CREATE_FEE_SOL) {
      setError(
        `need ${CREATE_FEE_SOL} SOL on-chain (have ${solBalance.toFixed(3)}). ${CLUSTER === 'devnet' ? 'Fund wallet via faucet.solana.com' : ''}`,
      )
      return
    }

    setLaunching(true)
    try {
      // 1) Real SOL payment on Solana
      setStatus(`Pay ${CREATE_FEE_SOL} SOL create fee in wallet…`)
      const signature = await paySol(
        CREATE_FEE_SOL,
        `create:${symbol.toUpperCase()}:${name.trim()}`,
      )
      setStatus('Fee confirmed · launching…')

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.85 },
        colors: ['#86efac', '#4ade80', '#ffffff'],
      })

      await new Promise((r) => setTimeout(r, 900))

      const id = createToken({
        name: name.trim(),
        symbol: symbol.trim(),
        description: description.trim(),
        imageUrl: imageUrl || undefined,
        twitter: twitter || undefined,
        telegram: telegram || undefined,
        website: website || undefined,
        signature,
      })

      if (!id) {
        setLaunching(false)
        setError('launch failed after payment')
        return
      }

      await refreshBalance()
      confetti({ particleCount: 160, spread: 100, origin: { y: 0.45 } })
      navigate(`/coin/${id}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Launch failed'
      if (/reject|cancel|denied/i.test(msg)) setError('Payment cancelled in wallet')
      else setError(msg)
      setLaunching(false)
      setStatus('')
    }
  }

  return (
    <div className="relative">
      {launching && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/65">
          <div className="text-center">
            <div className="rocket-anim text-7xl">🚀</div>
            <p className="mt-4 font-bold text-[#86efac]">{status || 'launching…'}</p>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-xl border border-[#86efac]/25 bg-[#86efac]/5 px-4 py-3 text-center text-xs text-[#aaa]">
        Full chain · <span className="font-semibold text-[#86efac]">{CHAIN_LABEL}</span>
        <br />
        Create fee is a real SOL transfer. Phantom must be on{' '}
        <span className="text-[#86efac]">{CLUSTER}</span>.
        {CLUSTER === 'devnet' && (
          <>
            {' '}
            <a
              href="https://faucet.solana.com"
              className="text-[#86efac] underline"
              target="_blank"
              rel="noreferrer"
            >
              Get free devnet SOL
            </a>
          </>
        )}
      </div>

      <form
        onSubmit={submit}
        className="fade-up space-y-4 rounded-2xl border border-[#26272e] bg-[#15161b] p-5"
      >
        <div className="flex flex-col items-center">
          <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#26272e] bg-[#0e0f13] transition hover:border-[#86efac]/40">
            {preview ? (
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <>
                <span className="text-2xl">📷</span>
                <span className="mt-1 text-[10px] text-[#8b8d97]">upload image</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <input
            value={imageUrl.startsWith('data:') ? '' : imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value)
              setPreview(e.target.value)
            }}
            placeholder="or paste image URL"
            className="mt-3 w-full rounded-lg border border-[#26272e] bg-[#0e0f13] px-3 py-2 text-sm outline-none focus:border-[#86efac]/40"
          />
        </div>

        <Field label="name" value={name} onChange={setName} placeholder="Pepe Coin" />
        <Field
          label="ticker"
          value={symbol}
          onChange={(v) => setSymbol(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
          placeholder="PEPE"
        />
        <div>
          <label className="mb-1 block text-xs text-[#8b8d97]">description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-lg border border-[#26272e] bg-[#0e0f13] px-3 py-2 text-sm outline-none focus:border-[#86efac]/40"
            placeholder="tell the world about your coin…"
          />
        </div>
        <Field label="X / twitter (optional)" value={twitter} onChange={setTwitter} placeholder="https://x.com/…" />
        <Field label="telegram (optional)" value={telegram} onChange={setTelegram} placeholder="https://t.me/…" />
        <Field label="website (optional)" value={website} onChange={setWebsite} placeholder="https://…" />

        <p className="text-center text-sm text-[#8b8d97]">
          cost to deploy:{' '}
          <span className="font-bold text-[#86efac]">~{CREATE_FEE_SOL} SOL</span>
          <span className="text-[#555]"> (on-chain)</span>
        </p>
        {status && !launching && <p className="text-center text-sm text-[#86efac]">{status}</p>}
        {error && <p className="text-center text-sm text-[#f87171]">{error}</p>}

        <button
          type="submit"
          disabled={launching}
          className="btn-press w-full rounded-full bg-[#86efac] py-3 text-sm font-bold text-black hover:bg-[#4ade80] disabled:opacity-60"
        >
          {launching
            ? status || 'launching…'
            : connected
              ? `pay ${CREATE_FEE_SOL} SOL & create 🚀`
              : 'connect wallet to create'}
        </button>
      </form>
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
