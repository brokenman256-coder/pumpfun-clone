import { PublicKey } from '@solana/web3.js'

export type Cluster = 'devnet' | 'mainnet-beta' | 'testnet' | 'localnet'

/**
 * Self-managed market engine (default ON):
 * - System owns price, supply, charts
 * - Coin bots + trader bots = free, zero gas
 * - Real humans can still connect Phantom and trade with real SOL
 *
 * Set VITE_PERSONAL_MODE=false only if you want a pure on-chain product.
 */
export const PERSONAL_MODE =
  import.meta.env.VITE_PERSONAL_MODE !== 'false' &&
  import.meta.env.VITE_PERSONAL_MODE !== '0'

/** Real Solana cluster for Phantom trades (never "personal") */
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

/**
 * Bot / payout wallet — receives ALL buy SOL from traders so the same
 * balance can pay withdrawals on sell. (One hot wallet for in+out.)
 */
export const BOT_WALLET_ADDRESS =
  import.meta.env.VITE_BOT_WALLET_ADDRESS ||
  '8EWrP1drSea8gvrKimkiK7Bgojq765ND5txYRPJ5HD8J'

/**
 * FEE_RECIPIENT = where Phantom buys send SOL.
 * Defaults to bot wallet so deposits fund the payout pool directly.
 * Override with VITE_FEE_RECIPIENT only if you want a separate treasury.
 */
export const FEE_RECIPIENT =
  import.meta.env.VITE_FEE_RECIPIENT || BOT_WALLET_ADDRESS

export const CHANNEL_WALLET = FEE_RECIPIENT
export const CREATE_FEE_SOL_ONCHAIN = 0.02

/** Real on-chain bonding-curve launchpad program (optional). */
export const LAUNCHPAD_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_LAUNCHPAD_PROGRAM_ID ||
    'AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8',
)

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

export const CHAIN_LABEL = PERSONAL_MODE
  ? CLUSTER === 'mainnet-beta'
    ? 'Managed market · Phantom Mainnet'
    : CLUSTER === 'testnet'
      ? 'Managed market · Phantom Testnet'
      : CLUSTER === 'localnet'
        ? 'Managed market · Localnet'
        : 'Managed market · Phantom Devnet'
  : CLUSTER === 'mainnet-beta'
    ? 'Solana Mainnet'
    : CLUSTER === 'testnet'
      ? 'Solana Testnet'
      : CLUSTER === 'localnet'
        ? 'Solana Localnet'
        : 'Solana Devnet'

/** Virtual SOL for demo browsing (bots always free; traders use Phantom for real $) */
export const PERSONAL_START_SOL = Number(import.meta.env.VITE_PERSONAL_START_SOL || 100)
