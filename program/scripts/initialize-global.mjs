import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

const PROGRAM_ID = new PublicKey(process.env.LAUNCHPAD_PROGRAM_ID || 'AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8')
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8899'
const FEE_RECIPIENT = new PublicKey(process.env.FEE_RECIPIENT || 'E9M6EVwNW8k6jogJ6PRmbeJUR6dhtPuDzWrWH71PwTAw')
const FEE_BPS = Number(process.env.FEE_BPS || 100)

function disc(name) {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}
function u16le(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}
function loadKeypair(p) {
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const authority = loadKeypair(path.join(os.homedir(), '.config/solana/id.json'))
  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)

  const existing = await connection.getAccountInfo(globalPda, 'confirmed')
  if (existing) {
    console.log('Global config already initialized at', globalPda.toBase58())
    return
  }

  const data = Buffer.concat([disc('initialize'), u16le(FEE_BPS), FEE_RECIPIENT.toBuffer()])
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: globalPda, isSigner: false, isWritable: true },
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = authority.publicKey
  tx.sign(authority)
  const sig = await connection.sendRawTransaction(tx.serialize())
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed')
  console.log('Initialized global config', globalPda.toBase58(), 'fee_recipient', FEE_RECIPIENT.toBase58(), 'sig', sig)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
