/**
 * Managed-market sell payout (Netlify Function, v2 request/response).
 *
 * After the client-side curve books a sell (with 5% platform margin already
 * deducted from solOut), this function sends the net SOL to the trader from
 * the bot/treasury wallet.
 *
 * Auth: requires a `payoutToken` minted by /api/live-board's sell action —
 * that's the only source of truth for who gets paid how much. The token is
 * single-use and looked up server-side; a request's own `to`/`amountSol`
 * fields are informational only and never trusted for the actual transfer,
 * so nobody can call this endpoint with an arbitrary address/amount.
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
import { readBoard, writeBoard } from './lib/boardStore.js'

export const config = { path: '/api/managed-sell' }

const MAX_SOL = 2
const MIN_SOL = 0.001
const TOKEN_TTL_MS = 15 * 60 * 1000

/** Marks a payout token used, atomically-ish via the same retry-on-conflict
 * pattern live-board.js uses. Returns the consumed token record, or an
 * error string if it's missing/expired/already used. */
async function consumePayoutToken(token) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { board, sha } = await readBoard()
    const list = board.payoutTokens || []
    const rec = list.find((p) => p.token === token)
    if (!rec) return { error: 'Unknown or expired payout token' }
    if (rec.used) return { error: 'This payout has already been claimed' }
    if (Date.now() - rec.createdAt > TOKEN_TTL_MS) return { error: 'Payout token expired — sell again' }
    board.payoutTokens = list.map((p) => (p.token === token ? { ...p, used: true } : p))
    const result = await writeBoard(board, sha)
    if (result.ok) return { rec }
    if (result.conflict) continue
    return { error: result.error || 'Could not claim payout' }
  }
  return { error: 'Conflict — try again' }
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  const payer = loadPayer()
  if (!payer) {
    return json(
      {
        ok: false,
        error:
          'Sell payout wallet not configured. Set BOT_WALLET_SECRET on the server (base58 key). Buys still work.',
      },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const { payoutToken } = body

  if (typeof payoutToken !== 'string' || payoutToken.length < 8) {
    return json(
      { ok: false, error: 'Missing payoutToken — sell on /api/live-board first, then pass its payoutToken here.' },
      { status: 400 },
    )
  }
  const claim = await consumePayoutToken(payoutToken)
  if (claim.error) {
    return json({ ok: false, error: claim.error }, { status: 400 })
  }
  const { to, amountSol, tokenId, symbol } = claim.rec

  if (typeof to !== 'string' || to.length < 32) {
    return json({ ok: false, error: 'Invalid recipient' }, { status: 400 })
  }
  if (typeof amountSol !== 'number' || !Number.isFinite(amountSol)) {
    return json({ ok: false, error: 'Invalid amount' }, { status: 400 })
  }
  if (amountSol < MIN_SOL) {
    return json({ ok: false, error: `Minimum payout is ${MIN_SOL} SOL` }, { status: 400 })
  }
  if (amountSol > MAX_SOL) {
    return json({ ok: false, error: `Max payout is ${MAX_SOL} SOL per trade` }, { status: 400 })
  }

  let toPk
  try {
    toPk = new PublicKey(to)
  } catch {
    return json({ ok: false, error: 'Invalid Solana address' }, { status: 400 })
  }

  // Never pay the bot wallet to itself in a loop
  if (toPk.equals(payer.publicKey)) {
    return json({ ok: false, error: 'Invalid recipient' }, { status: 400 })
  }

  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL)
  if (lamports < 1) {
    return json({ ok: false, error: 'Amount too small' }, { status: 400 })
  }

  try {
    const connection = new Connection(rpcUrl(), 'confirmed')
    const bal = await connection.getBalance(payer.publicKey, 'confirmed')
    // Keep ~0.01 SOL for fees + safety
    const reserve = Math.round(0.01 * LAMPORTS_PER_SOL)
    if (bal < lamports + reserve) {
      return json(
        {
          ok: false,
          error: `Treasury low on SOL for payouts (need ~${amountSol.toFixed(4)} + fees). Fund the bot wallet.`,
        },
        { status: 503 },
      )
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
      return json(
        { ok: false, error: `Payout tx failed: ${JSON.stringify(conf.value.err)}` },
        { status: 502 },
      )
    }

    return json({
      ok: true,
      signature,
      amountSol,
      marginBps: 500,
      tokenId: typeof tokenId === 'string' ? tokenId : undefined,
      symbol: typeof symbol === 'string' ? symbol : undefined,
      from: payer.publicKey.toBase58(),
    })
  } catch (e) {
    return json({ ok: false, error: e?.message || 'Payout failed' }, { status: 500 })
  }
}
