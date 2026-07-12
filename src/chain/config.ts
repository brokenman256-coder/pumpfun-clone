import { PublicKey } from '@solana/web3.js'

export type Cluster = 'devnet' | 'mainnet-beta' | 'testnet' | 'localnet'

export const CLUSTER: Cluster =
  (import.meta.env.VITE_SOLANA_CLUSTER as Cluster) || 'devnet'

export const RPC_URL =
  import.meta.env.VITE_SOLANA_RPC ||
  (CLUSTER === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : CLUSTER === 'testnet'
      ? 'https://api.testnet.solana.com'
      : CLUSTER === 'localnet'
        ? 'http://127.0.0.1:8899'
        : 'https://api.devnet.solana.com')

/** Treasury — receives create fees + buy SOL */
export const FEE_RECIPIENT =
  import.meta.env.VITE_FEE_RECIPIENT ||
  'ApuMe4AJTv7B7rLord3pxjGAAhmeuwR9ttaQVkJShUuh'

export const CHANNEL_WALLET = FEE_RECIPIENT
export const CREATE_FEE_SOL_ONCHAIN = 0.02

/** Real on-chain bonding-curve launchpad program (program/programs/launchpad). */
export const LAUNCHPAD_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_LAUNCHPAD_PROGRAM_ID ||
    'AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8',
)

/** Wallet the scheduled GitHub Actions bot launcher signs with (see scripts/bot-launch.mjs). */
export const BOT_WALLET_ADDRESS: string | null =
  import.meta.env.VITE_BOT_WALLET_ADDRESS || null

export const EXPLORER_TX = (sig: string) =>
  CLUSTER === 'mainnet-beta'
    ? `https://solscan.io/tx/${sig}`
    : CLUSTER === 'localnet'
      ? `https://solscan.io/tx/${sig}?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`
      : `https://solscan.io/tx/${sig}?cluster=${CLUSTER}`

export const EXPLORER_ADDR = (addr: string) =>
  CLUSTER === 'mainnet-beta'
    ? `https://solscan.io/account/${addr}`
    : CLUSTER === 'localnet'
      ? `https://solscan.io/account/${addr}?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`
      : `https://solscan.io/account/${addr}?cluster=${CLUSTER}`

export const CHAIN_LABEL =
  CLUSTER === 'mainnet-beta'
    ? 'Solana Mainnet'
    : CLUSTER === 'testnet'
      ? 'Solana Testnet'
      : CLUSTER === 'localnet'
        ? 'Solana Localnet'
        : 'Solana Devnet'
