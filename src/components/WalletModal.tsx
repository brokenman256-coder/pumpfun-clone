/**
 * Connect wallet modal — Phantom first (real extension popup).
 */
import { useWallet } from '../hooks/useWallet'
import { CLUSTER, CHAIN_LABEL } from '../chain/config'
import type { WalletName } from '@solana/wallet-adapter-base'

export function WalletModal() {
  const {
    modalOpen,
    closeModal,
    connectPhantom,
    selectAndConnect,
    connecting,
    phantomInstalled,
    error,
    clearError,
    installPhantom,
    wallets,
  } = useWallet()

  if (!modalOpen) return null

  const others = wallets.filter((w) => w.adapter.name !== 'Phantom')

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => {
        clearError()
        closeModal()
      }}
    >
      <div
        className="modal-panel w-full max-w-sm overflow-hidden rounded-2xl border border-[#26272e] bg-[#15161b] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#26272e] px-5 py-4">
          <h2 className="text-sm font-bold text-white">Connect wallet</h2>
          <button
            type="button"
            onClick={() => {
              clearError()
              closeModal()
            }}
            className="text-[#8b8d97] hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-xs text-[#8b8d97]">
            Network: <span className="font-semibold text-[#86efac]">{CHAIN_LABEL}</span>
            <span className="text-[#8b8d97]"> ({CLUSTER})</span>
          </p>
          <p className="text-[11px] leading-relaxed text-[#8b8d97]">
            Phantom will pop up and ask you to approve. We never see your seed phrase —
            only the public address after you connect.
          </p>

          {/* Phantom primary */}
          <button
            type="button"
            disabled={connecting}
            onClick={() => void connectPhantom()}
            className="btn-press flex w-full items-center gap-3 rounded-xl border border-[#86efac]/40 bg-[#86efac]/10 px-4 py-3 text-left transition hover:bg-[#86efac]/20 disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ab9ff2] text-lg font-bold text-white">
              👻
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-white">Phantom</span>
              <span className="block text-[11px] text-[#8b8d97]">
                {phantomInstalled
                  ? connecting
                    ? 'Approve in Phantom…'
                    : 'Detected — click to connect'
                  : 'Not installed — install then connect'}
              </span>
            </span>
            {!phantomInstalled && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white">
                install
              </span>
            )}
          </button>

          {!phantomInstalled && (
            <button
              type="button"
              onClick={installPhantom}
              className="btn-press w-full rounded-xl border border-[#26272e] bg-[#0e0f13] px-4 py-2.5 text-sm font-semibold text-[#86efac] hover:border-[#86efac]/40"
            >
              Install Phantom extension →
            </button>
          )}

          {/* Other wallets from adapter */}
          {others.map((w) => (
            <button
              key={w.adapter.name}
              type="button"
              disabled={connecting}
              onClick={() => selectAndConnect(w.adapter.name as WalletName)}
              className="btn-press flex w-full items-center gap-3 rounded-xl border border-[#26272e] bg-[#0e0f13] px-4 py-3 text-left hover:border-[#86efac]/30 disabled:opacity-60"
            >
              {w.adapter.icon ? (
                <img src={w.adapter.icon} alt="" className="h-10 w-10 rounded-full" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#26272e] text-sm">
                  W
                </span>
              )}
              <span className="text-sm font-semibold text-white">{w.adapter.name}</span>
            </button>
          ))}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <p className="text-center text-[10px] text-[#5c5e6b]">
            Desktop: Chrome/Brave + Phantom extension. Mobile: open this site inside the Phantom
            app browser.
          </p>
        </div>
      </div>
    </div>
  )
}
