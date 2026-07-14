/**
 * Shared live board API.
 *
 * GET  /api/live-board          → full board (tokens, trades, meta)
 * POST /api/live-board
 *   { action: 'launch' }        → bot creates one unique coin (secret optional)
 *   { action: 'trade', ... }    → apply managed buy/sell to shared curve
 *   { action: 'publish', token }→ client publishes a local bot coin
 *
 * Auth for write: BOT_API_SECRET or CRON_SECRET header `x-bot-secret`,
 * or open launch when LIVE_BOARD_OPEN=1 (demo mode).
 */

import { readBoard, writeBoard } from './lib/boardStore.js'
import {
  managedBuyQuote,
  managedSellQuote,
  seedReservesToMcap,
  randomBotTargetMcap,
  PLATFORM_MARGIN_BPS,
  REAL_TOKEN_RESERVES,
  SOL_PRICE_USD,
  priceSol,
  marketCapUsd,
} from './lib/market.js'
import { pickUniqueMeme, memeToName, memeToSymbol, memeToBio } from './lib/memePool.js'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-bot-secret')
}

function authorized(req) {
  if (process.env.LIVE_BOARD_OPEN === '1') return true
  const secret = process.env.BOT_API_SECRET || process.env.CRON_SECRET
  if (!secret) return true // no secret configured → allow (dev / first deploy)
  const hdr = req.headers['x-bot-secret'] || req.headers['authorization']
  if (hdr === secret || hdr === `Bearer ${secret}`) return true
  return false
}

function buildLiveCoin(board) {
  const meme = pickUniqueMeme(board.usedMemeUrls)
  if (!meme) return null
  const seq = (board.launched || 0) + 1
  const name = memeToName(meme.title, `Meme ${seq}`)
  const symbol = memeToSymbol(meme.title, seq)
  const target = randomBotTargetMcap()
  const seeded = seedReservesToMcap(target)
  const mcap = marketCapUsd(seeded.virtualSol, seeded.virtualTokens)
  const px = priceSol(seeded.virtualSol, seeded.virtualTokens)
  const id = `live_${Date.now().toString(36)}_${seq.toString(36)}`
  const creator = `BotFleet${String(seq % 100).padStart(3, '0')}`
  const seedVol = seeded.seedSol * 0.35 + Math.random() * 0.4
  const buys = 3 + Math.floor(Math.random() * 18)
  const sells = Math.floor(buys * (0.15 + Math.random() * 0.25))
  const curveHold = Math.max(REAL_TOKEN_RESERVES * 0.55, seeded.realTokens * 0.9)
  const creatorHold = Math.max(0, REAL_TOKEN_RESERVES - curveHold)

  return {
    id,
    name,
    symbol,
    emoji: '🚀',
    description: memeToBio(meme, symbol),
    imageUrl: meme.url,
    imageHue: (seq * 37) % 360,
    creator,
    creatorName: `bot${(seq % 99) + 1}`,
    virtualSol: seeded.virtualSol,
    virtualTokens: seeded.virtualTokens,
    realSol: seeded.curveSol,
    realTokens: seeded.realTokens,
    curveSol: seeded.curveSol,
    marginSol: seeded.marginSol,
    priceSol: px,
    marketCapUsd: mcap,
    change24h: (Math.random() - 0.35) * 40,
    athUsd: mcap * (1 + Math.random() * 0.15),
    volumeSol: seedVol,
    volumeUsd: seedVol * SOL_PRICE_USD,
    buyCount: buys,
    sellCount: sells,
    replies: Math.floor(Math.random() * 12),
    complete: false,
    createdAt: Date.now(),
    lastTradeAt: Date.now(),
    candles: [],
    holders: [
      { wallet: 'bonding-curve', amount: curveHold, pct: 70, isCurve: true },
      { wallet: creator, amount: creatorHold, pct: 30, isCreator: true },
    ],
    shake: null,
    tags: ['bot-launch', 'meme', 'managed', 'live', meme.subreddit].filter(Boolean),
    source: 'bot',
    managed: true,
    twitter: `https://x.com/search?q=%24${symbol}`,
  }
}

