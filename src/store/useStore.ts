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
  SOL_PRICE_USD,
} from '../engine/bondingCurve'
import {
  managedBuyQuote,
  managedSellQuote,
  reservesFromToken,
  PLATFORM_MARGIN_BPS,
} from '../engine/managedMarket'
import { createSeedTokens, randomWallet, SEED_COUNT } from '../engine/seedTokens'
import { applyTradeToCandles, seedCandles } from '../engine/candles'
import { tokenImageUrl, tokenEmoji } from '../lib/tokenImage'
import {
  DEFAULT_BOT_CONFIG,
  buildBotToken,
  collectUsedMemeUrls,
  type BotConfig,
} from '../engine/launchBots'
import type { PaymentResult } from '../chain/paymentGateway'
import {
  loadHoldings,
  loadCostBasis,
  saveWalletLedger,
  loadUsedMemeUrls,
  saveUsedMemeUrls,
} from '../lib/tradePersist'

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
  /** DexScreener live feed */
  dexStatus: 'idle' | 'loading' | 'ok' | 'error'
  dexError: string | null
  dexLastSync: number | null
  liveMode: boolean
  botConfig: BotConfig
  botLog: string[]
  payments: PaymentResult[]
  adminAuthed: boolean

  setSort: (s: SortTab) => void
  setSearch: (q: string) => void
  setHomeTab: (t: HomeTab) => void
  setHowOpen: (v: boolean) => void
  setWalletModalOpen: (v: boolean) => void
  setLiveMode: (v: boolean) => void
  setDexStatus: (s: 'idle' | 'loading' | 'ok' | 'error', err?: string | null) => void
  mergeDexTokens: (live: Token[]) => void
  setBotEnabled: (on: boolean) => void
  setBotInterval: (ms: number) => void
  setBotFleet: (n: number) => void
  botTick: () => void
  pushBotLog: (line: string) => void
  mergeLiveBoard: (snap: {
    tokens: Token[]
    trades?: Trade[]
    usedMemeUrls?: string[]
    launched?: number
  }) => void
  applyLiveToken: (token: Token) => void
  /** Credit/debit holdings after a shared live-board trade (curve already applied). */
  bookHolding: (
    tokenId: string,
    side: TradeSide,
    tokenAmount: number,
    solAmount: number,
    signature?: string,
  ) => void
  mergeOnChainTokens: (onChain: Token[]) => void
  removeToken: (tokenId: string) => void
  pushPayment: (p: PaymentResult) => void
  setAdminAuthed: (v: boolean) => void
  clearGraduation: () => void
  ensureCandles: (tokenId: string) => void
  setChainWallet: (connected: boolean, address: string | null) => void
  setSolBalance: (bal: number) => void
  usedMemeUrls: string[]
  liveBoardSynced: boolean
  executeTrade: (
    tokenId: string,
    side: TradeSide,
    amount: number,
    wallet?: string,
    isSim?: boolean,
    signature?: string,
  ) => {
    ok: boolean
    error?: string
    graduated?: boolean
    signature?: string
    /** SOL the trader receives on sell (after 5% margin) */
    solOut?: number
    tokensOut?: number
    margin?: number
    canPayout?: boolean
  }
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
    curvePda?: string
  }) => string | null
  syncTokenFromChain: (
    tokenId: string,
    curve: {
      virtualSolLamports: bigint
      virtualTokenRaw: bigint
      realSolLamports: bigint
      realTokenRaw: bigint
      complete: boolean
      decimals: number
    },
  ) => void
  addComment: (tokenId: string, text: string, imageUrl?: string) => void
  likeComment: (id: string) => void
  simTick: () => void
  clearShake: (tokenId: string) => void
}

function sig() {
  return 'tx' + Math.random().toString(36).slice(2, 14)
}

function shortCreator(a: string) {
  return 'dev' + a.slice(0, 4).toLowerCase()
}

