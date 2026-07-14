/**
 * DexScreener public API — live Solana meme / new token feed.
 * Docs: https://docs.dexscreener.com/api/reference
 * Rate limits: keep polls ~30–60s.
 */
import type { Holder, Token } from '../types'
import {
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
  TOTAL_SUPPLY,
  SOL_PRICE_USD,
} from '../engine/bondingCurve'
import { tokenEmoji } from './tokenImage'
import { realTokenImageUrl } from './realTokenImages'

const BASE = 'https://api.dexscreener.com'

export type DexStatus = 'idle' | 'loading' | 'ok' | 'error'

type DexProfile = {
  url?: string
  chainId?: string
  tokenAddress?: string
  icon?: string
  header?: string
  openGraph?: string
  description?: string
  links?: { type?: string; label?: string; url?: string }[]
}

type DexPair = {
  chainId?: string
  dexId?: string
  url?: string
  pairAddress?: string
  labels?: string[]
  baseToken?: { address?: string; name?: string; symbol?: string }
  quoteToken?: { address?: string; name?: string; symbol?: string }
  priceNative?: string
  priceUsd?: string
  txns?: {
    h24?: { buys?: number; sells?: number }
    h1?: { buys?: number; sells?: number }
    m5?: { buys?: number; sells?: number }
  }
  volume?: { h24?: number; h6?: number; h1?: number; m5?: number }
  priceChange?: { h24?: number; h6?: number; h1?: number; m5?: number }
  liquidity?: { usd?: number; base?: number; quote?: number }
  fdv?: number
  marketCap?: number
  pairCreatedAt?: number
  info?: {
    imageUrl?: string
    header?: string
    openGraph?: string
    websites?: { url?: string }[]
    socials?: { type?: string; url?: string }[]
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`DexScreener ${res.status}`)
  return res.json() as Promise<T>
}

/** Latest token profiles (boosted / profiled) */
export async function fetchLatestProfiles(): Promise<DexProfile[]> {
  const data = await getJson<DexProfile[]>('/token-profiles/latest/v1')
  return Array.isArray(data) ? data.filter((p) => p.chainId === 'solana') : []
}

/** Latest boosts */
export async function fetchLatestBoosts(): Promise<DexProfile[]> {
  const data = await getJson<DexProfile[]>('/token-boosts/latest/v1')
  return Array.isArray(data) ? data.filter((p) => p.chainId === 'solana') : []
}

/** Pair data for up to ~30 token mints */
export async function fetchTokenPairs(addresses: string[]): Promise<DexPair[]> {
  if (addresses.length === 0) return []
  const unique = [...new Set(addresses.filter(Boolean))].slice(0, 30)
  const data = await getJson<{ pairs?: DexPair[] | null }>(
    `/latest/dex/tokens/${unique.join(',')}`,
  )
  const pairs = data.pairs || []
  return pairs.filter((p) => p.chainId === 'solana')
}

/** Search Solana pairs (e.g. pump, sol) */
export async function searchPairs(q: string): Promise<DexPair[]> {
  const data = await getJson<{ pairs?: DexPair[] | null }>(
    `/latest/dex/search?q=${encodeURIComponent(q)}`,
  )
  return (data.pairs || []).filter((p) => p.chainId === 'solana')
}

function linkOf(
  profile: DexProfile | undefined,
  pair: DexPair | undefined,
  type: string,
): string | undefined {
  const fromPair = pair?.info?.socials?.find((s) => s.type === type)?.url
  if (fromPair) return fromPair
  const fromProf = profile?.links?.find(
    (l) => l.type === type || l.label?.toLowerCase() === type,
  )?.url
  return fromProf
}

function pickBestPair(pairs: DexPair[], mint: string): DexPair | undefined {
  const forMint = pairs.filter(
    (p) =>
      p.baseToken?.address === mint ||
      p.quoteToken?.address === mint,
  )
  // Prefer SOL quote pairs, then highest liquidity
  const sol = forMint.filter(
    (p) =>
      p.quoteToken?.symbol === 'SOL' ||
      p.quoteToken?.address === 'So11111111111111111111111111111111111111112',
  )
  const pool = sol.length ? sol : forMint
  return pool.sort(
    (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0),
  )[0]
}

