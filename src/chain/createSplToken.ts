/**
 * Create a real SPL token on Solana using the connected Phantom wallet.
 * User signs all transactions — no server private key needed.
 */
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
} from '@solana/web3.js'
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
  /** human-readable total supply (e.g. 1_000_000_000) */
  supply?: number
  /** revoke mint authority after minting (fixed supply) */
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
    throw new Error('Connect Phantom wallet first')
  }

  const connection = getConnection()
  const payer = wallet.publicKey
  const mintKeypair = Keypair.generate()
  const mint = mintKeypair.publicKey

  const lamports = await getMinimumBalanceForRentExemptMint(connection)
  const ata = getAssociatedTokenAddressSync(mint, payer)

  // raw supply with decimals
  const rawSupply = BigInt(supply) * BigInt(10 ** decimals)
  // mintTo only accepts number | bigint up to safe range — use bigint

  const tx1 = new Transaction()

  // 1) Create mint account
  tx1.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
  )

  // 2) Initialize mint (payer = mint authority, no freeze)
  tx1.add(
    createInitializeMint2Instruction(
      mint,
      decimals,
      payer, // mint authority
      null, // freeze authority none
      TOKEN_PROGRAM_ID,
    ),
  )

  // 3) Create ATA for user
  tx1.add(
    createAssociatedTokenAccountInstruction(
      payer,
      ata,
      payer,
      mint,
    ),
  )

  // 4) Mint full supply to user
  tx1.add(
    createMintToInstruction(
      mint,
      ata,
      payer,
      rawSupply,
    ),
  )

  // 5) Optionally revoke mint authority (fixed supply)
  if (revokeMint) {
    tx1.add(
      createSetAuthorityInstruction(
        mint,
        payer,
        AuthorityType.MintTokens,
        null,
      ),
    )
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')

  tx1.feePayer = payer
  tx1.recentBlockhash = blockhash
  tx1.partialSign(mintKeypair)

  const signature = await wallet.sendTransaction(tx1, connection, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  })

  const conf = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  )
  if (conf.value.err) {
    throw new Error(`Token create failed: ${JSON.stringify(conf.value.err)}`)
  }

  // name/symbol stored off-chain until Metaplex metadata is added
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
