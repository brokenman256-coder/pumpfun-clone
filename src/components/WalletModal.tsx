import { useWallet } from '../hooks/useWallet'
import { PERSONAL_MODE } from '../chain/config'
import type { WalletName } from '@solana/wallet-adapter-base'

export function WalletModal() {
  const {
    modalOpen,
    closeModal,
    connectPhantom,
    connectPersonal,
    selectAndConnect,
    connecting,
    phantomInstalled,
    error,
    clearError,
    installPhantom,
    wallets,
    isRealTrader,
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
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#26272e] bg-[#15161b] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#26272e] px-5 py-4">
          <h2 className="text-sm font-bold text-white">Connect wallet</h2>
          <button type="button" onClick={closeModal} className="text-[#8b8d97] transition hover:text-white">
            ✕
          </button>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-[11px] leading-relaxed text-[#8b8d97]">
            Connect your wallet to buy and sell on the live board.
          </p>
          <button
            type="button"
            disabled={connecting || isRealTrader}
            onClick={() => void connectPhantom()}
            className="btn-press flex w-full items-center gap-3 rounded-xl border border-[#86efac]/40 bg-[#86efac]/10 px-4 py-3 text-left transition hover:bg-[#86efac]/20 disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ab9ff2] text-lg">
              👻
            </span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-white">
                {isRealTrader ? 'Connected' : 'Phantom'}
              </span>
              <span className="block text-[11px] text-[#8b8d97]">
                {isRealTrader
                  ? 'Ready to trade'
                  : phantomInstalled
                    ? connecting
                      ? 'Approve in wallet…'
                      : 'Fastest way to trade'
                    : 'Install to continue'}
              </span>
            </span>
          </button>
          {!phantomInstalled && (
            <button
              type="button"
              onClick={installPhantom}
              className="w-full rounded-xl border border-[#26272e] py-2.5 text-sm font-semibold text-[#86efac]"
            >
              Install Phantom →
            </button>
          )}

          {others.map((w) => (
            <button
              key={w.adapter.name}
              type="button"
              disabled={connecting}
              onClick={() => selectAndConnect(w.adapter.name as WalletName)}
              className="flex w-full items-center gap-3 rounded-xl border border-[#26272e] bg-[#0e0f13] px-4 py-3 text-left"
            >
              {w.adapter.icon ? (
                <img src={w.adapter.icon} alt="" className="h-10 w-10 rounded-full" />
              ) : (
                <span className="h-10 w-10 rounded-full bg-[#26272e]" />
              )}
              <span className="text-sm font-semibold">{w.adapter.name}</span>
            </button>
          ))}

          {PERSONAL_MODE && (
            <>
              <div className="relative py-1 text-center text-[10px] uppercase tracking-wide text-[#555]">
                or continue browsing
              </div>
              <button
                type="button"
                onClick={() => {
                  connectPersonal?.()
                  closeModal()
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-[#26272e] bg-[#0e0f13] px-4 py-3 text-left transition hover:border-[#86efac]/25"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#86efac]/15 text-lg">
                  👁
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-white">Browse markets</span>
                  <span className="block text-[11px] text-[#8b8d97]">
                    Explore charts · connect anytime to trade
                  </span>
                </span>
              </button>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
