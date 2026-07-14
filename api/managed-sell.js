/**
 * Managed-market sell payout.
 *
 * After the client-side curve books a sell (with 5% platform margin already
 * deducted from solOut), this function sends the net SOL to the trader from
 * the bot/treasury wallet.
 *
 * Env (server-only — never VITE_):
 *   BOT_WALLET_SECRET  base58 secret key of the payout wallet
 *   SOLANA_RPC         optional RPC override
 *   SOLANA_CLUSTER     devnet | mainnet-beta (default devnet)
 *
 * Safety:
 *   - max 2 SOL per request
 *   - min 0.001 SOL
 *   - requires BOT_WALLET_SECRET
 *   - never exposes the secret
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import bs58 from 'bs58'

const MAX_SOL = 2
const MIN_SOL = 0.001

function rpcUrl() {
  if (process.env.SOLANA_RPC) return process.env.SOLANA_RPC
  const cluster = process.env.SOLANA_CLUSTER || process.env.VITE_SOLANA_CLUSTER || 'devnet'
  if (cluster === 'mainnet-beta') return 'https://api.mainnet-beta.solana.com'
  if (cluster === 'testnet') return 'https://api.testnet.solana.com'
  return 'https://api.devnet.solana.com'
}

function loadPayer() {
  const secret = process.env.BOT_WALLET_SECRET
  if (!secret) return null
  try {
    // base58 secret key (Phantom export style) OR JSON byte array
    if (secret.trim().startsWith('[')) {
      const arr = JSON.parse(secret)
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    }
    return Keypair.fromSecretKey(bs58.decode(secret.trim()))
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  const payer = loadPayer()
  if (!payer) {
    res.status(503).json({
      ok: false,
      error:
        'Sell payout wallet not configured. Set BOT_WALLET_SECRET on the server (base58 key). Buys still work.',
    })
    return
  }

  const { to, amountSol, tokenId, symbol } = req.body || {}

  if (typeof to !== 'string' || to.length < 32) {
    res.status(400).json({ ok: false, error: 'Invalid recipient' })
    return
  }
  if (typeof amountSol !== 'number' || !Number.isFinite(amountSol)) {
    res.status(400).json({ ok: false, error: 'Invalid amount' })
    return
  }
  if (amountSol < MIN_SOL) {
    res.status(400).json({ ok: false, error: `Minimum payout is ${MIN_SOL} SOL` })
    return
  }
  if (amountSol > MAX_SOL) {
    res.status(400).json({ ok: false, error: `Max payout is ${MAX_SOL} SOL per trade` })
    return
  }

  let toPk
  try {
    toPk = new PublicKey(to)
  } catch {
    res.status(400).json({ ok: false, error: 'Invalid Solana address' })
    return
  }

  // Never pay the bot wallet to itself in a loop
  if (toPk.equals(payer.publicKey)) {
    res.status(400).json({ ok: false, error: 'Invalid recipient' })
    return
  }

  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  if (lamports < 1) {
    res.status(400).json({ ok: false, error: 'Amount too small' })
    return
  }

  try {
    const connection = new Connection(rpcUrl(), 'confirmed')
    const bal = await connection.getBalance(payer.publicKey, 'confirmed')
    // Keep ~0.01 SOL for fees + safety
    const reserve = Math.round(0.01 * LAMPORTS_PER_SOL)
    if (bal < lamports + reserve) {
      res.status(503).json({
        ok: false,
        error: `Treasury low on SOL for payouts (need ~${amountSol.toFixed(4)} + fees). Fund the bot wallet.`,
      })
      return
    }

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash('confirmed')

    const tx = new Transaction({
      feePayer: payer.publicKey,
      blockhash,
      lastValidBlockHeight,
    }).add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: toPk,
        lamports,
      }),
    )

    tx.sign(payer)
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3,
    })

    const conf = await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed',
    )
    if (conf.value.err) {
      res.status(502).json({
        ok: false,
        error: `Payout tx failed: ${JSON.stringify(conf.value.err)}`,
      })
      return
    }

    res.status(200).json({
      ok: true,
      signature,
      amountSol,
      marginBps: 500,
      tokenId: typeof tokenId === 'string' ? tokenId : undefined,
      symbol: typeof symbol === 'string' ? symbol : undefined,
      from: payer.publicKey.toBase58(),
    })
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e?.message || 'Payout failed',
    })
  }
}
