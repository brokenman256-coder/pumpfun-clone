import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAccount,
} from '@solana/spl-token'

const PROGRAM_ID = new PublicKey('AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8')
const connection = new Connection('http://127.0.0.1:8899', 'confirmed')

function disc(name) {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

function u16le(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}
function u64le(n) {
  const b = Buffer.alloc(8)
  b.writeBigUInt64LE(BigInt(n))
  return b
}
function str(s) {
  const body = Buffer.from(s, 'utf8')
  const len = Buffer.alloc(4)
  len.writeUInt32LE(body.length)
  return Buffer.concat([len, body])
}

function loadKeypair(p) {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

async function send(ixs, signers, payer) {
  const tx = new Transaction()
  tx.add(...ixs)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = payer.publicKey
  tx.sign(payer, ...signers)
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false })
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  return sig
}

async function main() {
  const authority = loadKeypair(path.join(os.homedir(), '.config/solana/id.json'))
  console.log('authority', authority.publicKey.toBase58())

  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)
  const feeRecipient = Keypair.generate().publicKey

  // ---- initialize ----
  {
    const data = Buffer.concat([disc('initialize'), u16le(100), feeRecipient.toBuffer()])
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPda, isSigner: false, isWritable: true },
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })
    const sig = await send([ix], [], authority)
    console.log('initialize ok', sig)
  }

  // ---- create_token ----
  const mint = Keypair.generate()
  const creator = Keypair.generate()
  {
    const airdropSig = await connection.requestAirdrop(creator.publicKey, 5 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(airdropSig, 'confirmed')
  }
  const [curvePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.publicKey.toBuffer()],
    PROGRAM_ID,
  )
  const vaultAta = getAssociatedTokenAddressSync(mint.publicKey, curvePda, true)
  const creatorAta = getAssociatedTokenAddressSync(mint.publicKey, creator.publicKey)

  {
    const data = Buffer.concat([
      disc('create_token'),
      str('Test Coin'),
      str('TEST'),
      str('https://example.com/meta.json'),
    ])
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPda, isSigner: false, isWritable: false },
        { pubkey: curvePda, isSigner: false, isWritable: true },
        { pubkey: mint.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultAta, isSigner: false, isWritable: true },
        { pubkey: creatorAta, isSigner: false, isWritable: true },
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: feeRecipient, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data,
    })
    const sig = await send([ix], [mint, creator], creator)
    console.log('create_token ok', sig)
  }

  const vaultBefore = await getAccount(connection, vaultAta)
  const creatorTokBefore = await getAccount(connection, creatorAta)
  console.log('vault tokens after create', vaultBefore.amount.toString())
  console.log('creator tokens after create', creatorTokBefore.amount.toString())

  // ---- buy ----
  const buyer = Keypair.generate()
  {
    const sig = await connection.requestAirdrop(buyer.publicKey, 5 * LAMPORTS_PER_SOL)
    await connection.confirmTransaction(sig, 'confirmed')
  }
  const buyerAta = getAssociatedTokenAddressSync(mint.publicKey, buyer.publicKey)
  const feeBalBeforeBuy = await connection.getBalance(feeRecipient)
  const buyerSolBefore = await connection.getBalance(buyer.publicKey)

  {
    const data = Buffer.concat([disc('buy'), u64le(0.5 * LAMPORTS_PER_SOL), u64le(0)])
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPda, isSigner: false, isWritable: false },
        { pubkey: curvePda, isSigner: false, isWritable: true },
        { pubkey: mint.publicKey, isSigner: false, isWritable: false },
        { pubkey: vaultAta, isSigner: false, isWritable: true },
        { pubkey: buyerAta, isSigner: false, isWritable: true },
        { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
        { pubkey: feeRecipient, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })
    const sig = await send([ix], [buyer], buyer)
    console.log('buy ok', sig)
  }

  const buyerTok = await getAccount(connection, buyerAta)
  const feeBalAfterBuy = await connection.getBalance(feeRecipient)
  const buyerSolAfter = await connection.getBalance(buyer.publicKey)
  console.log('buyer tokens after buy', buyerTok.amount.toString())
  console.log('fee recipient SOL delta (buy)', (feeBalAfterBuy - feeBalBeforeBuy) / LAMPORTS_PER_SOL)
  console.log('buyer SOL spent (incl fees)', (buyerSolBefore - buyerSolAfter) / LAMPORTS_PER_SOL)

  if (Number(buyerTok.amount) <= 0) throw new Error('FAIL: buyer received no tokens')
  if (feeBalAfterBuy <= feeBalBeforeBuy) throw new Error('FAIL: fee recipient received no SOL on buy')

  // ---- sell (sell everything the buyer holds) ----
  const feeBalBeforeSell = await connection.getBalance(feeRecipient)
  const buyerSolBeforeSell = await connection.getBalance(buyer.publicKey)
  {
    const data = Buffer.concat([disc('sell'), u64le(buyerTok.amount), u64le(0)])
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: globalPda, isSigner: false, isWritable: false },
        { pubkey: curvePda, isSigner: false, isWritable: true },
        { pubkey: mint.publicKey, isSigner: false, isWritable: false },
        { pubkey: vaultAta, isSigner: false, isWritable: true },
        { pubkey: buyerAta, isSigner: false, isWritable: true },
        { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
        { pubkey: feeRecipient, isSigner: false, isWritable: true },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    })
    const sig = await send([ix], [buyer], buyer)
    console.log('sell ok', sig)
  }

  const buyerTokAfterSell = await getAccount(connection, buyerAta)
  const feeBalAfterSell = await connection.getBalance(feeRecipient)
  const buyerSolAfterSell = await connection.getBalance(buyer.publicKey)
  console.log('buyer tokens after sell', buyerTokAfterSell.amount.toString())
  console.log('buyer SOL received (net of tx fee)', (buyerSolAfterSell - buyerSolBeforeSell) / LAMPORTS_PER_SOL)
  console.log('fee recipient SOL delta (sell)', (feeBalAfterSell - feeBalBeforeSell) / LAMPORTS_PER_SOL)

  if (Number(buyerTokAfterSell.amount) !== 0) throw new Error('FAIL: buyer still holds tokens after selling all')
  if (buyerSolAfterSell <= buyerSolBeforeSell) throw new Error('FAIL: buyer received no SOL on sell')
  if (feeBalAfterSell <= feeBalBeforeSell) throw new Error('FAIL: fee recipient received no SOL on sell')

  console.log('\n✅ ALL CHECKS PASSED — create/buy/sell move real SOL and real SPL tokens on-chain.')
}

main().catch((e) => {
  console.error('❌ FAILED:', e)
  process.exit(1)
})
