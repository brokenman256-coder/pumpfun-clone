import { createHash } from 'node:crypto'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8899'
const PROGRAM_ID = new PublicKey(
  process.env.LAUNCHPAD_PROGRAM_ID || 'AXgGrZTKV2FJWuVAaj5z36TNGWjJHLQwSkPSh5aLfsg8',
)

function disc(name) {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}
function u16le(n) {
  const b = Buffer.alloc(2)
  b.writeUInt16LE(n)
  return b
}

async function attempt(connection, signer, feeRecipient, label) {
  const [globalPda] = PublicKey.findProgramAddressSync([Buffer.from('global')], PROGRAM_ID)
  const data = Buffer.concat([disc('initialize'), u16le(100), feeRecipient.toBuffer()])
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: globalPda, isSigner: false, isWritable: true },
      { pubkey: signer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  })
  const tx = new Transaction().add(ix)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  tx.recentBlockhash = blockhash
  tx.feePayer = signer.publicKey
  tx.sign(signer)
  try {
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: true })
    const result = await connection.confirmTransaction(
      { signature: sig, blockhash, lastValidBlockHeight },
      'confirmed',
    )
    if (result.value.err) {
      console.log(`[${label}] FAILED on-chain as expected — sig ${sig}`)
      console.log('  err:', JSON.stringify(result.value.err))
      const tx2 = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 })
      const logs = tx2?.meta?.logMessages || []
      console.log('  logs:', logs.filter((l) => /Error|error/.test(l)).join(' | '))
      return { ok: false, error: JSON.stringify(result.value.err) }
    }
    const info = await connection.getAccountInfo(globalPda)
    console.log(`[${label}] SUCCEEDED — sig ${sig}, global account exists: ${!!info}`)
    return { ok: true, sig }
  } catch (e) {
    const logs = e?.transactionLogs || e?.logs || []
    console.log(`[${label}] FAILED as expected:`, e.message)
    if (logs.length) console.log('  logs:', logs.filter((l) => l.includes('Error') || l.includes('unauthorized') || l.includes('Unauthorized')).join(' | '))
    return { ok: false, error: e.message }
  }
}

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')

  // 1. Attacker: random unrelated keypair tries to front-run initialize.
  const attacker = Keypair.generate()
  const attackerAirdropSig = await connection.requestAirdrop(attacker.publicKey, 2_000_000_000)
  await connection.confirmTransaction(attackerAirdropSig, 'confirmed')
  const attackerResult = await attempt(connection, attacker, attacker.publicKey, 'ATTACKER (should fail)')

  if (attackerResult.ok) {
    console.error('\n!!! VULNERABLE: unauthorized signer was able to initialize the program !!!')
    process.exit(1)
  }
  console.log('\nFix verified: an arbitrary signer cannot call initialize().')
}

main().catch((e) => {
  console.error('Test script error:', e)
  process.exit(1)
})
