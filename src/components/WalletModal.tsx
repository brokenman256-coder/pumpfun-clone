import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'

const WALLETS = [
  { id: 'phantom', name: 'Phantom', emoji: '👻', color: '#ab9ff2' },
  { id: 'solflare', name: 'Solflare', emoji: '☀️', color: '#fc7227' },
  { id: 'backpack', name: 'Backpack', emoji: '🎒', color: '#e33e3f' },
]

export function WalletModal() {
  const open = useStore((s) => s.walletModalOpen)
  const { closeModal, connect } = useWallet()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={closeModal}
    >
      <div
        className="modal-panel w-full max-w-sm overflow-hidden rounded-2xl border border-[#26272e] bg-[#15161b]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[#26272e] px-5 py-4">
          <h2 className="text-lg font-bold">connect wallet</h2>
          <p className="text-xs text-[#8b8d97]">
            demo mode · connecting gives you 10 SOL simulated
          </p>
        </div>
        <div className="space-y-2 p-4">
          {WALLETS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => connect(w.id)}
              className="btn-press flex w-full items-center gap-3 rounded-xl border border-[#26272e] bg-[#0e0f13] px-4 py-3 text-left hover:border-[#86efac]/40"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                style={{ background: w.color + '33' }}
              >
                {w.emoji}
              </span>
              <span className="font-semibold">{w.name}</span>
            </button>
          ))}
        </div>
        <p className="px-5 pb-4 text-[10px] text-[#8b8d97]">
          {/* TODO: wire real @solana/wallet-adapter here */}
          real Phantom/Solflare adapters plug into useWallet without UI changes
        </p>
      </div>
    </div>
  )
}
