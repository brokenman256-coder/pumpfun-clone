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
import { tokenEmoji } from '../lib/tokenImage'
import { realTokenImageUrl } from '../lib/realTokenImages'
import {
  DEFAULT_BOT_CONFIG,
  buildBotToken,
  collectUsedMemeUrls,
  type BotConfig,
} from '../engine/launchBots'
import {
  createTraderFleet,
  decideSide,
  pickPersona,
  sellFraction,
  tradeSize,
  rotateDisplayName,
  planHumanSellSequence,
  pickActors,
  type TraderState,
} from '../engine/traderBots'
import type { PaymentResult } from '../chain/paymentGateway'
import {
  loadHoldings,
  loadCostBasis,
  saveWalletLedger,
  loadUsedMemeUrls,
  saveUsedMemeUrls,
} from '../lib/tradePersist'
import { PERSONAL_MODE, PERSONAL_START_SOL } from '../chain/config'
import {
  JACKPOT_ARM_X,
  JACKPOT_FREEZE_MS,
  isSellLocked,
  shouldJackpotVanish,
  multipleFromLaunch,
} from '../engine/jackpot'

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
  /** Multi-account free trader bots (buy pressure → eventual sells). Zero gas. */
  traderTick: () => void
  /** After a real user buy — staggered human-like bot sells */
  scheduleHumanReaction: (tokenId: string, userSolIn: number) => void
  enterPersonalSession: () => void
  clearShake: (tokenId: string) => void
  /** Remove jackpot coins after 24h freeze; clear their holdings */
  purgeExpiredJackpots: () => void
  traderFleet: TraderState[]
  jackpotToast: {
    symbol: string
    multiple: number
    id: string
    kind: 'armed' | 'frozen'
  } | null
  clearJackpotToast: () => void
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
    launchPriceSol: t.launchPriceSol ?? t.priceSol,
    launchMcapUsd: t.launchMcapUsd ?? t.marketCapUsd,
    realUserSolIn: t.realUserSolIn ?? 0,
    jackpotArmed: t.jackpotArmed ?? false,
  })),
  trades: [],
  comments: [],
  wallet: {
    connected: PERSONAL_MODE,
    address: PERSONAL_MODE ? 'personal_trader' : null,
    solBalance: PERSONAL_MODE ? PERSONAL_START_SOL : 0,
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
  liveMode: !PERSONAL_MODE,
  botConfig: { ...DEFAULT_BOT_CONFIG },
  botLog: [
    PERSONAL_MODE
      ? `${new Date().toISOString()} · PERSONAL market · zero gas · ${PLATFORM_MARGIN_BPS / 100}% margin · coin bot 30s · multi-bot traders`
      : `${new Date().toISOString()} · managed market · margin ${PLATFORM_MARGIN_BPS / 100}%`,
  ],
  payments: [],
  adminAuthed: false,
  usedMemeUrls: typeof localStorage !== 'undefined' ? loadUsedMemeUrls() : [],
  liveBoardSynced: false,
  traderFleet: createTraderFleet(),
  jackpotToast: null,

  setSort: (s) => set({ sort: s }),
  clearJackpotToast: () => set({ jackpotToast: null }),
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
      // For real Phantom: buy already spent on-chain; sell SOL comes from payout tx.
      // Only adjust local solBalance for demo/personal_trader.
      const isDemo =
        s.wallet.address === 'personal_trader' ||
        s.wallet.address.startsWith('personal')
      let nextSol = s.wallet.solBalance
      if (isDemo) {
        nextSol =
          side === 'buy'
            ? Math.max(0, s.wallet.solBalance - solAmount)
            : s.wallet.solBalance + solAmount
      } else if (side === 'buy') {
        // optimistic — refreshBalance will correct from RPC
        nextSol = Math.max(0, s.wallet.solBalance - solAmount)
      }
      return {
        wallet: {
          ...s.wallet,
          holdings,
          costBasis,
          solBalance: nextSol,
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
        // Personal mode keeps virtual bankroll; real chain overwrites via setSolBalance
        solBalance: PERSONAL_MODE
          ? connected
            ? Math.max(s.wallet.solBalance, PERSONAL_START_SOL * 0.25)
            : s.wallet.solBalance
          : connected
            ? s.wallet.solBalance
            : 0,
      },
      walletModalOpen: false,
    })),

  setSolBalance: (bal) =>
    set((s) => {
      // Don't let a failed RPC wipe virtual demo bankroll
      const isDemo =
        !s.wallet.address ||
        s.wallet.address === 'personal_trader' ||
        s.wallet.address.startsWith('personal')
      if (PERSONAL_MODE && isDemo && bal === 0 && s.wallet.solBalance > 0) return s
      return { wallet: { ...s.wallet, solBalance: bal } }
    }),

  enterPersonalSession: () =>
    set((s) => ({
      wallet: {
        ...s.wallet,
        connected: true,
        address: s.wallet.address || 'personal_trader',
        solBalance:
          s.wallet.solBalance > 0 ? s.wallet.solBalance : PERSONAL_START_SOL,
      },
      walletModalOpen: false,
      botLog: [
        `${new Date().toISOString()} · personal session · ${PERSONAL_START_SOL} virtual SOL · zero gas`,
        ...s.botLog,
      ].slice(0, 100),
    })),

  executeTrade: (tokenId, side, amount, walletOverride, isSim = false, signature) => {
    const state = get()
    const token = state.tokens.find((t) => t.id === tokenId)
    if (!token) return { ok: false, error: 'Token not found' }
    if (token.complete) return { ok: false, error: 'Graduated — trade on Raydium' }
    // Past 2×: buys OK, sells locked until coin vanishes at 24h
    if (side === 'sell' && isSellLocked(token)) {
      return {
        ok: false,
        error: `SELL LOCKED — coin is past 2×. You can still buy. Coin vanishes in 24h.`,
      }
    }

    const wallet =
      walletOverride ||
      state.wallet.address ||
      (isSim ? randomWallet() : null)
    if (!wallet) return { ok: false, error: 'Connect wallet' }

    const managed = isManagedToken(token)
    const reserves = reservesFromToken(token)
    const launchPx = token.launchPriceSol || token.priceSol || 1e-12

    if (side === 'buy') {
      if (!isSim && amount > state.wallet.solBalance + 0.0001 && !signature) {
        return {
          ok: false,
          error: PERSONAL_MODE ? 'Insufficient virtual SOL' : 'Insufficient SOL',
        }
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

        const mult = multipleFromLaunch(launchPx, newPrice)
        const now = Date.now()
        // Past 2× → sell-lock arms, 24h timer to vanish (buys still work)
        const justArmed =
          managed && !token.jackpotArmed && !token.jackpotFrozen && mult > JACKPOT_ARM_X
        const stayArmed = justArmed || token.jackpotArmed || token.jackpotFrozen

        return {
          tokens: s.tokens.map((t) =>
            t.id !== tokenId
              ? t
              : {
                  ...t,
                  launchPriceSol: t.launchPriceSol ?? launchPx,
                  launchMcapUsd: t.launchMcapUsd ?? t.marketCapUsd,
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
                  lastTradeAt: now,
                  complete: graduated || t.complete,
                  shake: 'buy' as const,
                  candles: applyTradeToCandles(t.candles, newPrice, 'buy'),
                  holders: managed && !isSim ? holders.slice(0, 20) : t.holders,
                  change24h: t.change24h + (Math.random() * 0.4 - 0.05),
                  jackpotMultiple: mult,
                  ...(stayArmed
                    ? {
                        jackpotArmed: true,
                        jackpotFrozen: true, // sell-lock flag for UI
                        jackpotArmedAt: t.jackpotArmedAt || now,
                        jackpotAt: t.jackpotAt || now,
                        jackpotUnlockAt: t.jackpotUnlockAt || now + JACKPOT_FREEZE_MS,
                      }
                    : {}),
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
          jackpotToast: justArmed
            ? {
                symbol: token.symbol,
                multiple: mult,
                id: tokenId,
                kind: 'armed',
              }
            : s.jackpotToast,
          botLog: justArmed
            ? [
                `${new Date().toISOString()} · 🚀 $${token.symbol} >2× · BUY ONLY · sells locked · vanishes in 24h`,
                ...s.botLog,
              ].slice(0, 100)
            : s.botLog,
        }
      })

      window.setTimeout(() => get().clearShake(tokenId), 700)

      const after = get().tokens.find((t) => t.id === tokenId)
      // No human sell-reaction dumps once sell-locked
      if (
        !isSim &&
        managed &&
        amount >= 0.05 &&
        after &&
        !isSellLocked(after)
      ) {
        window.setTimeout(() => get().scheduleHumanReaction(tokenId, amount), 400)
      }

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
    const sellMult = multipleFromLaunch(launchPx, newPrice)
    const nowSell = Date.now()
    // Sells don't count toward 10 SOL; arm only on price >2×
    const justArmedSell =
      managed && !token.jackpotArmed && !token.jackpotFrozen && sellMult > JACKPOT_ARM_X

    const trade: Trade = {
      id: tradeSig,
      tokenId,
      side: 'sell',
      solAmount: solOut,
      tokenAmount: amount,
      wallet,
      marketCapUsd: newMcap,
      priceSol: newPrice,
      createdAt: nowSell,
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
                launchPriceSol: t.launchPriceSol ?? launchPx,
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
                lastTradeAt: nowSell,
                shake: 'sell' as const,
                candles: applyTradeToCandles(t.candles, newPrice, 'sell'),
                holders: managed && !isSim ? holders.slice(0, 20) : t.holders,
                change24h: t.change24h - Math.random() * 0.35,
                jackpotMultiple: sellMult,
                ...(justArmedSell || t.jackpotArmed
                  ? {
                      jackpotArmed: true,
                      jackpotArmedAt: t.jackpotArmedAt || nowSell,
                    }
                  : {}),
              },
        ),
        trades: [trade, ...s.trades].slice(0, 500),
        tickerTrades: [trade, ...s.tickerTrades].slice(0, 20),
        wallet: {
          ...s.wallet,
          holdings,
          costBasis,
          solBalance:
            !isSim &&
            s.wallet.address === wallet &&
            (PERSONAL_MODE || !managed || !!signature)
              ? s.wallet.solBalance + solOut
              : s.wallet.solBalance,
        },
        jackpotToast: justArmedSell
          ? {
              symbol: token.symbol,
              multiple: sellMult,
              id: tokenId,
              kind: 'armed',
            }
          : s.jackpotToast,
        botLog: justArmedSell
          ? [
              `${new Date().toISOString()} · 🚀 $${token.symbol} >2× ARMED · freeze after ${JACKPOT_USER_SOL_MIN} real SOL`,
              ...s.botLog,
            ].slice(0, 100)
          : s.botLog,
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

  purgeExpiredJackpots: () => {
    const s = get()
    const doomed = s.tokens.filter(shouldJackpotVanish)
    if (doomed.length === 0) return
    const doomedIds = new Set(doomed.map((t) => t.id))
    const holdings = { ...s.wallet.holdings }
    const costBasis = { ...s.wallet.costBasis }
    for (const id of doomedIds) {
      delete holdings[id]
      delete costBasis[id]
    }
    saveWalletLedger(holdings, costBasis)
    const names = doomed.map((t) => `$${t.symbol}`).join(', ')
    set({
      tokens: s.tokens.filter((t) => !doomedIds.has(t.id)),
      trades: s.trades.filter((tr) => !doomedIds.has(tr.tokenId)),
      wallet: { ...s.wallet, holdings, costBasis },
      botLog: [
        `${new Date().toISOString()} · 💀 coin vanished after 24h: ${names}`,
        ...s.botLog,
      ].slice(0, 100),
    })
  },

  createToken: (input) => {
    const state = get()
    if (!state.wallet.connected || !state.wallet.address) {
      if (PERSONAL_MODE) get().enterPersonalSession()
      else return null
    }
    const addr = get().wallet.address || 'personal_trader'
    const id = `user_${Date.now().toString(36)}`
    const symbol = input.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    const emoji = input.emoji || tokenEmoji(id + symbol)
    const mcap = marketCapUsd(VIRTUAL_SOL, VIRTUAL_TOKENS)
    const createFee = PERSONAL_MODE ? 0 : CREATE_FEE_SOL
    const token: Token = {
      id,
      name: input.name.trim(),
      symbol,
      emoji,
      description: input.description || `${input.name.trim()} launched on the curve.`,
      imageUrl:
        input.imageUrl && /^https?:\/\//i.test(input.imageUrl)
          ? input.imageUrl
          : realTokenImageUrl(id + symbol),
      imageHue: Math.random() * 360,
      creator: addr,
      creatorName: shortCreator(addr),
      virtualSol: VIRTUAL_SOL,
      virtualTokens: VIRTUAL_TOKENS,
      realSol: createFee,
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
      candles: seedCandles(mcap, 20),
      holders: [
        {
          wallet: 'bonding-curve',
          amount: REAL_TOKEN_RESERVES * 0.8,
          pct: 80,
          isCurve: true,
        },
        {
          wallet: addr,
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
        solBalance: Math.max(0, s.wallet.solBalance - createFee),
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
    // Lightweight ambient noise; real volume comes from traderTick
    const { tokens, executeTrade } = get()
    const pool = tokens.filter(
      (t) =>
        !t.complete &&
        (t.managed || t.source === 'bot' || t.source === 'local') &&
        t.source !== 'dexscreener',
    )
    if (pool.length === 0) return
    if (Math.random() > 0.55) return
    const t = pool[(Math.random() * Math.min(12, pool.length)) | 0]
    if (!t) return
    // Only buys (sells may be locked past 2×)
    executeTrade(t.id, 'buy', 0.02 + Math.random() * 0.08, randomWallet(), true)
  },

  traderTick: () => {
    const state = get()
    const pool = state.tokens.filter(
      (t) =>
        !t.complete &&
        (t.managed || t.source === 'bot' || t.source === 'local') &&
        t.source !== 'dexscreener',
    )
    if (pool.length === 0) return

    // Armed >2× coins get heavy bot hype until real users fill 10 SOL
    const armed = pool.filter((t) => t.jackpotArmed)
    const hot = pool.slice(0, Math.min(28, pool.length))
    let fleet = state.traderFleet.map((t) => ({
      ...t,
      bags: { ...t.bags },
      persona: { ...t.persona },
    }))

    // Extra hype actions on armed coins (buy-biased)
    if (armed.length > 0) {
      const hypeN = 4 + ((Math.random() * 6) | 0)
      for (let i = 0; i < hypeN; i++) {
        const token = armed[(Math.random() * armed.length) | 0]
        const idx = (Math.random() * fleet.length) | 0
        let trader = fleet[idx]
        const sol = Math.min(0.05 + Math.random() * 0.45, trader.sol)
        if (sol < 0.03) continue
        const tapeName = trader.displayName || trader.persona.name
        // Armed coins: buy-only hype (no sells)
        const res = get().executeTrade(token.id, 'buy', sol, tapeName, true)
        if (res.ok && res.tokensOut) {
          trader.sol -= sol
          const prev = trader.bags[token.id]
          trader.bags[token.id] = {
            tokens: (prev?.tokens || 0) + res.tokensOut,
            costSol: (prev?.costSol || 0) + sol,
            boughtAt: prev?.boughtAt || Date.now(),
          }
          fleet[idx] = rotateDisplayName(trader)
        }
      }
    }

    // Normal board tape
    const actions = 6 + ((Math.random() * 7) | 0)
    for (let i = 0; i < actions; i++) {
      const idx = (Math.random() * fleet.length) | 0
      let trader = fleet[idx]
      // Prefer hyping armed coins half the time
      const token =
        armed.length && Math.random() < 0.55
          ? armed[(Math.random() * armed.length) | 0]
          : hot[(Math.random() * hot.length) | 0]
      if (!token) continue
      const age = Date.now() - token.createdAt
      let side = decideSide(trader, token.id, age)
      // Past 2×: sell locked — force buys only
      if (isSellLocked(token)) side = 'buy'
      else if (token.jackpotArmed && Math.random() < 0.75) side = 'buy'
      if (side === 'skip') continue

      const tapeName = trader.displayName || trader.persona.name

      if (side === 'buy') {
        const sol = Math.min(tradeSize(trader.persona), trader.sol)
        if (sol < 0.02) continue
        const res = get().executeTrade(token.id, 'buy', sol, tapeName, true)
        if (!res.ok || !res.tokensOut) continue
        trader.sol -= sol
        const prev = trader.bags[token.id]
        trader.bags[token.id] = {
          tokens: (prev?.tokens || 0) + res.tokensOut,
          costSol: (prev?.costSol || 0) + sol,
          boughtAt: prev?.boughtAt || Date.now(),
        }
        trader = rotateDisplayName(trader)
        fleet[idx] = trader
      } else {
        const tokensToSell = sellFraction(trader, token.id)
        if (tokensToSell <= 1) continue
        const res = get().executeTrade(token.id, 'sell', tokensToSell, tapeName, true)
        if (!res.ok) continue
        const bag = trader.bags[token.id]
        if (bag) {
          const ratio = tokensToSell / Math.max(bag.tokens, 1e-12)
          bag.tokens = Math.max(0, bag.tokens - tokensToSell)
          bag.costSol = Math.max(0, bag.costSol * (1 - ratio))
          trader.sol += res.solOut || 0
          if (bag.tokens < 1) delete trader.bags[token.id]
        }
        trader = rotateDisplayName(trader)
        fleet[idx] = trader
      }
    }

    for (const t of fleet) {
      if (t.sol < t.persona.sizeMin) {
        t.sol = Math.min(t.persona.bankroll, t.sol + t.persona.bankroll * 0.4)
      }
    }

    set({ traderFleet: fleet })
  },

  scheduleHumanReaction: (tokenId, userSolIn) => {
    const steps = planHumanSellSequence(userSolIn)
    const actors = pickActors(get().traderFleet, 4 + ((Math.random() * 5) | 0))

    get().pushBotLog(
      `human-like reaction on ${tokenId.slice(0, 10)}… · ${steps.length} steps · ${actors.length} usernames`,
    )

    // Ensure some bots already hold inventory (pre-buy) so sells look natural
    for (const ai of actors.slice(0, 3)) {
      const fleet = get().traderFleet
      const t = fleet[ai]
      if (!t) continue
      const sol = 0.08 + Math.random() * Math.min(0.8, userSolIn * 0.4)
      const name = t.displayName || t.persona.name
      const res = get().executeTrade(tokenId, 'buy', sol, name, true)
      if (res.ok && res.tokensOut) {
        const next = [...get().traderFleet]
        const tr = { ...next[ai], bags: { ...next[ai].bags } }
        tr.sol = Math.max(0, tr.sol - sol)
        const prev = tr.bags[tokenId]
        tr.bags[tokenId] = {
          tokens: (prev?.tokens || 0) + res.tokensOut,
          costSol: (prev?.costSol || 0) + sol,
          boughtAt: Date.now(),
        }
        next[ai] = rotateDisplayName(tr)
        set({ traderFleet: next })
      }
    }

    for (const step of steps) {
      window.setTimeout(() => {
        const fleet = get().traderFleet
        const token = get().tokens.find((x) => x.id === tokenId)
        if (!token || token.complete) return

        const ai = actors[(Math.random() * actors.length) | 0]
        let tr = fleet[ai]
        if (!tr) return
        const name = tr.displayName || tr.persona.name

        if (step.preBuySol && step.preBuySol > 0) {
          const res = get().executeTrade(tokenId, 'buy', step.preBuySol, name, true)
          if (res.ok && res.tokensOut) {
            const next = [...get().traderFleet]
            tr = { ...next[ai], bags: { ...next[ai].bags } }
            tr.sol = Math.max(0, tr.sol - step.preBuySol)
            const prev = tr.bags[tokenId]
            tr.bags[tokenId] = {
              tokens: (prev?.tokens || 0) + res.tokensOut,
              costSol: (prev?.costSol || 0) + step.preBuySol,
              boughtAt: prev?.boughtAt || Date.now(),
            }
            next[ai] = rotateDisplayName(tr)
            set({ traderFleet: next })
          }
          return
        }

        if (step.sellFrac <= 0) return
        tr = get().traderFleet[ai]
        if (!tr) return
        const bag = tr.bags[tokenId]
        // If no bag, sell a small synthetic slice of curve for tape pressure
        const amount = bag
          ? bag.tokens * step.sellFrac
          : Math.min(token.virtualTokens * 0.0004 * step.sellFrac, 80_000)
        if (amount <= 1) return
        const res = get().executeTrade(
          tokenId,
          'sell',
          amount,
          tr.displayName || tr.persona.name,
          true,
        )
        if (!res.ok) return
        const next = [...get().traderFleet]
        tr = { ...next[ai], bags: { ...next[ai].bags } }
        if (tr.bags[tokenId]) {
          const b = tr.bags[tokenId]
          const ratio = amount / Math.max(b.tokens, 1e-12)
          b.tokens = Math.max(0, b.tokens - amount)
          b.costSol = Math.max(0, b.costSol * (1 - ratio))
          tr.sol += res.solOut || 0
          if (b.tokens < 1) delete tr.bags[tokenId]
        }
        next[ai] = rotateDisplayName(tr)
        set({ traderFleet: next })
      }, step.delayMs)
    }
  },

  clearShake: (tokenId) =>
    set((s) => ({
      tokens: s.tokens.map((t) =>
        t.id === tokenId ? { ...t, shake: null } : t,
      ),
    })),
}))
