/**
 * Shared bot-wallet helpers for Netlify functions.
 * BOT_WALLET_SECRET stays server-only.
 */
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import bs58 from 'bs58'

export const MAX_SOL = 2
export const MIN_SOL = 0.02
export const MARGIN_BPS = 500
export const WSOL = 'So11111111111111111111111111111111111111112'

export function rpcUrl() {
  if (process.env.SOLANA_RPC) return process.env.SOLANA_RPC
  const cluster =
    process.env.SOLANA_CLUSTER || process.env.VITE_SOLANA_CLUSTER || 'devnet'
  if (cluster === 'mainnet-beta') return 'https://api.mainnet-beta.solana.com'
  if (cluster === 'testnet') return 'https://api.testnet.solana.com'
  return 'https://api.devnet.solana.com'
}

export function getConnection() {
  return new Connection(rpcUrl(), 'confirmed')
}

export function loadPayer() {
  const secret = process.env.BOT_WALLET_SECRET
  if (!secret) return null
  try {
    if (secret.trim().startsWith('[')) {
      const arr = JSON.parse(secret)
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    }
    return Keypair.fromSecretKey(bs58.decode(secret.trim()))
  } catch {
    return null
  }
}

export function botPubkey() {
  return (
    process.env.VITE_BOT_WALLET_ADDRESS ||
    process.env.BOT_WALLET_ADDRESS ||
    '8EWrP1drSea8gvrKimkiK7Bgojq765ND5txYRPJ5HD8J'
  )
}

export function lamportsOf(sol) {
  return Math.round(Number(sol) * LAMPORTS_PER_SOL)
}

export function solOf(lamports) {
  return Number(lamports) / LAMPORTS_PER_SOL
}

export function applyMargin(sol, bps = MARGIN_BPS) {
  const fee = sol * (bps / 10_000)
  return { fee, net: Math.max(0, sol - fee) }
}

export function isSolanaMint(mint) {
  if (typeof mint !== 'string') return false
  if (mint.startsWith('0x')) return false
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint)
}
