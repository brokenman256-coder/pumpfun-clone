import { create } from 'zustand'
import type { Comment, HomeTab, SortTab, Token, Trade, TradeSide, WalletState } from '../types'
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
import { createSeedTokens, randomWallet, spawnRandomToken, SEED_COUNT } from '../engine/seedTokens'
import { applyTradeToCandles, seedCandles } from '../engine/candles'

type Store = {
  tokens: Token[]
  trades: Trade[]
  comments: Comment[]
  wallet: WalletState
  sort: SortTab
  search: string
  homeTab: HomeTab
  tickerTrades: Trade[]
  graduationToast: { symbol: string; id: string } | null
  howOpen: boolean
  walletModalOpen: boolean
  spawnSeq: number
  totalLaunches: number

  setSort: (s: SortTab) => void
  setSearch: (q: string) => void
  setHomeTab: (t: HomeTab) => void
  setHowOpen: (v: boolean) => void
  setWalletModalOpen: (v: boolean) => void
  clearGraduation: () => void
  ensureCandles: (tokenId: string) => void
  setChainWallet: (connected: boolean, address: string | null) => void
  setSolBalance: (bal: number) => void
  executeTrade: (
    tokenId: string,
    side: TradeSide,
    amount: number,
    wallet?: string,
    isSim?: boolean,
    signature?: string,
  ) => { ok: boolean; error?: string; graduated?: boolean; signature?: string }
  createToken: (input: {
    name: string
    symbol: string
    description: string
    imageUrl?: string
    emoji?: string
    website?: string
    twitter?: string
    telegram?: string
    signature?: string
    mint?: string
  }) => string | null
  addComment: (tokenId: string, text: string, imageUrl?: string) => void
  likeComment: (id: string) => void
  simTick: () => void
  clearShake: (tokenId: string) => void
}

function sig() {
  return 'tx' + Math.random().toString(36).slice(2, 14)
}