function syntheticCurveFromMcap(mcapUsd: number) {
  // Approximate bonding reserves so trade UI still works
  const progress = Math.min(0.95, Math.max(0.02, mcapUsd / 69_000))
  const virtualSol = VIRTUAL_SOL + progress * 60
  const virtualTokens = VIRTUAL_TOKENS / (1 + progress * 2)
  return { virtualSol, virtualTokens, progress }
}

function holdersFromLiq(creator: string): Holder[] {
  return [
    {
      wallet: 'bonding-curve / pool',
      amount: REAL_TOKEN_RESERVES * 0.5,
      pct: 50,
      isCurve: true,
    },
    {
      wallet: creator,
      amount: REAL_TOKEN_RESERVES * 0.1,
      pct: 10,
      isCreator: true,
    },
  ]
}

export function pairToToken(
  pair: DexPair,
  profile?: DexProfile,
): Token | null {
  const base = pair.baseToken
  if (!base?.address || !base.symbol) return null

  // Prefer non-SOL as the meme
  let meme = base
  let isQuoteMeme = false
  if (
    base.symbol === 'SOL' ||
    base.address === 'So11111111111111111111111111111111111111112'
  ) {
    if (!pair.quoteToken?.address) return null
    meme = pair.quoteToken
    isQuoteMeme = true
  }

  const mint = meme.address!
  const name = meme.name || meme.symbol || 'Token'
  const symbol = (meme.symbol || 'TOKEN').toUpperCase().slice(0, 12)
  const priceUsd = parseFloat(pair.priceUsd || '0') || 0
  const priceNative = parseFloat(pair.priceNative || '0') || 0
  const mcap = pair.marketCap || pair.fdv || priceUsd * TOTAL_SUPPLY * 0.001
  const volUsd = pair.volume?.h24 || 0
  const volSol = volUsd / SOL_PRICE_USD
  const buys = pair.txns?.h24?.buys || pair.txns?.h1?.buys || 0
  const sells = pair.txns?.h24?.sells || pair.txns?.h1?.sells || 0
  const change = pair.priceChange?.h24 ?? pair.priceChange?.h1 ?? 0
  const created = pair.pairCreatedAt || Date.now()
  const icon =
    profile?.icon ||
    pair.info?.imageUrl ||
    pair.info?.openGraph ||
    profile?.openGraph
  const emoji = tokenEmoji(mint)
  const { virtualSol, virtualTokens } = syntheticCurveFromMcap(mcap)
  const twitter = linkOf(profile, pair, 'twitter')
  const telegram = linkOf(profile, pair, 'telegram')
  const website =
    pair.info?.websites?.[0]?.url ||
    profile?.links?.find((l) => l.type === 'website' || l.label === 'Website')
      ?.url

  const labels = pair.labels || []
  const tags = [
    pair.dexId || 'dex',
    ...labels.slice(0, 2),
    'live',
  ].filter(Boolean) as string[]

  return {
    id: mint,
    name,
    symbol,
    emoji,
    description:
      profile?.description ||
      `${name} ($${symbol}) live on ${pair.dexId || 'DEX'} · data via DexScreener. NFA.`,
    imageUrl: icon || realTokenImageUrl(mint + symbol),
    imageHue: Math.abs(mint.charCodeAt(0) * 13) % 360,
    creator: mint.slice(0, 32) + '…',
    creatorName: pair.dexId || 'dex',
    virtualSol,
    virtualTokens,
    realSol: (pair.liquidity?.quote || 0) / (isQuoteMeme ? 1 : 1),
    realTokens: REAL_TOKEN_RESERVES,
    priceSol: priceNative || priceUsd / SOL_PRICE_USD,
    marketCapUsd: mcap,
    change24h: change,
    athUsd: Math.max(mcap, mcap * (1 + Math.max(0, change) / 100)),
    volumeSol: volSol,
    volumeUsd: volUsd,
    buyCount: buys,
    sellCount: sells,
    replies: Math.min(999, buys + sells),
    complete: (pair.liquidity?.usd || 0) > 50_000 || (pair.dexId !== 'pumpfun' && (pair.liquidity?.usd || 0) > 20_000),
    createdAt: created,
    lastTradeAt: Date.now(),
    candles: [],
    holders: holdersFromLiq(mint),
    shake: null,
    website,
    twitter,
    telegram,
    tags,
    mint,
    // extra live fields stored via optional extension on Token — use tags + description
    // pair URL for UI
    pairUrl: pair.url || profile?.url || `https://dexscreener.com/solana/${pair.pairAddress}`,
    pairAddress: pair.pairAddress,
    dexId: pair.dexId,
    liquidityUsd: pair.liquidity?.usd || 0,
    source: 'dexscreener' as const,
  } as Token & {
    pairUrl?: string
    pairAddress?: string
    dexId?: string
    liquidityUsd?: number
    source?: 'dexscreener' | 'local'
  }
}

