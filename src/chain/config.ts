/**
 * Solana chain config.
 * Set VITE_SOLANA_CLUSTER=mainnet-beta for mainnet.
 * VITE_FEE_RECIPIENT = treasury pubkey that receives create/buy SOL.
 */

export type Cluster = 'devnet' | 'mainnet-beta' | 'testnet'

export const CLUSTER: Cluster =
  (import.meta.env.VITE_SOLANA_CLUSTER as Cluster) || 'devnet'

export const RPC_URL =
  import.meta.env.VITE_SOLANA_RPC ||
  (CLUSTER === 'mainnet-beta'
    ? 'https://api.mainnet-beta.solana.com'
    : CLUSTER === 'testnet'
      ? 'https://api.testnet.solana.com'
      : 'https://api.devnet.solana.com')

/** Platform treasury — receives create fee + buy SOL (your channel wallet) */
export const FEE_RECIPIENT =
  import.meta.env.VITE_FEE_RECIPIENT ||
  'ApuMe4AJTv7B7rLord3pxjGAAhmeuwR9ttaQVkJShUuh'

/** Official channel wallet (same as fee recipient by default) */
export const CHANNEL_WALLET = FEE_RECIPIENT

export const CREATE_FEE_SOL_ONCHAIN = 0.02

export const EXPLORER_TX = (sig: string) =>
  CLUSTER === 'mainnet-beta'
    ? `https://solscan.io/tx/${sig}`
    : `https://solscan.io/tx/${sig}?cluster=${CLUSTER}`

export const EXPLORER_ADDR = (addr: string) =>
  CLUSTER === 'mainnet-beta'
    ? `https://solscan.io/account/${addr}`
    : `https://solscan.io/account/${addr}?cluster=${CLUSTER}`

export const CHAIN_LABEL =
  CLUSTER === 'mainnet-beta' ? 'Solana Mainnet' : CLUSTER === 'testnet' ? 'Solana Testnet' : 'Solana Devnet'
