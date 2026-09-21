/**
 * SPL helpers: ATA create, mint, transfer, and parse inbound token deposits.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token'

export async function detectTokenProgram(connection, mint) {
  const info = await connection.getAccountInfo(new PublicKey(mint))
  if (!info) throw new Error('Mint account not found on this cluster')
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID
  return TOKEN_PROGRAM_ID
}

export function ataFor(mint, owner, programId = TOKEN_PROGRAM_ID) {
  return getAssociatedTokenAddressSync(
    new PublicKey(mint),
    new PublicKey(owner),
    false,
    programId,
  )
}

export async function sendIxs(connection, payer, ixs, extraSigners = []) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const tx = new Transaction({
    feePayer: payer.publicKey,
    blockhash,
    lastValidBlockHeight,
  })
  for (const ix of ixs) tx.add(ix)
  tx.sign(payer, ...extraSigners)
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  })
  const conf = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed',
  )
  if (conf.value.err) throw new Error(`SPL tx failed: ${JSON.stringify(conf.value.err)}`)
  return sig
}

/** Create the owner's ATA if missing (desk pays rent). Returns ATA pubkey. */
export async function ensureAta(connection, payer, owner, mint, programId) {
  const ata = ataFor(mint, owner, programId)
  const ix = createAssociatedTokenAccountIdempotentInstruction(
    payer.publicKey,
    ata,
    new PublicKey(owner),
    new PublicKey(mint),
    programId,
  )
  await sendIxs(connection, payer, [ix])
  return ata
}

export async function createHouseMint(connection, payer, decimals = 6) {
  const mintKp = Keypair.generate()
  const lamports = await getMinimumBalanceForRentExemptMint(connection)
  const ixs = [
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKp.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(
      mintKp.publicKey,
      decimals,
      payer.publicKey,
      payer.publicKey,
      TOKEN_PROGRAM_ID,
    ),
  ]
  const sig = await sendIxs(connection, payer, ixs, [mintKp])
  return { mint: mintKp.publicKey.toBase58(), sig, decimals }
}

export async function mintToOwner(connection, payer, mint, owner, rawAmount, decimals) {
  const programId = TOKEN_PROGRAM_ID
  const ata = await ensureAta(connection, payer, owner, mint, programId)
  const ix = createMintToInstruction(
    new PublicKey(mint),
    ata,
    payer.publicKey,
    BigInt(Math.floor(rawAmount)),
    [],
    programId,
  )
  const sig = await sendIxs(connection, payer, [ix])
  return { ata: ata.toBase58(), sig }
}

export async function transferToOwner(connection, payer, mint, owner, rawAmount, decimals) {
  const programId = await detectTokenProgram(connection, mint)
  const fromAta = ataFor(mint, payer.publicKey.toBase58(), programId)
  const toAta = await ensureAta(connection, payer, owner, mint, programId)
  const ix = createTransferCheckedInstruction(
    fromAta,
    new PublicKey(mint),
    toAta,
    payer.publicKey,
    BigInt(Math.floor(rawAmount)),
    decimals,
    [],
    programId,
  )
  const sig = await sendIxs(connection, payer, [ix])
  return { ata: toAta.toBase58(), sig }
}

function walkParsed(tx) {
  const out = []
  if (tx.transaction?.message?.instructions) out.push(...tx.transaction.message.instructions)
  for (const inner of tx.meta?.innerInstructions || []) {
    if (inner.instructions) out.push(...inner.instructions)
  }
  return out
}

/** Confirm an SPL transfer into the desk ATA. */
export async function verifyTokenDeposit(connection, signature, {
  mint,
  fromOwner,
  toOwner,
  minRaw,
}) {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })
  if (!tx) throw new Error('Token tx not found yet — wait and retry')
  if (tx.meta?.err) throw new Error('Token tx failed on-chain')

  const mintStr = mint
  let amount = 0
  let from = null
  for (const ix of walkParsed(tx)) {
    const parsed = ix.parsed
    if (!parsed) continue
    const t = parsed.type
    if (t !== 'transfer' && t !== 'transferChecked') continue
    const info = parsed.info || {}
    const m = info.mint || mintStr
    if (m && m !== mintStr) continue
    const dest = info.destination
    const auth = info.authority || info.multisigAuthority
    const raw = Number(info.tokenAmount?.amount ?? info.amount ?? 0)
    if (auth && fromOwner && auth !== fromOwner) continue
    amount = raw
    from = auth
    if (amount >= minRaw * 0.98) {
      return { from, amount, dest }
    }
  }
  if (amount < 1) throw new Error('No SPL transfer to the desk in that transaction')
  throw new Error('Token deposit smaller than the sell size')
}

export { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getMint }
