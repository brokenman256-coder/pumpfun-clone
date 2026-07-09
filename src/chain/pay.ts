import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { Buffer } from 'buffer'
import { RPC_URL, FEE_RECIPIENT, CLUSTER } from './config'

const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

export function getConnection() {
  return new Connection(RPC_URL, 'confirmed')
}

export async function fetchSolBalance(address: string): Promise<number> {
  try {
    const conn = getConnection()
    const lamports = await conn.getBalance(new PublicKey(address), 'confirmed')
    return lamports / LAMPORTS_PER_SOL
  } catch {
    return 0
  }
}

/** Send SOL from connected wallet → treasury. Returns tx signature. */
export async function paySolOnChain(params: {
  wallet: WalletContextState
  amountSol: number
  memo: string
  to?: string
}): Promise<string> {
  const { wallet, amountSol, memo } = params
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected')
  }
  if (amountSol <= 0) throw new Error('Invalid amount')

  const recipient = new PublicKey(params.to || FEE_RECIPIENT)
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  if (lamports < 1) throw new Error('Amount too small')

  const connection = getConnection()
  const balance = await connection.getBalance(wallet.publicKey)
  if (balance < lamports + 5000) {
    const have = balance / LAMPORTS_PER_SOL
    const tip =
      CLUSTER === 'mainnet-beta'
        ? ''
        : ' Get free SOL: https://faucet.solana.com'
    throw new Error(
      `Insufficient SOL. Need ~${amountSol.toFixed(4)} + fees (have ${have.toFixed(4)}).${tip}`,
    )
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed')

  const tx = new Transaction({
    feePayer: wallet.publicKey,
    blockhash,
    lastValidBlockHeight,
  })

  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: recipient,
      lamports,
    }),
  )

  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: true }],
      programId: MEMO_PROGRAM,
      data: Buffer.from(memo.slice(0, 200), 'utf8'),
    }),
  )

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
    throw new Error(`Tx failed: ${JSON.stringify(conf.value.err)}`)
  }
  return signature
}
