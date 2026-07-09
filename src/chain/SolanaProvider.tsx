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

export function SolanaProvider({ children }: { children: ReactNode }) {
  const network = networkFromCluster()
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network })],
    [network],
  )

  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: 'confirmed' }}>
      <WalletProvider
        wallets={wallets}
        autoConnect={false}
        localStorageKey="pumpfun-wallet-v2"
        onError={(e) => console.error('[wallet]', e?.message || e)}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