async function withRetryWrite(mutate) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { board, sha } = await readBoard()
    const next = mutate(structuredClone(board))
    if (next === null) return { ok: false, error: 'mutate rejected', board }
    if (next.error) return { ok: false, error: next.error, board }
    const result = await writeBoard(next.board, sha)
    if (result.ok) return { ok: true, board: result.board, ...next.extra }
    if (result.conflict) continue
    throw new Error(result.error || 'write failed')
  }
  return { ok: false, error: 'Conflict — try again' }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  try {
    if (req.method === 'GET') {
      const { board, source } = await readBoard()
      res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=15')
      res.status(200).json({
        ok: true,
        source,
        marginBps: PLATFORM_MARGIN_BPS,
        ...board,
      })
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ ok: false, error: 'Method not allowed' })
      return
    }

    const body = req.body || {}
    const action = body.action || 'launch'

    if (action === 'launch') {
      if (!authorized(req)) {
        res.status(401).json({ ok: false, error: 'Unauthorized' })
        return
      }
      const out = await withRetryWrite((board) => {
        const token = buildLiveCoin(board)
        if (!token) return { error: 'Unique meme pool exhausted' }
        board.tokens = [token, ...(board.tokens || [])].slice(0, 300)
        board.usedMemeUrls = [...(board.usedMemeUrls || []), token.imageUrl].slice(-500)
        board.launched = (board.launched || 0) + 1
        return { board, extra: { token } }
      })
      if (!out.ok) {
        res.status(409).json(out)
        return
      }
      res.status(200).json({
        ok: true,
        token: out.token,
        launched: out.board.launched,
        total: out.board.tokens.length,
      })
      return
    }

    if (action === 'publish') {
      if (!authorized(req) && process.env.LIVE_BOARD_OPEN !== '1') {
        // Allow publish of client bot coins in open mode only
      }
      const token = body.token
      if (!token?.id || !token?.imageUrl) {
        res.status(400).json({ ok: false, error: 'token required' })
        return
      }
      const out = await withRetryWrite((board) => {
        if ((board.tokens || []).some((t) => t.id === token.id || t.imageUrl === token.imageUrl)) {
          return { board, extra: { skipped: true } }
        }
        const t = {
          ...token,
          managed: true,
          source: token.source || 'bot',
        }
        board.tokens = [t, ...(board.tokens || [])].slice(0, 300)
        if (t.imageUrl) {
          board.usedMemeUrls = [...(board.usedMemeUrls || []), t.imageUrl].slice(-500)
        }
        board.launched = (board.launched || 0) + 1
        return { board, extra: { token: t } }
      })
      res.status(200).json({ ok: out.ok, skipped: out.skipped, token: out.token })
      return
    }

    if (action === 'trade') {
      const { tokenId, side, amount, wallet, signature } = body
      if (!tokenId || !side || !(amount > 0)) {
        res.status(400).json({ ok: false, error: 'tokenId, side, amount required' })
        return
      }
      const out = await withRetryWrite((board) => {
        const idx = (board.tokens || []).findIndex((t) => t.id === tokenId)
        if (idx < 0) return { error: 'Token not found on live board' }
        const t = board.tokens[idx]
        if (t.complete) return { error: 'Graduated' }
        const reserves = {
          virtualSol: t.virtualSol,
          virtualTokens: t.virtualTokens,
          curveSol: t.curveSol ?? t.realSol ?? 0,
          marginSol: t.marginSol ?? 0,
        }

        if (side === 'buy') {
          const q = managedBuyQuote(amount, reserves)
          if (!q) return { error: 'Bad buy' }
          board.tokens[idx] = {
            ...t,
            virtualSol: q.newVirtualSol,
            virtualTokens: q.newVirtualTokens,
            realSol: (t.realSol || 0) + q.solToCurve,
            realTokens: Math.max(0, (t.realTokens || REAL_TOKEN_RESERVES) - q.tokensOut),
            curveSol: q.newCurveSol,
            marginSol: q.newMarginSol,
            priceSol: q.priceSol,
            marketCapUsd: q.marketCapUsd,
            athUsd: Math.max(t.athUsd || 0, q.marketCapUsd),
            volumeSol: (t.volumeSol || 0) + amount,
            volumeUsd: (t.volumeUsd || 0) + amount * SOL_PRICE_USD,
            buyCount: (t.buyCount || 0) + 1,
            lastTradeAt: Date.now(),
            complete: q.graduated || t.complete,
          }
          const trade = {
            id: signature || `tx${Date.now().toString(36)}`,
            tokenId,
            side: 'buy',
            solAmount: amount,
            tokenAmount: q.tokensOut,
            wallet: wallet || 'anon',
            marketCapUsd: q.marketCapUsd,
            priceSol: q.priceSol,
            createdAt: Date.now(),
            signature: signature || '',
          }
          board.recentTrades = [trade, ...(board.recentTrades || [])].slice(0, 100)
          return {
            board,
            extra: {
              trade,
              tokensOut: q.tokensOut,
              margin: q.margin,
              token: board.tokens[idx],
            },
          }
        }

        const q = managedSellQuote(amount, reserves)
        if (!q) return { error: 'Bad sell' }
        board.tokens[idx] = {
          ...t,
          virtualSol: q.newVirtualSol,
          virtualTokens: q.newVirtualTokens,
          realSol: Math.max(0, (t.realSol || 0) - q.solOut),
          realTokens: (t.realTokens || 0) + amount,
          curveSol: q.newCurveSol,
          marginSol: q.newMarginSol,
          priceSol: q.priceSol,
          marketCapUsd: q.marketCapUsd,
          volumeSol: (t.volumeSol || 0) + q.solOut,
          volumeUsd: (t.volumeUsd || 0) + q.solOut * SOL_PRICE_USD,
          sellCount: (t.sellCount || 0) + 1,
          lastTradeAt: Date.now(),
        }
        const trade = {
          id: signature || `tx${Date.now().toString(36)}`,
          tokenId,
          side: 'sell',
          solAmount: q.solOut,
          tokenAmount: amount,
          wallet: wallet || 'anon',
          marketCapUsd: q.marketCapUsd,
          priceSol: q.priceSol,
          createdAt: Date.now(),
          signature: signature || '',
        }
        board.recentTrades = [trade, ...(board.recentTrades || [])].slice(0, 100)
        return {
          board,
          extra: {
            trade,
            solOut: q.solOut,
            margin: q.margin,
            canPayout: q.canPayout,
            token: board.tokens[idx],
          },
        }
      })
      if (!out.ok) {
        res.status(out.error === 'Token not found on live board' ? 404 : 400).json(out)
        return
      }
      res.status(200).json({
        ok: true,
        marginBps: PLATFORM_MARGIN_BPS,
        trade: out.trade,
        token: out.token,
        tokensOut: out.tokensOut,
        solOut: out.solOut,
        margin: out.margin,
        canPayout: out.canPayout,
      })
      return
    }

    if (action === 'sim-tick') {
      // Lightweight synthetic activity so shared board mcaps wiggle
      const out = await withRetryWrite((board) => {
        const pool = (board.tokens || []).filter((t) => !t.complete && t.managed)
        if (!pool.length) return { board, extra: {} }
        const t = pool[Math.floor(Math.random() * Math.min(12, pool.length))]
        const idx = board.tokens.findIndex((x) => x.id === t.id)
        const reserves = {
          virtualSol: t.virtualSol,
          virtualTokens: t.virtualTokens,
          curveSol: t.curveSol ?? t.realSol ?? 0,
          marginSol: t.marginSol ?? 0,
        }
        const buy = Math.random() > 0.38
        if (buy) {
          const amount = 0.02 + Math.random() * 0.35
          const q = managedBuyQuote(amount, reserves)
          if (q) {
            board.tokens[idx] = {
              ...t,
              virtualSol: q.newVirtualSol,
              virtualTokens: q.newVirtualTokens,
              realSol: (t.realSol || 0) + q.solToCurve,
              curveSol: q.newCurveSol,
              marginSol: q.newMarginSol,
              priceSol: q.priceSol,
              marketCapUsd: q.marketCapUsd,
              volumeSol: (t.volumeSol || 0) + amount,
              buyCount: (t.buyCount || 0) + 1,
              lastTradeAt: Date.now(),
              change24h: (t.change24h || 0) + Math.random() * 0.3,
            }
          }
        } else {
          const amount = Math.min(t.virtualTokens * 0.0008, 40_000)
          const q = managedSellQuote(amount, reserves)
          if (q) {
            board.tokens[idx] = {
              ...t,
              virtualSol: q.newVirtualSol,
              virtualTokens: q.newVirtualTokens,
              realSol: Math.max(0, (t.realSol || 0) - q.solOut),
              curveSol: q.newCurveSol,
              marginSol: q.newMarginSol,
              priceSol: q.priceSol,
              marketCapUsd: q.marketCapUsd,
              volumeSol: (t.volumeSol || 0) + q.solOut,
              sellCount: (t.sellCount || 0) + 1,
              lastTradeAt: Date.now(),
              change24h: (t.change24h || 0) - Math.random() * 0.25,
            }
          }
        }
        return { board, extra: {} }
      })
      res.status(200).json({ ok: out.ok })
      return
    }

    res.status(400).json({ ok: false, error: `Unknown action: ${action}` })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'Server error' })
  }
}
