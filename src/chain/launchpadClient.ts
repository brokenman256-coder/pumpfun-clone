/**
 * Thin client for the on-chain launchpad program (program/programs/launchpad).
 * Hand-encodes instructions using Anchor's discriminator scheme
 * (sha256("global:<ix_name>")[0:8]) instead of depending on a generated IDL.
 */
import { Buffer } from 'buffer'
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import type { WalletContextState } from '@solana/wallet-adapter-react'
import { LAUNCHPAD_PROGRAM_ID, FEE_RECIPIENT, RPC_URL } from './config'

function disc(name: string): Buffer {
  // Anchor instruction discriminators are sha256("global:<ix_name>")[0:8],
  // precomputed here (verified against `node -e "crypto.createHash..."`)
  // since we skip IDL generation and call the program directly.
  const table: Record<string, number[]> = {
    initialize: [175, 175, 109, 31, 13, 152, 155, 237],
    create_token: [84, 52, 204, 228, 24, 140, 234, 75],
    buy: [102, 6, 61, 18, 1, 218, 235, 234],
    sell: [51, 230, 133, 164, 1, 127, 131, 173],
  }
  const bytes = table[name]
  if (!bytes) throw new Error(`Unknown instruction ${name}`)
  return Buffer.from(bytes)
}

function u64le(n: bigint | number) {
  const b = Buffer.alloc(8)
  b.writeBigUInt64LE(BigInt(n))
  return b
}
function str(s: string) {
  const body = Buffer.from(s, 'utf8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(body.length)
  return Buffer.concat([len, body])
}

export function getConnection() {
  return new Connection(RPC_URL, 'confirmed')
}

export function globalPda() {
  return PublicKey.findProgramAddressSync([Buffer.from('global')], LAUNCHPAD_PROGRAM_ID)[0]
}

export function bondingCurvePda(mint: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    LAUNCHPAD_PROGRAM_ID,
  )[0]
}

async function sendIx(
  connection: Connection,
  wallet: WalletContextState,
  ixs: TransactionInstruction[],
  extraSigners: import('@solana/web3.js').Keypair[] = [],
) {
  if (!wallet.publicKey || !wallet.signTransaction) throw new Error('Wallet not connected')
  const tx = new Transaction()
  tx.add(...ixs)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = wallet.publicKey
  if (extraSigners.length) tx.partialSign(...extraSigners)
  const signed = await wallet.signTransaction(tx)
  const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  return sig
}

export type OnChainCurve = {
  mint: string
  creator: string
  decimals: number
  virtualSolReserves: bigint
  virtualTokenReserves: bigint
  realSolReserves: bigint
  realTokenReserves: bigint
  complete: boolean
  feeBps: number
  name: string
  symbol: string
  uri: string
}

function readString(buf: Buffer, offset: number): [string, number] {
  const len = buf.readUInt32LE(offset)
  const value = buf.subarray(offset + 4, offset + 4 + len).toString('utf8')
  return [value, offset + 4 + len]
}

/** Decode the BondingCurve account (skips the 8-byte Anchor discriminator). */
export function decodeBondingCurve(data: Buffer): OnChainCurve {
  let o = 8
  const mint = new PublicKey(data.subarray(o, o + 32)).toBase58()
  o += 32
  const creator = new PublicKey(data.subarray(o, o + 32)).toBase58()
  o += 32
  const decimals = data.readUInt8(o)
  o += 1
  const virtualSolReserves = data.readBigUInt64LE(o)
  o += 8
  const virtualTokenReserves = data.readBigUInt64LE(o)
  o += 8
  const realSolReserves = data.readBigUInt64LE(o)
  o += 8
  const realTokenReserves = data.readBigUInt64LE(o)
  o += 8
  const complete = data.readUInt8(o) === 1
  o += 1
  const feeBps = data.readUInt16LE(o)
  o += 2
  o += 1 // bump
  const [name, o2] = readString(data, o)
  const [symbol, o3] = readString(data, o2)
  const [uri] = readString(data, o3)
  return {
    mint,
    creator,
    decimals,
    virtualSolReserves,
    virtualTokenReserves,
    realSolReserves,
    realTokenReserves,
    complete,
    feeBps,
    name,
    symbol,
    uri,
  }
}

