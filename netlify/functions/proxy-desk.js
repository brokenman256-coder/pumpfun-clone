/**
 * Personalized SOL desk.
 *
 * A trader sends SOL from Phantom to the bot wallet. This function verifies
 * that deposit, then the bot buys the requested Solana mint on Jupiter and
 * books a per-wallet position. On sell the bot sells that bag on Jupiter in
 * the same request and pays SOL back to the trader.
 *
 * GET  /api/proxy-desk?action=positions&wallet=
 * GET  /api/proxy-desk?action=quote&mint=&amountSol=&side=
 * POST /api/proxy-desk  { action: 'buy' | 'sell', ... }
 */
import crypto from 'node:crypto'
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import { getMint } from '@solana/spl-token'
import { readBoard, writeBoard } from './lib/boardStore.js'
import {
  loadPayer,
  rpcUrl,
  botPubkey,
  lamportsOf,
  solOf,
  applyMargin,
  isSolanaMint,
  MAX_SOL,
  MIN_SOL,
  MARGIN_BPS,
} from './lib/solanaPayer.js'
import { jupiterSwap, quoteBuySol, quoteSellTokens } from './lib/jupiterDesk.js'

export const config = { path: '/api/proxy-desk' }

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS, ...init.headers },
  })
}

function posKey(wallet, mint) {
  return `${wallet}:${mint}`
}

function ensureDesk(board) {
  if (!board.deskPositions || typeof board.deskPositions !== 'object') {
    board.deskPositions = {}
  }
  if (!Array.isArray(board.usedDepositSigs)) board.usedDepositSigs = []
  if (!Array.isArray(board.payoutTokens)) board.payoutTokens = []
  if (!Array.isArray(board.deskFills)) board.deskFills = []
  return board
}

async function withRetryWrite(mutate) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { board, sha } = await readBoard()
    const next = await mutate(structuredClone(ensureDesk(board)))
    if (next === null) return { ok: false, error: 'mutate rejected' }
    if (next.error) return { ok: false, error: next.error, ...next }
    const result = await writeBoard(next.board, sha)
    if (result.ok) return { ok: true, board: result.board, ...next.extra }
    if (result.conflict) continue
    throw new Error(result.error || 'write failed')
  }
  return { ok: false, error: 'Conflict — try again' }
}

async function mintDecimals(connection, mint) {
  try {
    const info = await getMint(connection, new PublicKey(mint))
    return info.decimals
  } catch {
    return 9
  }
}

function uiAmount(raw, decimals) {
  return Number(raw) / 10 ** decimals
}

function rawAmount(ui, decimals) {
  return Math.floor(Number(ui) * 10 ** decimals)
}

function walkParsedIxs(tx) {
  const out = []
  const msg = tx.transaction?.message
  if (msg?.instructions) out.push(...msg.instructions)
  for (const inner of tx.meta?.innerInstructions || []) {
    if (inner.instructions) out.push(...inner.instructions)
  }
  return out
}

async function verifyDeposit(connection, signature, expectedTo, expectedFrom, minLamports) {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  })
  if (!tx) throw new Error('Deposit tx not found yet — wait a few seconds and retry')
  if (tx.meta?.err) throw new Error('Deposit tx failed on-chain')

  let from = null
  let lamports = 0
  for (const ix of walkParsedIxs(tx)) {
    if (ix.program !== 'system' || ix.parsed?.type !== 'transfer') continue
    const dest = ix.parsed.info?.destination
    if (dest !== expectedTo) continue
    from = ix.parsed.info?.source
    lamports = Number(ix.parsed.info?.lamports || 0)
    break
  }
  if (!from || lamports < 1) {
    throw new Error('Deposit does not send SOL to the NOVA desk wallet')
  }
  if (expectedFrom && from !== expectedFrom) {
    throw new Error('Deposit must come from your connected Phantom')
  }
  if (lamports + 50 < minLamports) {
    throw new Error(
      `Deposit too small (got ${solOf(lamports).toFixed(4)} SOL, need ${solOf(minLamports).toFixed(4)})`,
    )
  }
  return { from, lamports }
}

async function sendSol(connection, payer, to, lamports) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
  const tx = new Transaction({
    feePayer: payer.publicKey,
    blockhash,
    lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: new PublicKey(to),
      lamports,
    }),
  )
  tx.sign(payer)
  const sig = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  })
  const conf = await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    'confirmed',
  )
  if (conf.value.err) throw new Error(`Payout failed: ${JSON.stringify(conf.value.err)}`)
  return sig
}

