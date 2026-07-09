/**
 * Mint a real SPL token into the connected Phantom wallet.
 */
import { Keypair, SystemProgram, Transaction, PublicKey } from '@solana/web3.js'
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddressSync,
  AuthorityType,
} from '@solana/spl-token'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { getConnection } from './pay'

export type CreateSplParams = {
  wallet: WalletContextState
  name: string
  symbol: string
  decimals?: number
  supply?: number
  revokeMint?: boolean
}

export type CreateSplResult = {
  mint: string
  tokenAccount: string
  signature: string
  supply: number
  decimals: number
  name: string
  symbol: string
}

export async function createSplTokenOnChain(
  params: CreateSplParams,
): Promise<CreateSplResult> {
  const {
    wallet,
    name,
    symbol,
    decimals = 9,
    supply = 1_000_000_000,
    revokeMint = true,
  } = params

  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Connect Phantom first')
  }

  const connection = getConnection()
  const payer = wallet.publicKey
  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey
  const lamports = await getMinimumBalanceForRentExemptMint(connection)
  const ata = getAssociatedTokenAddressSync(mint, payer)
  const rawSupply = BigInt(supply) * BigInt(10 ** decimals)

  const tx = new Transaction()
  tx.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
  )
  tx.add(createInitializeMint2Instruction(mint, decimals, payer, null, TOKEN_PROGRAM_ID))
  tx.add(createAssociatedTokenAccountInstruction(payer, ata, payer, mint))
  tx.add(createMintToInstruction(mint, ata, payer, rawSupply))
  if (revokeMint) {
    tx.add(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null))
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')
  tx.feePayer = payer
  tx.recentBlockhash = blockhash
  tx.partialSign(mintKeypair)

  const signature = await wallet.sendTransaction(tx, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  })

  const conf = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )
  if (conf.value.err) {
    throw new Error(`Mint failed: ${JSON.stringify(conf.value.err)}`)
  }

  void name
  void symbol

  return {
    mint: mint.toBase58(),
    tokenAccount: ata.toBase58(),
    signature,
    supply,
    decimals,
    name,
    symbol,
  }
}

export function isValidPubkey(s: string) {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(s)
    return true
  } catch {
    return false
  }
}
