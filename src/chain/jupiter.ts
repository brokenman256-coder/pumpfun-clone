/**
 * Jupiter Ultra / quote-swap integration for Solana swaps (Raydium, Orca, etc. under the hood).
 * Public endpoints — no API key required for basic quotes.
 * https://station.jup.ag/docs/apis/swap-api
 */
import {
  Connection,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { RPC_URL } from './config'

const JUP_QUOTE = 'https://quote-api.jup.ag/v6/quote'
const JUP_SWAP = 'https://quote-api.jup.ag/v6/swap'

export const WSOL = 'So11111111111111111111111111111111111111112'

export type QuoteResult = {
  inputMint: string
  outputMint: string
  inAmount: string
  outAmount: string
  otherAmountThreshold: string
  priceImpactPct: string
  routePlan: unknown[]
  raw: unknown
}

export async function getJupiterQuote(params: {
  inputMint: string
  outputMint: string
  amount: number // raw integer amount (lamports or token base units)
  slippageBps?: number
}): Promise<QuoteResult> {
  const q = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: String(Math.floor(params.amount)),
    slippageBps: String(params.slippageBps ?? 100),
  })
  const res = await fetch(`${JUP_QUOTE}?${q}`)
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Jupiter quote failed: ${res.status} ${t.slice(0, 120)}`)
  }
  const data = await res.json()
  if (!data?.outAmount) throw new Error('No route found on Jupiter (Raydium/Orca/…)')
  return {
    inputMint: data.inputMint,
    outputMint: data.outputMint,
    inAmount: data.inAmount,
    outAmount: data.outAmount,
    otherAmountThreshold: data.otherAmountThreshold,
    priceImpactPct: String(data.priceImpactPct ?? '0'),
    routePlan: data.routePlan || [],
    raw: data,
  }
}

export async function executeJupiterSwap(params: {
  wallet: WalletContextState
  quote: QuoteResult
}): Promise<string> {
  const { wallet, quote } = params
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Connect wallet to swap')
  }

  const res = await fetch(JUP_SWAP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote.raw,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
    }),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Jupiter swap build failed: ${res.status} ${t.slice(0, 160)}`)
  }
  const { swapTransaction } = await res.json()
  if (!swapTransaction) throw new Error('No swap transaction returned')

  const raw = Buffer.from(swapTransaction, 'base64')
  const tx = VersionedTransaction.deserialize(raw)
  const signed = await wallet.signTransaction(tx)

  const connection = new Connection(RPC_URL, 'confirmed')
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  })
  await connection.confirmTransaction(sig, 'confirmed')
  return sig
}

export function raydiumTradeUrl(mint: string) {
  return `https://raydium.io/swap/?inputMint=${WSOL}&outputMint=${mint}`
}

export function jupiterTradeUrl(mint: string) {
  return `https://jup.ag/swap/SOL-${mint}`
}
