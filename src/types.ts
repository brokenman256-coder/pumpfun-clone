export type TradeSide = 'buy' | 'sell'

export type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export type Holder = {
  wallet: string
  amount: number
  pct: number
  isCurve?: boolean
  isCreator?: boolean
}

export type Token = {
  id: string
  name: string
  symbol: string
  emoji: string
  description: string
  imageUrl: string
  imageHue: number
  creator: string
  creatorName: string
  virtualSol: number
  virtualTokens: number
  realSol: number
  realTokens: number
  priceSol: number
  marketCapUsd: number
  /** 24h price change % */
  change24h: number
  athUsd: number
  volumeSol: number
  volumeUsd: number
  buyCount: number
  sellCount: number
  replies: number
  complete: boolean
  createdAt: number
  lastTradeAt: number
  candles: Candle[]
  holders: Holder[]
  shake: TradeSide | null
  website?: string
  twitter?: string
  telegram?: string
  tags: string[]
  mint?: string
  signature?: string
  /** Live feed from DexScreener */
  source?: 'local' | 'dexscreener'
  pairUrl?: string
  pairAddress?: string
  dexId?: string
  liquidityUsd?: number
}

export type Trade = {
  id: string
  tokenId: string
  side: TradeSide
  solAmount: number
  tokenAmount: number
  wallet: string
  marketCapUsd: number
  priceSol: number
  createdAt: number
  signature: string
}

export type Comment = {
  id: string
  tokenId: string
  author: string
  text: string
  likes: number
  createdAt: number
  imageUrl?: string
}

export type WalletState = {
  connected: boolean
  address: string | null
  solBalance: number
  holdings: Record<string, number>
  costBasis: Record<string, number>
}

export type SortTab = 'movers' | 'mayhem' | 'featured' | 'graduate'
export type HomeTab = 'board' | 'communities' | 'bounties'