export async function fetchBondingCurve(
  connection: Connection,
  mint: PublicKey,
): Promise<OnChainCurve | null> {
  const info = await connection.getAccountInfo(bondingCurvePda(mint), 'confirmed')
  if (!info) return null
  return decodeBondingCurve(info.data)
}

export async function createTokenOnChain(params: {
  wallet: WalletContextState
  mintKeypair: import('@solana/web3.js').Keypair
  name: string
  symbol: string
  uri: string
}): Promise<{ mint: string; curve: string; signature: string }> {
  const { wallet, mintKeypair, name, symbol, uri } = params
  if (!wallet.publicKey) throw new Error('Connect wallet first')
  const connection = getConnection()
  const mint = mintKeypair.publicKey
  const curve = bondingCurvePda(mint)
  const vaultAta = getAssociatedTokenAddressSync(mint, curve, true)
  const creatorAta = getAssociatedTokenAddressSync(mint, wallet.publicKey)

  const data = Buffer.concat([disc('create_token'), str(name), str(symbol), str(uri)])
  const ix = new TransactionInstruction({
    programId: LAUNCHPAD_PROGRAM_ID,
    keys: [
      { pubkey: globalPda(), isSigner: false, isWritable: false },
      { pubkey: curve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: true, isWritable: true },
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: creatorAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(FEE_RECIPIENT), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data,
  })
  const signature = await sendIx(connection, wallet, [ix], [mintKeypair])
  return { mint: mint.toBase58(), curve: curve.toBase58(), signature }
}

export async function buyOnChain(params: {
  wallet: WalletContextState
  mint: PublicKey
  solLamports: bigint
  minTokensOut?: bigint
}): Promise<string> {
  const { wallet, mint, solLamports, minTokensOut = 0n } = params
  if (!wallet.publicKey) throw new Error('Connect wallet first')
  const connection = getConnection()
  const curve = bondingCurvePda(mint)
  const vaultAta = getAssociatedTokenAddressSync(mint, curve, true)
  const buyerAta = getAssociatedTokenAddressSync(mint, wallet.publicKey)

  const data = Buffer.concat([disc('buy'), u64le(solLamports), u64le(minTokensOut)])
  const ix = new TransactionInstruction({
    programId: LAUNCHPAD_PROGRAM_ID,
    keys: [
      { pubkey: globalPda(), isSigner: false, isWritable: false },
      { pubkey: curve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(FEE_RECIPIENT), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  return sendIx(connection, wallet, [ix])
}

export async function sellOnChain(params: {
  wallet: WalletContextState
  mint: PublicKey
  tokenAmountRaw: bigint
  minSolOut?: bigint
}): Promise<string> {
  const { wallet, mint, tokenAmountRaw, minSolOut = 0n } = params
  if (!wallet.publicKey) throw new Error('Connect wallet first')
  const connection = getConnection()
  const curve = bondingCurvePda(mint)
  const vaultAta = getAssociatedTokenAddressSync(mint, curve, true)
  const sellerAta = getAssociatedTokenAddressSync(mint, wallet.publicKey)

  const data = Buffer.concat([disc('sell'), u64le(tokenAmountRaw), u64le(minSolOut)])
  const ix = new TransactionInstruction({
    programId: LAUNCHPAD_PROGRAM_ID,
    keys: [
      { pubkey: globalPda(), isSigner: false, isWritable: false },
      { pubkey: curve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: vaultAta, isSigner: false, isWritable: true },
      { pubkey: sellerAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey(FEE_RECIPIENT), isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  return sendIx(connection, wallet, [ix])
}