function isManagedToken(t: Token) {
  // On-chain program coins use launchpad; everything else board-side is managed.
  if (t.mint && t.curvePda) return false
  if (t.source === 'dexscreener') return false
  return t.managed === true || t.source === 'bot' || t.source === 'local' || !t.mint
}

export const useStore = create<Store>((set, get) => ({
  tokens: createSeedTokens(SEED_COUNT).map((t) => ({
    ...t,
    managed: true,
    source: t.source || 'local',
    curveSol: t.curveSol ?? t.realSol ?? 0,
    marginSol: t.marginSol ?? 0,
  })),
  trades: [],
  comments: [],
  wallet: {
    connected: false,
    address: null,
    solBalance: 0,
    holdings: typeof localStorage !== 'undefined' ? loadHoldings() : {},
    costBasis: typeof localStorage !== 'undefined' ? loadCostBasis() : {},
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
  dexStatus: 'idle',
  dexError: null,
  dexLastSync: null,
  liveMode: true,
  botConfig: { ...DEFAULT_BOT_CONFIG },
  botLog: [
    `${new Date().toISOString()} · LIVE managed market · margin ${PLATFORM_MARGIN_BPS / 100}% · coin bot every ${DEFAULT_BOT_CONFIG.intervalMs / 1000}s`,
  ],
  payments: [],
  adminAuthed: false,
  usedMemeUrls: typeof localStorage !== 'undefined' ? loadUsedMemeUrls() : [],
  liveBoardSynced: false,

  setSort: (s) => set({ sort: s }),
  setSearch: (q) => set({ search: q }),
  setHomeTab: (t) => set({ homeTab: t }),
  setHowOpen: (v) => set({ howOpen: v }),
  setWalletModalOpen: (v) => set({ walletModalOpen: v }),
  setLiveMode: (v) => set({ liveMode: v }),
  setDexStatus: (s, err = null) => set({ dexStatus: s, dexError: err }),
  mergeDexTokens: (live) =>
    set((s) => {
      // Keep user-created / local coins that are not on DexScreener
      const localOnly = s.tokens.filter(
        (t) => t.source !== 'dexscreener' && !live.some((l) => l.id === t.id || l.mint === t.mint),
      )
      // Dex coins first (latest memes), then local
      const merged = [...live, ...localOnly]
      return {
        tokens: merged,
        dexStatus: 'ok',
        dexError: null,
        dexLastSync: Date.now(),
        totalLaunches: Math.max(s.totalLaunches, live.length + localOnly.length),
      }
    }),
  mergeOnChainTokens: (onChain) =>
    set((s) => {
      const byMint = new Map(s.tokens.filter((t) => t.mint).map((t) => [t.mint, t]))
      const merged = onChain.map((fresh) => {
        const existing = fresh.mint ? byMint.get(fresh.mint) : undefined
        // Keep locally-known extras (replies count, richer description) but
        // let on-chain fields (price/reserves/complete) always win — they're
        // the source of truth.
        return existing ? { ...existing, ...fresh, replies: existing.replies } : fresh
      })
      const onChainMints = new Set(onChain.map((t) => t.mint).filter(Boolean))
      const rest = s.tokens.filter((t) => !t.mint || !onChainMints.has(t.mint))
      return {
        tokens: [...merged, ...rest],
        totalLaunches: Math.max(s.totalLaunches, merged.length + rest.length),
      }
    }),
  removeToken: (tokenId) =>
    set((s) => ({ tokens: s.tokens.filter((t) => t.id !== tokenId) })),
  setBotEnabled: (on) =>
    set((s) => ({
      botConfig: { ...s.botConfig, enabled: on },
      botLog: [
        `${new Date().toISOString()} · fleet ${on ? 'ARMED' : 'STOPPED'}`,
        ...s.botLog,
      ].slice(0, 100),
    })),
  setBotInterval: (ms) =>
    set((s) => ({ botConfig: { ...s.botConfig, intervalMs: Math.max(5000, ms) } })),
  setBotFleet: (n) =>
    set((s) => ({
      botConfig: { ...s.botConfig, fleetSize: Math.min(500, Math.max(1, n)) },
    })),
  pushBotLog: (line) =>
    set((s) => ({
      botLog: [`${new Date().toISOString()} · ${line}`, ...s.botLog].slice(0, 100),
    })),
  mergeLiveBoard: (snap) =>
    set((s) => {
      const live = (snap.tokens || []).map((t) => ({
        ...t,
        managed: true,
        source: (t.source as Token['source']) || 'bot',
        candles: t.candles?.length ? t.candles : seedCandles(t.marketCapUsd || 5000, 28),
      }))
      // Keep user-created local coins + on-chain + dexscreener not in live set
      const liveIds = new Set(live.map((t) => t.id))
      const liveMints = new Set(live.map((t) => t.mint).filter(Boolean))
      const rest = s.tokens.filter((t) => {
        if (liveIds.has(t.id)) return false
        if (t.mint && liveMints.has(t.mint)) return false
        // Drop stale local bots once live board has content
        if (live.length > 0 && t.source === 'bot' && t.managed) return false
        return true
      })
      // Prefer live board coins first (newest first already)
      const tokens = [...live, ...rest].slice(0, 500)
      const used = new Set([...(snap.usedMemeUrls || []), ...s.usedMemeUrls])
      for (const t of live) if (t.imageUrl) used.add(t.imageUrl)
      const usedList = Array.from(used)
      saveUsedMemeUrls(usedList)
      const trades =
        snap.trades && snap.trades.length
          ? [...snap.trades, ...s.trades.filter((tr) => !snap.trades!.some((x) => x.id === tr.id))].slice(
              0,
              500,
            )
          : s.trades
      return {
        tokens,
        trades,
        tickerTrades: trades.slice(0, 20),
        usedMemeUrls: usedList,
        liveBoardSynced: true,
        totalLaunches: Math.max(s.totalLaunches, snap.launched || 0, tokens.length),
        botConfig: {
          ...s.botConfig,
          launched: Math.max(s.botConfig.launched, snap.launched || 0),
        },
      }
    }),
  applyLiveToken: (token) =>
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.id === token.id
          ? {
              ...t,
              ...token,
              candles: applyTradeToCandles(
                t.candles.length ? t.candles : seedCandles(token.marketCapUsd, 28),
                token.priceSol,
                'buy',
              ),
            }
          : t,
      ),
    })),
  bookHolding: (tokenId, side, tokenAmount, solAmount, signature) => {
    set((s) => {
      if (!s.wallet.address) return s
      const holdings = { ...s.wallet.holdings }
      const costBasis = { ...s.wallet.costBasis }
      if (side === 'buy') {
        holdings[tokenId] = (holdings[tokenId] || 0) + tokenAmount
        costBasis[tokenId] = (costBasis[tokenId] || 0) + solAmount
      } else {
        const prev = holdings[tokenId] || 0
        const ratio = tokenAmount / Math.max(prev, 1e-12)
        holdings[tokenId] = Math.max(0, prev - tokenAmount)
        costBasis[tokenId] = Math.max(0, (costBasis[tokenId] || 0) * (1 - ratio))
      }
      saveWalletLedger(holdings, costBasis)
      const trade: Trade = {
        id: signature || sig(),
        tokenId,
        side,
        solAmount,
        tokenAmount,
        wallet: s.wallet.address,
        marketCapUsd: s.tokens.find((t) => t.id === tokenId)?.marketCapUsd || 0,
        priceSol: s.tokens.find((t) => t.id === tokenId)?.priceSol || 0,
        createdAt: Date.now(),
        signature: signature || sig(),
      }
      return {
        wallet: {
          ...s.wallet,
          holdings,
          costBasis,
          solBalance:
            side === 'buy'
              ? Math.max(0, s.wallet.solBalance - solAmount)
              : s.wallet.solBalance,
        },
        trades: [trade, ...s.trades].slice(0, 500),
        tickerTrades: [trade, ...s.tickerTrades].slice(0, 20),
      }
    })
  },
  botTick: () => {
    const s = get()
    if (!s.botConfig.enabled) return
    if (s.botConfig.launched >= s.botConfig.fleetSize) {
      set({
        botConfig: { ...s.botConfig, enabled: false },
        botLog: [
          `${new Date().toISOString()} · fleet complete (${s.botConfig.fleetSize} tokens)`,
          ...s.botLog,
        ].slice(0, 100),
      })
      return
    }

    const used = collectUsedMemeUrls(s.tokens)
    for (const u of s.usedMemeUrls) used.add(u)

    const idx = s.botConfig.launched
    const token = buildBotToken({
      botIndex: idx,
      seq: s.spawnSeq + idx + 1,
      usedUrls: used,
    })

    if (!token) {
      set({
        botConfig: { ...s.botConfig, enabled: false },
        botLog: [
          `${new Date().toISOString()} · unique meme pool exhausted — fleet paused`,
          ...s.botLog,
        ].slice(0, 100),
      })
      return
    }

    used.add(token.imageUrl)
    const usedList = Array.from(used)
    saveUsedMemeUrls(usedList)

    set({
      tokens: [token, ...s.tokens].slice(0, 500),
      botConfig: {
        ...s.botConfig,
        launched: s.botConfig.launched + 1,
      },
      spawnSeq: s.spawnSeq + 1,
      totalLaunches: s.totalLaunches + 1,
      usedMemeUrls: usedList,
      botLog: [
        `${new Date().toISOString()} · bot launched $${token.symbol} · mcap $${Math.round(token.marketCapUsd).toLocaleString()} · margin ${PLATFORM_MARGIN_BPS / 100}%`,
        ...s.botLog,
      ].slice(0, 100),
    })
  },
  pushPayment: (p) =>
    set((s) => ({ payments: [p, ...s.payments].slice(0, 50) })),
  setAdminAuthed: (v) => set({ adminAuthed: v }),
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

    const managed = isManagedToken(token)
    const reserves = reservesFromToken(token)

    if (side === 'buy') {
      if (!isSim && amount > state.wallet.solBalance + 0.0001 && !signature) {
        return { ok: false, error: 'Insufficient SOL' }
      }

      let tokensOut: number
      let newVirtualSol: number
      let newVirtualTokens: number
      let newPrice: number
      let newMcap: number
      let graduated: boolean
      let margin = 0
      let newCurveSol = reserves.curveSol
      let newMarginSol = reserves.marginSol
      let solToCurve = amount

      if (managed) {
        const q = managedBuyQuote(amount, reserves)
        if (!q || q.tokensOut <= 0) return { ok: false, error: 'Bad amount' }
        tokensOut = q.tokensOut
        newVirtualSol = q.newVirtualSol
        newVirtualTokens = q.newVirtualTokens
        newPrice = q.priceSol
        newMcap = q.marketCapUsd
        graduated = q.graduated
        margin = q.margin
        newCurveSol = q.newCurveSol
        newMarginSol = q.newMarginSol
        solToCurve = q.solToCurve
      } else {
        const q = getBuyQuote(amount, token.virtualSol, token.virtualTokens)
        if (q.tokensOut <= 0) return { ok: false, error: 'Bad amount' }
        tokensOut = q.tokensOut
        newVirtualSol = q.newVirtualSol
        newVirtualTokens = q.newVirtualTokens
        newPrice = priceSol(q.newVirtualSol, q.newVirtualTokens)
        newMcap = marketCapUsd(q.newVirtualSol, q.newVirtualTokens)
        graduated = newMcap >= GRADUATION_MCAP_USD
      }

      const tradeSig = signature || sig()
      const trade: Trade = {
        id: tradeSig,
        tokenId,
        side: 'buy',
        solAmount: amount,
        tokenAmount: tokensOut,
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
          holdings[tokenId] = (holdings[tokenId] || 0) + tokensOut
          costBasis[tokenId] = (costBasis[tokenId] || 0) + amount
          saveWalletLedger(holdings, costBasis)
        }

        // Update holders for realism on managed board
        const holders = [...(s.tokens.find((t) => t.id === tokenId)?.holders || [])]
        if (managed && !isSim) {
          const hi = holders.findIndex((h) => h.wallet === wallet)
          if (hi >= 0) holders[hi] = { ...holders[hi], amount: holders[hi].amount + tokensOut }
          else holders.push({ wallet, amount: tokensOut, pct: 0 })
          const total = holders.reduce((a, h) => a + h.amount, 0) || 1
          for (const h of holders) h.pct = (h.amount / total) * 100
          holders.sort((a, b) => b.amount - a.amount)
        }

        return {
          tokens: s.tokens.map((t) =>
            t.id !== tokenId
              ? t
              : {
                  ...t,
                  virtualSol: newVirtualSol,
                  virtualTokens: newVirtualTokens,
                  realSol: (t.realSol || 0) + solToCurve,
                  realTokens: Math.max(0, (t.realTokens || REAL_TOKEN_RESERVES) - tokensOut),
                  curveSol: newCurveSol,
                  marginSol: newMarginSol,
                  priceSol: newPrice,
                  marketCapUsd: newMcap,
                  athUsd: Math.max(t.athUsd || 0, newMcap),
                  volumeSol: t.volumeSol + amount,
                  volumeUsd: t.volumeUsd + amount * SOL_PRICE_USD,
                  buyCount: t.buyCount + 1,
                  lastTradeAt: Date.now(),
                  complete: graduated || t.complete,
                  shake: 'buy' as const,
                  candles: applyTradeToCandles(t.candles, newPrice, 'buy'),
                  holders: managed && !isSim ? holders.slice(0, 20) : t.holders,
                  change24h: t.change24h + (Math.random() * 0.4 - 0.05),
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
      return {
        ok: true,
        graduated,
        signature: tradeSig,
        tokensOut,
        margin,
      }
    }

    // ─── SELL ───────────────────────────────────────────────
    const holding = state.wallet.holdings[tokenId] || 0
    if (!isSim && amount > holding + 1e-9) {
      return { ok: false, error: 'Insufficient tokens' }
    }

    let solOut: number
    let newVirtualSol: number
    let newVirtualTokens: number
    let newPrice: number
    let newMcap: number
    let margin = 0
    let newCurveSol = reserves.curveSol
    let newMarginSol = reserves.marginSol
    let canPayout = true

    if (managed) {
      const q = managedSellQuote(amount, reserves)
      if (!q || q.solOut <= 0) return { ok: false, error: 'Bad amount' }
      // Sims can always "sell" into the virtual curve even if thin
      if (!isSim && !q.canPayout && reserves.curveSol < q.solOut * 0.5) {
        return {
          ok: false,
          error: 'Curve liquidity low — try a smaller sell',
          canPayout: false,
          solOut: q.solOut,
        }
      }
      solOut = q.solOut
      newVirtualSol = q.newVirtualSol
      newVirtualTokens = q.newVirtualTokens
      newPrice = q.priceSol
      newMcap = q.marketCapUsd
      margin = q.margin
      newCurveSol = q.newCurveSol
      newMarginSol = q.newMarginSol
      canPayout = q.canPayout
    } else {
      const q = getSellQuote(amount, token.virtualSol, token.virtualTokens)
      if (q.solOut <= 0) return { ok: false, error: 'Bad amount' }
      solOut = q.solOut
      newVirtualSol = q.newVirtualSol
      newVirtualTokens = q.newVirtualTokens
      newPrice = priceSol(q.newVirtualSol, q.newVirtualTokens)
      newMcap = marketCapUsd(q.newVirtualSol, q.newVirtualTokens)
    }

    const tradeSig = signature || sig()
    const trade: Trade = {
      id: tradeSig,
      tokenId,
      side: 'sell',
      solAmount: solOut,
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
        saveWalletLedger(holdings, costBasis)
      }

      const holders = [...(s.tokens.find((t) => t.id === tokenId)?.holders || [])]
      if (managed && !isSim) {
        const hi = holders.findIndex((h) => h.wallet === wallet)
        if (hi >= 0) {
          holders[hi] = {
            ...holders[hi],
            amount: Math.max(0, holders[hi].amount - amount),
          }
        }
        const total = holders.reduce((a, h) => a + h.amount, 0) || 1
        for (const h of holders) h.pct = (h.amount / total) * 100
        holders.sort((a, b) => b.amount - a.amount)
      }

      return {
        tokens: s.tokens.map((t) =>
          t.id !== tokenId
            ? t
            : {
                ...t,
                virtualSol: newVirtualSol,
                virtualTokens: newVirtualTokens,
                realSol: Math.max(0, (t.realSol || 0) - solOut),
                realTokens: (t.realTokens || 0) + amount,
                curveSol: newCurveSol,
                marginSol: newMarginSol,
                priceSol: newPrice,
                marketCapUsd: newMcap,
                volumeSol: t.volumeSol + solOut,
                volumeUsd: t.volumeUsd + solOut * SOL_PRICE_USD,
                sellCount: t.sellCount + 1,
                lastTradeAt: Date.now(),
                shake: 'sell' as const,
                candles: applyTradeToCandles(t.candles, newPrice, 'sell'),
                holders: managed && !isSim ? holders.slice(0, 20) : t.holders,
                change24h: t.change24h - Math.random() * 0.35,
              },
        ),
        trades: [trade, ...s.trades].slice(0, 500),
        tickerTrades: [trade, ...s.tickerTrades].slice(0, 20),
        wallet: {
          ...s.wallet,
          holdings,
          costBasis,
          // Only credit local SOL when we have a real payout/on-chain sig,
          // or for sims. Managed sells without signature wait for refreshBalance.
          solBalance:
            !isSim && s.wallet.address === wallet && (!managed || !!signature)
              ? s.wallet.solBalance + solOut
              : s.wallet.solBalance,
        },
      }
    })
    window.setTimeout(() => get().clearShake(tokenId), 700)
    return {
      ok: true,
      signature: tradeSig,
      solOut,
      margin,
      canPayout,
    }
  },

  createToken: (input) => {
    const state = get()
    if (!state.wallet.connected || !state.wallet.address) return null
    const id = `user_${Date.now().toString(36)}`
    const symbol = input.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    const emoji = input.emoji || tokenEmoji(id + symbol)
    const mcap = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
    const token: Token = {
      id,
      name: input.name.trim(),
      symbol,
      emoji,
      description: input.description || `${input.name.trim()} launched on the curve.`,
      imageUrl: input.imageUrl || tokenImageUrl(id + symbol, emoji, symbol),
      imageHue: Math.random() * 360,
      creator: state.wallet.address,
      creatorName: shortCreator(state.wallet.address),
      virtualSol: VIRTUAL_SOL,
      virtualTokens: VIRTUAL_TOKENS,
      realSol: CREATE_FEE_SOL,
      realTokens: REAL_TOKEN_RESERVES,
      priceSol: priceSol(VIRTUAL_SOL, VIRTUAL_TOKENS),
      marketCapUsd: mcap,
      change24h: 0,
      athUsd: mcap,
      volumeSol: 0,
      volumeUsd: 0,
      buyCount: 0,
      sellCount: 0,
      replies: 0,
      complete: false,
      createdAt: Date.now(),
      lastTradeAt: Date.now(),
      candles: [],
      holders: [
        {
          wallet: 'bonding-curve',
          amount: REAL_TOKEN_RESERVES * 0.8,
          pct: 80,
          isCurve: true,
        },
        {
          wallet: state.wallet.address,
          amount: REAL_TOKEN_RESERVES * 0.2,
          pct: 20,
          isCreator: true,
        },
      ],
      shake: null,
      website: input.website,
      twitter: input.twitter,
      telegram: input.telegram,
      tags: ['new', 'meme', 'managed'],
      mint: input.mint,
      curvePda: input.curvePda,
      signature: input.signature,
      source: input.mint ? 'onchain' : 'local',
      managed: !input.mint,
      curveSol: 0,
      marginSol: 0,
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

  syncTokenFromChain: (tokenId, curve) => {
    set((s) => ({
      tokens: s.tokens.map((t) => {
        if (t.id !== tokenId) return t
        const scale = 10 ** curve.decimals
        const virtualSol = Number(curve.virtualSolLamports) / 1e9
        const virtualTokens = Number(curve.virtualTokenRaw) / scale
        const newPrice = priceSol(virtualSol, virtualTokens)
        const newMcap = marketCapUsd(virtualSol, virtualTokens)
        return {
          ...t,
          virtualSol,
          virtualTokens,
          realSol: Number(curve.realSolLamports) / 1e9,
          realTokens: Number(curve.realTokenRaw) / scale,
          priceSol: newPrice,
          marketCapUsd: newMcap,
          athUsd: Math.max(t.athUsd || 0, newMcap),
          complete: curve.complete,
          candles: applyTradeToCandles(t.candles, newPrice, 'buy'),
        }
      }),
    }))
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
    const { tokens, executeTrade, botConfig } = get()
    // Only animate managed board coins (bots + local) — looks like real order flow
    const pool = tokens.filter(
      (t) =>
        !t.complete &&
        (t.managed || t.source === 'bot' || t.source === 'local') &&
        t.source !== 'dexscreener',
    )
    if (pool.length === 0) return

    // Prefer fresher coins for activity (top of board)
    const hot = pool.slice(0, Math.min(24, pool.length))
    if (Math.random() > 0.28) {
      const t = hot[(Math.random() * hot.length) | 0]
      if (t) {
        const side: TradeSide = Math.random() > 0.38 ? 'buy' : 'sell'
        if (side === 'buy') {
          // Realistic small retail size distribution
          const r = Math.random()
          const amount =
            r < 0.55
              ? 0.02 + Math.random() * 0.15
              : r < 0.9
                ? 0.15 + Math.random() * 0.6
                : 0.5 + Math.random() * 1.8
          executeTrade(t.id, 'buy', amount, randomWallet(), true)
        } else {
          // Sell a fraction of virtual supply so chart wiggles realistically
          const amount = Math.min(
            t.virtualTokens * (0.0002 + Math.random() * 0.0015),
            REAL_TOKEN_RESERVES * 0.002,
          )
          if (amount > 1) executeTrade(t.id, 'sell', amount, randomWallet(), true)
        }
      }
    }

    // Secondary trade burst on king/hot coin (~15%)
    if (Math.random() > 0.85 && hot[0]) {
      executeTrade(
        hot[0].id,
        Math.random() > 0.45 ? 'buy' : 'sell',
        Math.random() > 0.45
          ? 0.05 + Math.random() * 0.35
          : Math.min(hot[0].virtualTokens * 0.0008, 40_000),
        randomWallet(),
        true,
      )
    }

    // If bots are off, occasionally spawn one managed coin so board never dies
    if (!botConfig.enabled && Math.random() > 0.97) {
      get().botTick()
    }
  },

  clearShake: (tokenId) =>
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.id === tokenId ? { ...t, shake: null } : t,
      ),
    })),
}))
