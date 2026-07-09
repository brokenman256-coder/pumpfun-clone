import { create } from 'zustand'
import type { Comment, SortTab, Token, Trade, TradeSide, WalletState } from '../types'
import {
  getBuyQuote,
  getSellQuote,
  marketCapUsd,
  priceSol,
  GRADUATION_MCAP_USD,
  CREATE_FEE_SOL,
  VIRTUAL_SOL,
  VIRTUAL_TOKENS,
  REAL_TOKEN_RESERVES,
} from '../engine/bondingCurve'
import { createSeedTokens, randomWallet } from '../engine/seedTokens'
import { applyTradeToCandles, seedCandles } from '../engine/candles'

type Flash = { id: string; side: TradeSide; at: number }

type Store = {
  tokens: Token[]
  trades: Trade[]
  comments: Comment[]
  wallet: WalletState
  sort: SortTab
  search: string
  tickerTrades: Trade[]
  graduationToast: { symbol: string; id: string } | null
  howOpen: boolean
  walletModalOpen: boolean
  flashIds: Flash[]
  launching: boolean

  setSort: (s: SortTab) => void
  setSearch: (q: string) => void
  setHowOpen: (v: boolean) => void
  setWalletModalOpen: (v: boolean) => void
  clearGraduation: () => void

  connectWallet: (provider?: string) => void
  disconnectWallet: () => void

  executeTrade: (
    tokenId: string,
    side: TradeSide,
    amount: number,
    wallet?: string,
    isSim?: boolean,
  ) => { ok: boolean; error?: string; graduated?: boolean }
  createToken: (input: {
    name: string
    symbol: string
    description: string
    imageUrl?: string
    emoji?: string
    website?: string
    twitter?: string
    telegram?: string
  }) => string | null
  addComment: (tokenId: string, text: string, imageUrl?: string) => void
  likeComment: (id: string) => void
  simTick: () => void
  clearShake: (tokenId: string) => void
}

function sig() {
  return 'sim' + Math.random().toString(36).slice(2, 12)
}

function initTokens(): Token[] {
  return createSeedTokens().map((t) => ({
    ...t,
    candles: seedCandles(t.marketCapUsd),
  }))
}