/** Full sync: profiles + boosts + pair metrics */
export async function fetchLiveSolanaMemes(): Promise<{
  tokens: Token[]
  fetchedAt: number
}> {
  const [profiles, boosts, pumpSearch, solSearch] = await Promise.all([
    fetchLatestProfiles().catch(() => [] as DexProfile[]),
    fetchLatestBoosts().catch(() => [] as DexProfile[]),
    searchPairs('pump').catch(() => [] as DexPair[]),
    searchPairs('SOL').catch(() => [] as DexPair[]),
  ])

  const profileByMint = new Map<string, DexProfile>()
  for (const p of [...profiles, ...boosts]) {
    if (p.tokenAddress && !profileByMint.has(p.tokenAddress)) {
      profileByMint.set(p.tokenAddress, p)
    }
  }

  const mintList = [
    ...profileByMint.keys(),
    ...pumpSearch.map((p) => p.baseToken?.address).filter(Boolean) as string[],
  ]
  const uniqueMints = [...new Set(mintList)].slice(0, 30)

  const pairs = await fetchTokenPairs(uniqueMints).catch(() => [] as DexPair[])

  // Index pairs by base mint
  const byMint = new Map<string, DexPair[]>()
  for (const pair of [...pairs, ...pumpSearch, ...solSearch]) {
    const addr = pair.baseToken?.address
    if (!addr) continue
    if (pair.baseToken?.symbol === 'SOL') continue
    const arr = byMint.get(addr) || []
    arr.push(pair)
    byMint.set(addr, arr)
  }

  const tokens: Token[] = []
  const seen = new Set<string>()

  for (const [mint, list] of byMint) {
    if (seen.has(mint)) continue
    const best = pickBestPair(list, mint) || list[0]
    const t = pairToToken(best, profileByMint.get(mint))
    if (!t) continue
    seen.add(mint)
    tokens.push(t)
  }

  // Profiles without pairs still show with profile icon
  for (const [mint, prof] of profileByMint) {
    if (seen.has(mint)) continue
    const fakePair: DexPair = {
      chainId: 'solana',
      dexId: 'pumpfun',
      url: prof.url,
      baseToken: {
        address: mint,
        name: mint.slice(0, 6),
        symbol: mint.slice(0, 4).toUpperCase(),
      },
      quoteToken: { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
      priceUsd: '0',
      volume: { h24: 0 },
      priceChange: { h24: 0 },
      liquidity: { usd: 0 },
      pairCreatedAt: Date.now(),
      info: { imageUrl: prof.icon },
    }
    const t = pairToToken(fakePair, prof)
    if (t) {
      seen.add(mint)
      tokens.push(t)
    }
  }

  tokens.sort((a, b) => (b.volumeUsd || 0) - (a.volumeUsd || 0))

  return { tokens, fetchedAt: Date.now() }
}
