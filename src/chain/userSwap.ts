/**
 * User-signed Jupiter swaps. Tokens move in the connected Phantom wallet.
 */
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getMint,
} from '@solana/spl-token'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { getConnection } from './pay'
import { WSOL, executeJupiterSwap, getJupiterQuote } from './jupiter'

export async function mintDecimals(mint: string): Promise<number> {
  const connection = getConnection()
  const mintPk = new PublicKey(mint)
  const info = await connection.getAccountInfo(mintPk)
  const programId =
    info && info.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID
  const m = await getMint(connection, mintPk, 'confirmed', programId)
  return m.decimals
}

export async function userBuyToken(params: {
  wallet: WalletContextState
  mint: string
  amountSol: number
}): Promise<{ signature: string; tokensOut: number; decimals: number }> {
  const lamports = Math.floor(params.amountSol * LAMPORTS_PER_SOL)
  if (lamports < 1) throw new Error('Amount too small')
  const quote = await getJupiterQuote({
    inputMint: WSOL,
    outputMint: params.mint,
    amount: lamports,
    slippageBps: 150,
  })
  const decimals = await mintDecimals(params.mint)
  const signature = await executeJupiterSwap({ wallet: params.wallet, quote })
  const tokensOut = Number(quote.outAmount) / 10 ** decimals
  return { signature, tokensOut, decimals }
}

export async function userSellToken(params: {
  wallet: WalletContextState
  mint: string
  amountUi: number
  decimals?: number
}): Promise<{ signature: string; solOut: number }> {
  const decimals = params.decimals ?? (await mintDecimals(params.mint))
  const raw = Math.floor(params.amountUi * 10 ** decimals)
  if (raw < 1) throw new Error('Amount too small')
  const quote = await getJupiterQuote({
    inputMint: params.mint,
    outputMint: WSOL,
    amount: raw,
    slippageBps: 150,
  })
  const signature = await executeJupiterSwap({ wallet: params.wallet, quote })
  const solOut = Number(quote.outAmount) / LAMPORTS_PER_SOL
  return { signature, solOut }
}
