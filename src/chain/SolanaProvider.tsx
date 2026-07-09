import { useMemo, type ReactNode } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { RPC_URL, CLUSTER } from './config'
import '@solana/wallet-adapter-react-ui/styles.css'

function networkFromCluster() {
  if (CLUSTER === 'mainnet-beta') return WalletAdapterNetwork.Mainnet
  if (CLUSTER === 'testnet') return WalletAdapterNetwork.Testnet
  return WalletAdapterNetwork.Devnet
}

/**
 * Real Solana wallet stack.
 * Phantom is registered explicitly so connect works even when Wallet Standard
 * is slow/blocked; Solflare is optional secondary.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const network = networkFromCluster()
  const endpoint = RPC_URL

  const wallets = useMemo(() => {
    // Construct once per network — do not recreate on every render
    return [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
    ]
  }, [network])

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        localStorageKey="pumpfun-phantom-wallet"
        onError={(err) => {
          // Surface adapter errors in console for debugging production issues
          console.error('[wallet]', err?.message || err)
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