function positionsFor(board, wallet) {
  const all = board.deskPositions || {}
  return Object.values(all).filter((p) => p.wallet === wallet && p.tokens > 0)
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const url = new URL(req.url)
  const actionQ = url.searchParams.get('action')

  try {
    if (req.method === 'GET') {
      const action = actionQ || 'positions'
      if (action === 'quote') {
        const mint = url.searchParams.get('mint') || ''
        const side = url.searchParams.get('side') === 'sell' ? 'sell' : 'buy'
        const amountSol = Number(url.searchParams.get('amountSol') || 0)
        const tokenAmount = Number(url.searchParams.get('tokenAmount') || 0)
        if (!isSolanaMint(mint)) {
          return json({ ok: false, error: 'Solana mint required' }, { status: 400 })
        }
        const connection = new Connection(rpcUrl(), 'confirmed')
        const decimals = await mintDecimals(connection, mint)
        if (side === 'buy') {
          if (!(amountSol >= MIN_SOL) || amountSol > MAX_SOL) {
            return json(
              { ok: false, error: `Buy ${MIN_SOL}–${MAX_SOL} SOL` },
              { status: 400 },
            )
          }
          const { net } = applyMargin(amountSol)
          const quote = await quoteBuySol({ mint, lamports: lamportsOf(net) })
          return json({
            ok: true,
            side: 'buy',
            mint,
            decimals,
            inSol: amountSol,
            feeSol: amountSol - net,
            marginBps: MARGIN_BPS,
            outRaw: quote.outAmount,
            outUi: uiAmount(quote.outAmount, decimals),
            priceImpactPct: quote.priceImpactPct,
          })
        }
        if (!(tokenAmount > 0)) {
          return json({ ok: false, error: 'tokenAmount required' }, { status: 400 })
        }
        const quote = await quoteSellTokens({
          mint,
          amountRaw: rawAmount(tokenAmount, decimals),
        })
        const solGross = solOf(quote.outAmount)
        const { net, fee } = applyMargin(solGross)
        return json({
          ok: true,
          side: 'sell',
          mint,
          decimals,
          inUi: tokenAmount,
          outSol: net,
          feeSol: fee,
          marginBps: MARGIN_BPS,
          priceImpactPct: quote.priceImpactPct,
        })
      }

      const wallet = url.searchParams.get('wallet') || ''
      if (wallet.length < 32) {
        return json({ ok: false, error: 'wallet required' }, { status: 400 })
      }
      const { board } = await readBoard()
      ensureDesk(board)
      return json({
        ok: true,
        wallet,
        botWallet: botPubkey(),
        marginBps: MARGIN_BPS,
        positions: positionsFor(board, wallet),
      })
    }

    if (req.method !== 'POST') {
      return json({ ok: false, error: 'Method not allowed' }, { status: 405 })
    }

    const payer = loadPayer()
    if (!payer) {
      return json(
        {
          ok: false,
          error:
            'Desk wallet not configured. Set BOT_WALLET_SECRET on the server (Phantom export, base58).',
        },
        { status: 503 },
      )
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action
    const connection = new Connection(rpcUrl(), 'confirmed')
    const desk = payer.publicKey.toBase58()

    if (action === 'buy') {
      const { signature, mint, amountSol, wallet, tokenId, symbol } = body
      if (typeof signature !== 'string' || signature.length < 32) {
        return json({ ok: false, error: 'Deposit signature required' }, { status: 400 })
      }
      if (!isSolanaMint(mint)) {
        return json({ ok: false, error: 'Only Solana mints can be bought on the desk' }, { status: 400 })
      }
      if (typeof wallet !== 'string' || wallet.length < 32) {
        return json({ ok: false, error: 'wallet required' }, { status: 400 })
      }
      if (typeof amountSol !== 'number' || amountSol < MIN_SOL || amountSol > MAX_SOL) {
        return json(
          { ok: false, error: `Buy size must be ${MIN_SOL}–${MAX_SOL} SOL` },
          { status: 400 },
        )
      }

      const deposit = await verifyDeposit(
        connection,
        signature,
        desk,
        wallet,
        lamportsOf(amountSol * 0.98),
      )

      const replay = await withRetryWrite((board) => {
        if ((board.usedDepositSigs || []).includes(signature)) {
          return { error: 'This deposit was already filled' }
        }
        board.usedDepositSigs = [signature, ...(board.usedDepositSigs || [])].slice(0, 800)
        return { board, extra: {} }
      })
      if (!replay.ok) {
        return json({ ok: false, error: replay.error }, { status: 400 })
      }

      const { net, fee } = applyMargin(amountSol)
      const decimals = await mintDecimals(connection, mint)
      let swapSig
      let outRaw
      try {
        const quote = await quoteBuySol({ mint, lamports: lamportsOf(net) })
        outRaw = Number(quote.outAmount)
        swapSig = await jupiterSwap({ connection, payer, quote })
      } catch (e) {
        try {
          await sendSol(connection, payer, wallet, deposit.lamports)
        } catch {
          /* refund best-effort */
        }
        return json(
          { ok: false, error: e?.message || 'Jupiter buy failed; deposit refunded if possible' },
          { status: 502 },
        )
      }

      const tokensUi = uiAmount(outRaw, decimals)
      const booked = await withRetryWrite((board) => {
        const key = posKey(wallet, mint)
        const prev = board.deskPositions[key] || {
          wallet,
          mint,
          tokenId: tokenId || mint,
          symbol: symbol || mint.slice(0, 6),
          tokens: 0,
          costSol: 0,
          decimals,
        }
        const next = {
          ...prev,
          tokenId: tokenId || prev.tokenId,
          symbol: symbol || prev.symbol,
          tokens: prev.tokens + tokensUi,
          costSol: prev.costSol + amountSol,
          decimals,
          updatedAt: Date.now(),
          lastBuySig: swapSig,
        }
        board.deskPositions[key] = next
        const fill = {
          id: swapSig,
          wallet,
          mint,
          tokenId: next.tokenId,
          symbol: next.symbol,
          side: 'buy',
          solAmount: amountSol,
          tokenAmount: tokensUi,
          feeSol: fee,
          depositSig: signature,
          swapSig,
          createdAt: Date.now(),
        }
        board.deskFills = [fill, ...(board.deskFills || [])].slice(0, 200)
        return { board, extra: { position: next, fill } }
      })

      return json({
        ok: true,
        side: 'buy',
        mint,
        wallet,
        tokensOut: tokensUi,
        solIn: amountSol,
        feeSol: fee,
        marginBps: MARGIN_BPS,
        depositSig: signature,
        swapSig,
        position: booked.position,
      })
    }

    if (action === 'sell') {
      const { mint, tokenAmount, wallet, tokenId, symbol } = body
      if (!isSolanaMint(mint)) {
        return json({ ok: false, error: 'Solana mint required' }, { status: 400 })
      }
      if (typeof wallet !== 'string' || wallet.length < 32) {
        return json({ ok: false, error: 'wallet required' }, { status: 400 })
      }
      if (typeof tokenAmount !== 'number' || !(tokenAmount > 0)) {
        return json({ ok: false, error: 'tokenAmount required' }, { status: 400 })
      }

      const { board: snap } = await readBoard()
      ensureDesk(snap)
      const held = snap.deskPositions[posKey(wallet, mint)]
      if (!held || held.tokens < tokenAmount * 0.999) {
        return json(
          {
            ok: false,
            error: `No desk position to sell (held ${(held?.tokens || 0).toFixed(4)})`,
          },
          { status: 400 },
        )
      }

      const decimals = held.decimals || (await mintDecimals(connection, mint))
      const sellUi = Math.min(tokenAmount, held.tokens)
      const quote = await quoteSellTokens({
        mint,
        amountRaw: rawAmount(sellUi, decimals),
      })
      const solGross = solOf(quote.outAmount)
      const { net, fee } = applyMargin(solGross)
      if (net < 0.001) {
        return json({ ok: false, error: 'Sell too small after fees' }, { status: 400 })
      }

      const swapSig = await jupiterSwap({ connection, payer, quote })

      let payoutSig
      try {
        payoutSig = await sendSol(connection, payer, wallet, lamportsOf(net))
      } catch (e) {
        const token = crypto.randomBytes(16).toString('hex')
        await withRetryWrite((board) => {
          const key = posKey(wallet, mint)
          const prev = board.deskPositions[key]
          if (prev) {
            const ratio = sellUi / Math.max(prev.tokens, 1e-12)
            board.deskPositions[key] = {
              ...prev,
              tokens: Math.max(0, prev.tokens - sellUi),
              costSol: Math.max(0, prev.costSol * (1 - ratio)),
              updatedAt: Date.now(),
            }
          }
          board.payoutTokens = [
            {
              token,
              to: wallet,
              amountSol: net,
              tokenId: tokenId || mint,
              symbol: symbol || held.symbol,
              used: false,
              createdAt: Date.now(),
            },
            ...(board.payoutTokens || []),
          ].slice(0, 300)
          return { board, extra: {} }
        })
        return json({
          ok: true,
          side: 'sell',
          mint,
          tokensIn: sellUi,
          solOut: net,
          feeSol: fee,
          swapSig,
          payoutPending: true,
          payoutToken: token,
          error: e?.message || 'Swap filled; claim SOL via payout token',
        })
      }

      const booked = await withRetryWrite((board) => {
        const key = posKey(wallet, mint)
        const prev = board.deskPositions[key] || held
        const ratio = sellUi / Math.max(prev.tokens, 1e-12)
        const next = {
          ...prev,
          tokens: Math.max(0, prev.tokens - sellUi),
          costSol: Math.max(0, prev.costSol * (1 - ratio)),
          updatedAt: Date.now(),
          lastSellSig: swapSig,
        }
        board.deskPositions[key] = next
        const fill = {
          id: payoutSig,
          wallet,
          mint,
          tokenId: tokenId || prev.tokenId,
          symbol: symbol || prev.symbol,
          side: 'sell',
          solAmount: net,
          tokenAmount: sellUi,
          feeSol: fee,
          swapSig,
          payoutSig,
          createdAt: Date.now(),
        }
        board.deskFills = [fill, ...(board.deskFills || [])].slice(0, 200)
        return { board, extra: { position: next, fill } }
      })

      return json({
        ok: true,
        side: 'sell',
        mint,
        wallet,
        tokensIn: sellUi,
        solOut: net,
        feeSol: fee,
        marginBps: MARGIN_BPS,
        swapSig,
        payoutSig,
        position: booked.position,
      })
    }

    return json({ ok: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (e) {
    return json({ ok: false, error: e?.message || 'Desk error' }, { status: 500 })
  }
}
