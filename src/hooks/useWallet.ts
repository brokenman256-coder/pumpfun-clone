/**
 * Wallet abstraction.
 * TODO: swap internals for @solana/wallet-adapter-react without changing UI consumers.
 */
import { useStore } from '../store/useStore'

export function useWallet() {
  const wallet = useStore((s) => s.wallet)
  const connectWallet = useStore((s) => s.connectWallet)
  const disconnectWallet = useStore((s) => s.disconnectWallet)
  const walletModalOpen = useStore((s) => s.walletModalOpen)
  const setWalletModalOpen = useStore((s) => s.setWalletModalOpen)

  return {
    connected: wallet.connected,
    address: wallet.address,
    solBalance: wallet.solBalance,
    holdings: wallet.holdings,
    costBasis: wallet.costBasis,
    connect: connectWallet,
    disconnect: disconnectWallet,
    openModal: () => setWalletModalOpen(true),
    closeModal: () => setWalletModalOpen(false),
    modalOpen: walletModalOpen,
  }
}
