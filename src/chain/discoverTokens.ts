/**
 * Discovers every bonding-curve token that exists on-chain (created by any
 * wallet, including the bot launcher) via getProgramAccounts, so they show
 * up for every visitor — not just the browser session that created them.
 */
import type { Connection } from '@solana/web3.js'
import { LAUNCHPAD_PROGRAM_ID } from './config'
import { decodeBondingCurve, bondingCurvePda, type OnChainCurve } from './launchpadClient'
import { tokenImageUrl, tokenEmoji } from '../lib/tokenImage'
import { marketCapUsd, priceSol } from '../engine/bondingCurve'
import type { Token } from '../types'

/** BondingCurve::SPACE from programs/launchpad/src/lib.rs — fixed account size. */
const BONDING_CURVE_SIZE = 363

function isHttpUrl(s: string) {
  return /^https?:\/\//i.test(s)
}

/**
 * The on-chain `uri` field is either: empty, a plain image URL, or compact
 * JSON `{"i": imageUrl, "t": blurb}` packed by the bot launcher (see
 * scripts/bot-launch.mjs) to carry a real description alongside the image
 * within the 200-byte on-chain limit.
 */
function parseUri(uri: string): { image?: string; blurb?: string } {
  if (!uri) return {}
  if (isHttpUrl(uri)) return { image: uri }
  try {
    const parsed = JSON.parse(uri) as { i?: string; t?: string }
    return { image: parsed.i, blurb: parsed.t }
  } catch {
    return {}
  }
}

function toToken(curve: OnChainCurve, curvePda: string): Token {
  const scale = 10 ** curve.decimals
  const virtualSol = Number(curve.virtualSolReserves) / 1e9
  const virtualTokens = Number(curve.virtualTokenReserves) / scale
  const realTokens = Number(curve.realTokenReserves) / scale
  const price = priceSol(virtualSol, virtualTokens)
  const mcap = marketCapUsd(virtualSol, virtualTokens)
  const seed = curve.mint
  const emoji = tokenEmoji(seed)
  const { image: parsedImage, blurb } = parseUri(curve.uri)
  const image = parsedImage && isHttpUrl(parsedImage) ? parsedImage : tokenImageUrl(seed, emoji, curve.symbol)

  return {
    id: curve.mint,
    name: curve.name || curve.symbol,
    symbol: curve.symbol,
    emoji,
    description: blurb || 'Live on-chain bonding curve coin.',
    imageUrl: image,
    imageHue: Math.random() * 360,
    creator: curve.creator,
    creatorName: `${curve.creator.slice(0, 4)}…`,
    virtualSol,
    virtualTokens,
    realSol: Number(curve.realSolReserves) / 1e9,
    realTokens,
    priceSol: price,
    marketCapUsd: mcap,
    change24h: 0,
    athUsd: mcap,
    volumeSol: 0,
    volumeUsd: 0,
    buyCount: 0,
    sellCount: 0,
    replies: 0,
    complete: curve.complete,
    createdAt: Date.now(),
    lastTradeAt: Date.now(),
    candles: [],
    holders: [
      { wallet: 'bonding-curve', amount: realTokens, pct: 80, isCurve: true },
      { wallet: curve.creator, amount: 0, pct: 20, isCreator: true },
    ],
    shake: null,
    tags: ['on-chain'],
    mint: curve.mint,
    curvePda,
    source: 'local',
  }
}

/** Fetches every BondingCurve account on-chain and maps it to a board Token. */
export async function fetchAllOnChainTokens(connection: Connection): Promise<Token[]> {
  const accounts = await connection.getProgramAccounts(LAUNCHPAD_PROGRAM_ID, {
    filters: [{ dataSize: BONDING_CURVE_SIZE }],
    commitment: 'confirmed',
  })

  const tokens: Token[] = []
  for (const { pubkey, account } of accounts) {
    try {
      const curve = decodeBondingCurve(account.data)
      tokens.push(toToken(curve, pubkey.toBase58()))
    } catch {
      // Skip anything that doesn't decode cleanly (e.g. a future account shape).
    }
  }
  return tokens
}

export { bondingCurvePda }
export type { OnChainCurve }