export const useStore = create<Store>((set, get) => ({
  tokens: createSeedTokens(SEED_COUNT),
  trades: [],
  comments: [],
  wallet: {
    connected: false,
    address: null,
    solBalance: 0,
    holdings: {},
    costBasis: {},
  },
  sort: 'movers',
  search: '',
  homeTab: 'board',
  tickerTrades: [],
  graduationToast: null,
  howOpen: false,
  walletModalOpen: false,
  spawnSeq: 0,
  totalLaunches: SEED_COUNT + 1_248_200,

  setSort: (s) => set({ sort: s }),
  setSearch: (q) => set({ search: q }),
  setHomeTab: (t) => set({ homeTab: t }),
  setHowOpen: (v) => set({ howOpen: v }),
  setWalletModalOpen: (v) => set({ walletModalOpen: v }),
  clearGraduation: () => set({ graduationToast: null }),

  ensureCandles: (tokenId) => {
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.id === tokenId && t.candles.length === 0
          ? { ...t, candles: seedCandles(t.marketCapUsd, 40) }
          : t,
      ),
    }))
  },

  setChainWallet: (connected, address) =>
    set((s) => ({
      wallet: {
        ...s.wallet,
        connected,
        address,
        solBalance: connected ? s.wallet.solBalance : 0,
      },
      walletModalOpen: false,
    })),

  setSolBalance: (bal) =>
    set((s) => ({ wallet: { ...s.wallet, solBalance: bal } })),

  executeTrade: (tokenId, side, amount, walletOverride, isSim = false, signature) => {
    const state = get()
    const token = state.tokens.find((t) => t.id === tokenId)
    if (!token) return { ok: false, error: 'Token not found' }
    if (token.complete) return { ok: false, error: 'Graduated — trade on Raydium' }

    const wallet =
      walletOverride ||
      state.wallet.address ||
      (isSim ? randomWallet() : null)
    if (!wallet) return { ok: false, error: 'Connect wallet' }

    if (side === 'buy') {
      if (!isSim && amount > state.wallet.solBalance + 0.0001 && !signature) {
        return { ok: false, error: 'Insufficient SOL' }
      }
      const q = getBuyQuote(amount, token.virtualSol, token.virtualTokens)
      if (q.tokensOut <= 0) return { ok: false, error: 'Bad amount' }

      const newPrice = priceSol(q.newVirtualSol, q.newVirtualTokens)
      const newMcap = marketCapUsd(q.newVirtualSol, q.newVirtualTokens)
      const graduated = newMcap >= GRADUATION_MCAP_USD
      const tradeSig = signature || sig()

      const trade: Trade = {
        id: tradeSig,
        tokenId,
        side: 'buy',
        solAmount: amount,
        tokenAmount: q.tokensOut,
        wallet,
        marketCapUsd: newMcap,
        priceSol: newPrice,
        createdAt: Date.now(),
        signature: tradeSig,
      }

      set((s) => {
        const holdings = { ...s.wallet.holdings }
        const costBasis = { ...s.wallet.costBasis }
        if (!isSim && s.wallet.address === wallet) {
          holdings[tokenId] = (holdings[tokenId] || 0) + q.tokensOut
          costBasis[tokenId] = (costBasis[tokenId] || 0) + amount
        }
        return {
          tokens: s.tokens.map((t) =>
            t.id !== tokenId
              ? t
              : {
                  ...t,
                  virtualSol: q.newVirtualSol,
                  virtualTokens: q.newVirtualTokens,
                  realSol: t.realSol + amount,
                  priceSol: newPrice,
                  marketCapUsd: newMcap,
                  volumeSol: t.volumeSol + amount,
                  complete: graduated || t.complete,
                  shake: 'buy' as const,
                  candles: applyTradeToCandles(t.candles, newPrice, 'buy'),
                },
          ),
          trades: [trade, ...s.trades].slice(0, 500),
          tickerTrades: [trade, ...s.tickerTrades].slice(0, 20),
          wallet: {
            ...s.wallet,
            holdings,
            costBasis,
            solBalance:
              !isSim && s.wallet.address === wallet
                ? Math.max(0, s.wallet.solBalance - amount)
                : s.wallet.solBalance,
          },
          graduationToast: graduated
            ? { symbol: token.symbol, id: tokenId }
            : s.graduationToast,
        }
      })

      window.setTimeout(() => get().clearShake(tokenId), 700)
      return { ok: true, graduated, signature: tradeSig }
    }

    // sell
    const holding = state.wallet.holdings[tokenId] || 0
    if (!isSim && amount > holding + 1e-9) {
      return { ok: false, error: 'Insufficient tokens' }
    }
    const q = getSellQuote(amount, token.virtualSol, token.virtualTokens)
    if (q.solOut <= 0) return { ok: false, error: 'Bad amount' }

    const newPrice = priceSol(q.newVirtualSol, q.newVirtualTokens)
    const newMcap = marketCapUsd(q.newVirtualSol, q.newVirtualTokens)
    const tradeSig = signature || sig()
    const trade: Trade = {
      id: tradeSig,
      tokenId,
      side: 'sell',
      solAmount: q.solOut,
      tokenAmount: amount,
      wallet,
      marketCapUsd: newMcap,
      priceSol: newPrice,
      createdAt: Date.now(),
      signature: tradeSig,
    }

    set((s) => {
      const holdings = { ...s.wallet.holdings }
      const costBasis = { ...s.wallet.costBasis }
      if (!isSim && s.wallet.address === wallet) {
        const prev = holdings[tokenId] || 0
        const ratio = amount / Math.max(prev, 1e-12)
        holdings[tokenId] = Math.max(0, prev - amount)
        costBasis[tokenId] = Math.max(0, (costBasis[tokenId] || 0) * (1 - ratio))
      }
      return {
        tokens: s.tokens.map((t) =>
          t.id !== tokenId
            ? t
            : {
                ...t,
                virtualSol: q.newVirtualSol,
                virtualTokens: q.newVirtualTokens,
                priceSol: newPrice,
                marketCapUsd: newMcap,
                volumeSol: t.volumeSol + q.solOut,
                shake: 'sell' as const,
                candles: applyTradeToCandles(t.candles, newPrice, 'sell'),
              },
        ),
        trades: [trade, ...s.trades].slice(0, 500),
        tickerTrades: [trade, ...s.tickerTrades].slice(0, 20),
        wallet: {
          ...s.wallet,
          holdings,
          costBasis,
          solBalance:
            !isSim && s.wallet.address === wallet
              ? s.wallet.solBalance + q.solOut
              : s.wallet.solBalance,
        },
      }
    })
    window.setTimeout(() => get().clearShake(tokenId), 700)
    return { ok: true, signature: tradeSig }
  },

  createToken: (input) => {
    const state = get()
    if (!state.wallet.connected || !state.wallet.address) return null
    const id = `user_${Date.now().toString(36)}`
    const symbol = input.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    const token: Token = {
      id,
      name: input.name.trim(),
      symbol,
      emoji: input.emoji || '💊',
      description: input.description || '',
      imageUrl:
        input.imageUrl ||
        `https://api.dicebear.com/7.x/shapes/svg?seed=${symbol}&backgroundColor=86efac`,
      imageHue: Math.random() * 360,
      creator: state.wallet.address,
      virtualSol: VIRTUAL_SOL,
      virtualTokens: VIRTUAL_TOKENS,
      realSol: CREATE_FEE_SOL,
      realTokens: REAL_TOKEN_RESERVES,
      priceSol: priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS),
      marketCapUsd: marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS),
      volumeSol: 0,
      replies: 0,
      complete: false,
      createdAt: Date.now(),
      candles: [],
      holders: [],
      shake: null,
      website: input.website,
      twitter: input.twitter,
      telegram: input.telegram,
      mint: input.mint,
      signature: input.signature,
    }
    set((s) => ({
      tokens: [token, ...s.tokens],
      totalLaunches: s.totalLaunches + 1,
      wallet: {
        ...s.wallet,
        solBalance: Math.max(0, s.wallet.solBalance - CREATE_FEE_SOL),
      },
    }))
    return id
  },

  addComment: (tokenId, text, imageUrl) => {
    const address = get().wallet.address
    if (!address || !text.trim()) return
    const c: Comment = {
      id: 'c_' + Math.random().toString(36).slice(2, 10),
      tokenId,
      author: address,
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
    if (tokens.length === 0) return
    // random trade
    if (Math.random() > 0.35) {
      const t = tokens[(Math.random() * Math.min(tokens.length, 40)) | 0]
      if (t && !t.complete) {
        const side: TradeSide = Math.random() > 0.4 ? 'buy' : 'sell'
        const amount =
          side === 'buy' ? 0.05 + Math.random() * 0.8 : Math.random() * 50_000
        executeTrade(t.id, side, amount, randomWallet(), true)
      }
    }
    // occasional spawn
    if (Math.random() > 0.92) {
      set((s) => {
        const seq = s.spawnSeq + 1
        const n = spawnRandomToken(seq)
        return {
          spawnSeq: seq,
          tokens: [n, ...s.tokens].slice(0, 400),
          totalLaunches: s.totalLaunches + 1,
        }
      })
    }
  },

  clearShake: (tokenId) =>
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.id === tokenId ? { ...t, shake: null } : t,
      ),
    })),
}))