export const useStore = create<Store>((set, get) => ({
  tokens: initTokens(),
  trades: [],
  comments: [],
  wallet: {
    connected: false,
    address: null,
    solBalance: 0,
    holdings: {},
    costBasis: {},
  },
  sort: 'featured',
  search: '',
  tickerTrades: [],
  graduationToast: null,
  howOpen: false,
  walletModalOpen: false,
  flashIds: [],
  launching: false,

  setSort: (s) => set({ sort: s }),
  setSearch: (q) => set({ search: q }),
  setHowOpen: (v) => set({ howOpen: v }),
  setWalletModalOpen: (v) => set({ walletModalOpen: v }),
  clearGraduation: () => set({ graduationToast: null }),

  connectWallet: (_provider) => {
    // TODO(solana-devnet): replace with real @solana/wallet-adapter connect + getBalance
    const address = randomWallet()
    set({
      wallet: {
        connected: true,
        address,
        solBalance: 10,
        holdings: {},
        costBasis: {},
      },
      walletModalOpen: false,
    })
  },

  disconnectWallet: () =>
    set({
      wallet: {
        connected: false,
        address: null,
        solBalance: 0,
        holdings: {},
        costBasis: {},
      },
    }),

  executeTrade: (tokenId, side, amount, walletOverride, isSim = false) => {
    // TODO(solana-devnet): build + sign bonding-curve buy/sell IX, then apply fills from confirmed logs
    const state = get()
    const token = state.tokens.find((t) => t.id === tokenId)
    if (!token) return { ok: false, error: 'Token not found' }
    if (token.complete) return { ok: false, error: 'Graduated — trade on Raydium' }

    const wallet =
      walletOverride ??
      state.wallet.address ??
      (isSim ? randomWallet() : null)
    if (!wallet) return { ok: false, error: 'Connect wallet' }

    const isUser =
      !isSim && state.wallet.connected && state.wallet.address === wallet

    if (side === 'buy') {
      if (amount <= 0) return { ok: false, error: 'Invalid amount' }
      if (isUser && state.wallet.solBalance < amount) {
        return { ok: false, error: 'Insufficient SOL' }
      }

      const q = getBuyQuote(amount, token.virtualSol, token.virtualTokens)
      let next: Token = {
        ...token,
        virtualSol: q.newVirtualSol,
        virtualTokens: q.newVirtualTokens,
        realSol: token.realSol + amount,
        realTokens: token.realTokens - q.tokensOut,
        priceSol: priceSol(q.newVirtualSol, q.newVirtualTokens),
        marketCapUsd: marketCapUsd(q.newVirtualSol, q.newVirtualTokens),
        volumeSol: token.volumeSol + amount,
        shake: 'buy',
      }

      const trade: Trade = {
        id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        tokenId,
        side: 'buy',
        solAmount: amount,
        tokenAmount: q.tokensOut,
        wallet,
        marketCapUsd: next.marketCapUsd,
        priceSol: next.priceSol,
        createdAt: Date.now(),
        signature: sig(),
      }

      next = {
        ...next,
        candles: applyTradeToCandles(next.candles, trade, '1m'),
        holders: upsertHolder(next.holders, wallet, q.tokensOut),
      }

      let graduated = false
      if (next.marketCapUsd >= GRADUATION_MCAP_USD) {
        next = { ...next, complete: true }
        graduated = true
      }

      set((s) => {
        const tokens = reorderOnTrade(
          s.tokens.map((t) => (t.id === tokenId ? next : t)),
          tokenId,
        )
        const walletState = isUser
          ? {
              ...s.wallet,
              solBalance: s.wallet.solBalance - amount,
              holdings: {
                ...s.wallet.holdings,
                [tokenId]: (s.wallet.holdings[tokenId] ?? 0) + q.tokensOut,
              },
              costBasis: {
                ...s.wallet.costBasis,
                [tokenId]: (s.wallet.costBasis[tokenId] ?? 0) + amount,
              },
            }
          : s.wallet

        return {
          tokens,
          trades: [trade, ...s.trades].slice(0, 500),
          tickerTrades: [trade, ...s.tickerTrades].slice(0, 40),
          wallet: walletState,
          flashIds: [
            { id: tokenId, side: 'buy' as TradeSide, at: Date.now() },
            ...s.flashIds,
          ].slice(0, 20),
          graduationToast: graduated
            ? { symbol: next.symbol, id: next.id }
            : s.graduationToast,
        }
      })

      setTimeout(() => get().clearShake(tokenId), 1000)
      return { ok: true, graduated }
    }

    // sell
    const bal = isUser
      ? state.wallet.holdings[tokenId] ?? 0
      : amount // sim sells use amount as token amount
    const tokenAmount = isUser ? amount : amount
    if (tokenAmount <= 0) return { ok: false, error: 'Invalid amount' }
    if (isUser && bal < tokenAmount) return { ok: false, error: 'Insufficient tokens' }

    const q = getSellQuote(tokenAmount, token.virtualSol, token.virtualTokens)
    let next: Token = {
      ...token,
      virtualSol: q.newVirtualSol,
      virtualTokens: q.newVirtualTokens,
      realSol: Math.max(0, token.realSol - q.solOut),
      realTokens: token.realTokens + tokenAmount,
      priceSol: priceSol(q.newVirtualSol, q.newVirtualTokens),
      marketCapUsd: marketCapUsd(q.newVirtualSol, q.newVirtualTokens),
      volumeSol: token.volumeSol + q.solOut,
      shake: 'sell',
    }

    const trade: Trade = {
      id: `tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tokenId,
      side: 'sell',
      solAmount: q.solOut,
      tokenAmount,
      wallet,
      marketCapUsd: next.marketCapUsd,
      priceSol: next.priceSol,
      createdAt: Date.now(),
      signature: sig(),
    }

    next = {
      ...next,
      candles: applyTradeToCandles(next.candles, trade, '1m'),
      holders: upsertHolder(next.holders, wallet, -tokenAmount),
    }

    set((s) => {
      const tokens = reorderOnTrade(
        s.tokens.map((t) => (t.id === tokenId ? next : t)),
        tokenId,
      )
      const walletState = isUser
        ? {
            ...s.wallet,
            solBalance: s.wallet.solBalance + q.solOut,
            holdings: {
              ...s.wallet.holdings,
              [tokenId]: Math.max(0, (s.wallet.holdings[tokenId] ?? 0) - tokenAmount),
            },
          }
        : s.wallet

      return {
        tokens,
        trades: [trade, ...s.trades].slice(0, 500),
        tickerTrades: [trade, ...s.tickerTrades].slice(0, 40),
        wallet: walletState,
        flashIds: [
          { id: tokenId, side: 'sell' as TradeSide, at: Date.now() },
          ...s.flashIds,
        ].slice(0, 20),
      }
    })

    setTimeout(() => get().clearShake(tokenId), 1000)
    return { ok: true }
  },

  createToken: (input) => {
    const w = get().wallet
    if (!w.connected || !w.address) return null
    if (w.solBalance < CREATE_FEE_SOL) return null

    const id = `tok_${Date.now()}`
    const symbol = input.symbol.toUpperCase().slice(0, 8)
    const token: Token = {
      id,
      name: input.name,
      symbol,
      emoji: input.emoji || '🚀',
      description: input.description || 'a new coin on pump.fun',
      imageUrl:
        input.imageUrl ||
        `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=86efac`,
      imageHue: Math.floor(Math.random() * 360),
      creator: w.address,
      virtualSol: VIRTUAL_SOL,
      virtualTokens: VIRTUAL_TOKENS,
      realSol: 0,
      realTokens: REAL_TOKEN_RESERVES,
      priceSol: priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS),
      marketCapUsd: marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS),
      volumeSol: 0,
      replies: 0,
      complete: false,
      createdAt: Date.now(),
      candles: seedCandles(marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS), 8),
      holders: [
        { wallet: 'bonding-curve', amount: REAL_TOKEN_RESERVES, isCurve: true },
        { wallet: w.address, amount: 0, isCreator: true },
      ],
      shake: null,
      website: input.website,
      twitter: input.twitter,
      telegram: input.telegram,
    }

    set((s) => ({
      tokens: [token, ...s.tokens],
      wallet: { ...s.wallet, solBalance: s.wallet.solBalance - CREATE_FEE_SOL },
    }))
    return id
  },

  addComment: (tokenId, text, imageUrl) => {
    const w = get().wallet
    if (!w.address || !text.trim()) return
    const c: Comment = {
      id: `c_${Date.now()}`,
      tokenId,
      author: w.address,
      text: text.trim(),
      likes: 0,
      createdAt: Date.now(),
      imageUrl,
    }
    set((s) => ({
      comments: [c, ...s.comments],
      tokens: s.tokens.map((t) =>
        t.id === tokenId ? { ...t, replies: t.replies + 1 } : t,
      ),
    }))
  },

  likeComment: (id) =>
    set((s) => ({
      comments: s.comments.map((c) =>
        c.id === id ? { ...c, likes: c.likes + 1 } : c,
      ),
    })),

  simTick: () => {
    const { tokens, executeTrade } = get()
    const live = tokens.filter((t) => !t.complete)
    if (!live.length) return
    const token = live[Math.floor(Math.random() * live.length)]
    const side: TradeSide = Math.random() > 0.32 ? 'buy' : 'sell'
    if (side === 'buy') {
      const sol = [0.05, 0.1, 0.25, 0.5, 1, 2][Math.floor(Math.random() * 6)]
      executeTrade(token.id, 'buy', sol, randomWallet(), true)
    } else {
      // sell small token amount
      const tokAmt = token.virtualTokens * (0.00001 + Math.random() * 0.0002)
      executeTrade(token.id, 'sell', tokAmt, randomWallet(), true)
    }
  },

  clearShake: (tokenId) =>
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.id === tokenId ? { ...t, shake: null } : t,
      ),
    })),
}))

function reorderOnTrade(tokens: Token[], tokenId: string) {
  const idx = tokens.findIndex((t) => t.id === tokenId)
  if (idx <= 0) return tokens
  const copy = [...tokens]
  const [item] = copy.splice(idx, 1)
  copy.unshift(item)
  return copy
}

function upsertHolder(holders: Token['holders'], wallet: string, delta: number) {
  const list = holders.map((h) => ({ ...h }))
  const i = list.findIndex((h) => h.wallet === wallet)
  if (i >= 0) {
    list[i].amount = Math.max(0, list[i].amount + delta)
  } else if (delta > 0) {
    list.push({ wallet, amount: delta })
  }
  return list
    .filter((h) => h.amount > 0 || h.isCurve)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 25)
}

export function selectSortedTokens(tokens: Token[], sort: SortTab, search: string) {
  let list = [...tokens]
  if (search.trim()) {
    const q = search.toLowerCase()
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.symbol.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    )
  }
  switch (sort) {
    case 'newest':
      list.sort((a, b) => b.createdAt - a.createdAt)
      break
    case 'market_cap':
      list.sort((a, b) => b.marketCapUsd - a.marketCapUsd)
      break
    case 'about_to_graduate':
      list = list
        .filter((t) => !t.complete)
        .sort(
          (a, b) =>
            GRADUATION_MCAP_USD - a.marketCapUsd - (GRADUATION_MCAP_USD - b.marketCapUsd),
        )
      break
    case 'featured':
    default:
      list.sort((a, b) => b.volumeSol - a.volumeSol || b.marketCapUsd - a.marketCapUsd)
  }
  return list
}
