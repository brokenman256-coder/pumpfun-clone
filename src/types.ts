export type TradeSide = 'buy' | 'sell'

export type Candle = {
  time: number // unix seconds
  open: number
  high: number
  low: number
  close: number
}

export type Holder = {
  wallet: string
  amount: number
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
  virtualSol: number
  virtualTokens: number
  realSol: number
  realTokens: number
  priceSol: number
  marketCapUsd: number
  volumeSol: number
  replies: number
  complete: boolean
  createdAt: number
  candles: Candle[]
  holders: Holder[]
  shake: TradeSide | null
  website?: string
  twitter?: string
  telegram?: string
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
  /** tokenId -> amount */
  holdings: Record<string, number>
  /** avg cost basis in SOL for PnL */
  costBasis: Record<string, number>
}

export type SortTab = 'featured' | 'newest' | 'market_cap' | 'about_to_graduate'
