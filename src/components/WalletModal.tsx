import { useMemo } from 'react'
import { useWallet } from '../hooks/useWallet'
import { PERSONAL_MODE } from '../chain/config'
import type { WalletName } from '@solana/wallet-adapter-base'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { MEMECOIN_WALLETS, openWalletJoin } from '../lib/wallets'

/**
 * Connect modal — Phantom + other Solana wallets used for meme trading,
 * with clear "Get wallet" join links.
 */
export function WalletModal() {
  const {
    modalOpen,
    closeModal,
    connectPhantom,
    connectPersonal,
    selectAndConnect,
    connecting,
    error,
    clearError,
    wallets,
    isRealTrader,
    address,
  } = useWallet()

  const adapterByName = useMemo(() => {
    const map = new Map<string, (typeof wallets)[0]>()
    for (const w of wallets) map.set(w.adapter.name, w)
    return map
  }, [wallets])

  if (!modalOpen) return null

  function statusFor(adapterName?: string): {
    ready: boolean
    label: string
  } {
    if (!adapterName) return { ready: false, label: 'Get wallet' }
    const w = adapterByName.get(adapterName)
    if (!w) return { ready: false, label: 'Get wallet' }
    const r = w.readyState
    if (r === WalletReadyState.Installed || r === WalletReadyState.Loadable) {
      return { ready: true, label: connecting ? 'Connecting…' : 'Connect' }
    }
    if (r === WalletReadyState.NotDetected) {
      return { ready: false, label: 'Install' }
    }
    return { ready: false, label: 'Get wallet' }
  }

  function onConnect(adapterName?: string, joinUrl?: string) {
    if (!adapterName) {
      if (joinUrl) openWalletJoin(joinUrl)
      return
    }
    const st = statusFor(adapterName)
    if (!st.ready) {
      if (joinUrl) openWalletJoin(joinUrl)
      return
    }
    if (adapterName === 'Phantom') {
      void connectPhantom()
      return
    }
    selectAndConnect(adapterName as WalletName)
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => {
        clearError()
        closeModal()
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-[#1a1d24] bg-[#0b0e11] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1a1d24] px-5 py-4">
          <div>
            <h2 className="text-sm font-black text-white">Connect wallet</h2>
            <p className="mt-0.5 text-[11px] text-[#5d6573]">
              Solana wallets for meme coin trading
            </p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg p-1 text-[#5d6573] transition hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[min(70vh,520px)] space-y-2 overflow-y-auto p-4">
          {isRealTrader && address && (
            <div className="mb-2 rounded-xl border border-[#00c805]/30 bg-[#00c805]/10 px-3 py-2.5 text-xs text-[#00c805]">
              Connected · {address.slice(0, 4)}…{address.slice(-4)}
            </div>
          )}

          <p className="px-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5d6573]">
            Popular for memecoins
          </p>

          {MEMECOIN_WALLETS.filter((w) => w.popular).map((w) => {
            const st = statusFor(w.adapterName)
            return (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-xl border border-[#1a1d24] bg-[#12151a] p-3 transition hover:border-[#00c805]/35"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1e2329] text-xl">
                  {w.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{w.label}</p>
                  <p className="text-[11px] text-[#5d6573]">{w.blurb}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => onConnect(w.adapterName, w.joinUrl)}
                    className="btn-press rounded-lg bg-[#00c805] px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
                  >
                    {st.ready ? st.label : 'Get'}
                  </button>
                  <a
                    href={w.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#1a1d24] px-3 py-1.5 text-center text-[11px] font-semibold text-[#848e9c] transition hover:border-[#00c805]/40 hover:text-[#00c805]"
                  >
                    Join →
                  </a>
                </div>
              </div>
            )
          })}

          <p className="mt-3 px-0.5 text-[10px] font-bold uppercase tracking-wide text-[#5d6573]">
            More wallets
          </p>

          {MEMECOIN_WALLETS.filter((w) => !w.popular).map((w) => {
            const st = statusFor(w.adapterName)
            return (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-xl border border-[#1a1d24] bg-[#0e1116] px-3 py-2.5"
              >
                <span className="text-lg">{w.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{w.label}</p>
                  <p className="text-[10px] text-[#5d6573]">{w.blurb}</p>
                </div>
                {st.ready ? (
                  <button
                    type="button"
                    disabled={connecting}
                    onClick={() => onConnect(w.adapterName, w.joinUrl)}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white"
                  >
                    Connect
                  </button>
                ) : (
                  <a
                    href={w.joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#1a1d24] px-3 py-1.5 text-[11px] font-semibold text-[#00c805]"
                  >
                    Join →
                  </a>
                )}
              </div>
            )
          })}

          {/* Any extra adapters not in catalog */}
          {wallets
            .filter(
              (w) =>
                !MEMECOIN_WALLETS.some((c) => c.adapterName === w.adapter.name),
            )
            .map((w) => (
              <button
                key={w.adapter.name}
                type="button"
                disabled={connecting}
                onClick={() => selectAndConnect(w.adapter.name as WalletName)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#1a1d24] bg-[#12151a] px-3 py-3 text-left"
              >
                {w.adapter.icon ? (
                  <img src={w.adapter.icon} alt="" className="h-9 w-9 rounded-full" />
                ) : (
                  <span className="h-9 w-9 rounded-full bg-[#1e2329]" />
                )}
                <span className="text-sm font-semibold">{w.adapter.name}</span>
                <span className="ml-auto text-[11px] text-[#00c805]">Connect</span>
              </button>
            ))}

          {PERSONAL_MODE && (
            <>
              <div className="pt-2 text-center text-[10px] uppercase tracking-wide text-[#3d4450]">
                or
              </div>
              <button
                type="button"
                onClick={() => {
                  connectPersonal?.()
                  closeModal()
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[#1a1d24] px-3 py-3 text-left transition hover:border-[#00c805]/25"
              >
                <span className="text-lg">👁</span>
                <span>
                  <span className="block text-sm font-semibold text-white">Browse without wallet</span>
                  <span className="block text-[11px] text-[#5d6573]">
                    View markets · connect anytime to trade
                  </span>
                </span>
              </button>
            </>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <p className="pt-1 text-center text-[10px] leading-relaxed text-[#3d4450]">
            New to Solana? Start with{' '}
            <a
              href="https://phantom.app/download"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#00c805] underline"
            >
              Phantom
            </a>{' '}
            or{' '}
            <a
              href="https://solflare.com/download"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#00c805] underline"
            >
              Solflare
            </a>
            . We never ask for your seed phrase.
          </p>
        </div>
      </div>
    </div>
  )
}
