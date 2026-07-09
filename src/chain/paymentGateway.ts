/**
 * Official multi-wallet payment gateway layer.
 * Routes SOL payments through connected adapter (Phantom, Solflare, …).
 */
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { paySolOnChain } from './pay'
import { FEE_RECIPIENT, CREATE_FEE_SOL_ONCHAIN, CLUSTER } from './config'

export type PaymentPurpose = 'create_fee' | 'buy' | 'premium' | 'custom'

export type PaymentRequest = {
  amountSol: number
  purpose: PaymentPurpose
  memo?: string
  to?: string
}

export type PaymentResult = {
  signature: string
  amountSol: number
  purpose: PaymentPurpose
  recipient: string
  cluster: string
  ts: number
}

export const GATEWAY_PRESETS: {
  id: PaymentPurpose
  label: string
  amountSol: number
  desc: string
}[] = [
  {
    id: 'create_fee',
    label: 'Create coin fee',
    amountSol: CREATE_FEE_SOL_ONCHAIN,
    desc: 'Platform launch fee',
  },
  {
    id: 'premium',
    label: 'Premium boost',
    amountSol: 0.1,
    desc: 'Feature your coin for 24h',
  },
  {
    id: 'custom',
    label: 'Custom amount',
    amountSol: 0.05,
    desc: 'Send any SOL to treasury',
  },
]

export async function processPayment(
  wallet: WalletContextState,
  req: PaymentRequest,
): Promise<PaymentResult> {
  if (!wallet.publicKey) throw new Error('Connect a wallet first')
  if (req.amountSol <= 0) throw new Error('Invalid amount')

  const memo = req.memo || `gateway:${req.purpose}:${Date.now()}`
  const signature = await paySolOnChain({
    wallet,
    amountSol: req.amountSol,
    memo,
    to: req.to || FEE_RECIPIENT,
  })

  return {
    signature,
    amountSol: req.amountSol,
    purpose: req.purpose,
    recipient: req.to || FEE_RECIPIENT,
    cluster: CLUSTER,
    ts: Date.now(),
  }
}

export function supportedWallets() {
  return [
    { id: 'Phantom', desc: 'Most popular Solana wallet', icon: '👻' },
    { id: 'Solflare', desc: 'Full-featured Solana wallet', icon: '🔥' },
    { id: 'Wallet Standard', desc: 'Any Wallet Standard wallet', icon: '🔗' },
  ]
}
