import { useCallback, useEffect, useRef, useState } from 'react'
import { useConnection, useWallet as useSolWallet } from '@solana/wallet-adapter-react'
import type { WalletName } from '@solana/wallet-adapter-base'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useStore } from '../store/useStore'
import { paySolOnChain } from '../chain/pay'
import { CLUSTER, PERSONAL_MODE, PERSONAL_START_SOL } from '../chain/config'

const PHANTOM = 'Phantom' as WalletName
const INSTALL = 'https://phantom.app/download'

type PhantomProvider = {
  isPhantom?: boolean
  connect: () => Promise<{ publicKey: { toString(): string } }>
  disconnect: () => Promise<void>
}

function getPhantom(): PhantomProvider | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    phantom?: { solana?: PhantomProvider }
    solana?: PhantomProvider
  }
  const p = w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null)
  return p?.isPhantom ? p : null
}

function isMobile() {
  return typeof navigator !== 'undefined' && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)
}

export function useWallet() {
  const sol = useSolWallet()
  const { connection } = useConnection()
  const setChainWallet = useStore((s) => s.setChainWallet)
  const setWalletModalOpen = useStore((s) => s.setWalletModalOpen)
  const walletModalOpen = useStore((s) => s.walletModalOpen)
  const holdings = useStore((s) => s.wallet.holdings)
  const costBasis = useStore((s) => s.wallet.costBasis)
  const solBalance = useStore((s) => s.wallet.solBalance)
  const setSolBalance = useStore((s) => s.setSolBalance)
  const enterPersonalSession = useStore((s) => s.enterPersonalSession)
  const storeConnected = useStore((s) => s.wallet.connected)
  const storeAddress = useStore((s) => s.wallet.address)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pending = useRef<WalletName | null>(null)
  const phantomInstalled = !!getPhantom()

  /** Real Phantom session → real SOL trades */
  const isRealTrader = !!(sol.connected && sol.publicKey)

  const refreshBalance = useCallback(async () => {
    if (!sol.publicKey) {
      // Demo / personal session keeps virtual bankroll
      if (PERSONAL_MODE && storeConnected && !isRealTrader) {
        return
      }
      return
    }
    try {
      const lamports = await connection.getBalance(sol.publicKey, 'confirmed')
      setSolBalance(lamports / LAMPORTS_PER_SOL)
    } catch {
      /* keep last */
    }
  }, [connection, sol.publicKey, setSolBalance, storeConnected, isRealTrader])

  // Phantom connect / disconnect
  useEffect(() => {
    if (sol.connected && sol.publicKey) {
      setChainWallet(true, sol.publicKey.toBase58())
      setWalletModalOpen(false)
      setError(null)
      void refreshBalance()
      return
    }
    if (sol.connecting) return
    // Phantom disconnected
    if (PERSONAL_MODE) {
      const wasPhantom =
        storeAddress &&
        storeAddress !== 'personal_trader' &&
        !storeAddress.startsWith('personal')
      if (wasPhantom || !storeConnected) {
        enterPersonalSession()
      }
    } else {
      setChainWallet(false, null)
    }
  }, [
    sol.connected,
    sol.publicKey,
    sol.connecting,
    setChainWallet,
    setWalletModalOpen,
    refreshBalance,
    storeConnected,
    storeAddress,
    enterPersonalSession,
  ])

  // Auto demo session so board is usable before Phantom
  useEffect(() => {
    if (PERSONAL_MODE && !storeConnected && !sol.connected) {
      enterPersonalSession()
    }
  }, [storeConnected, sol.connected, enterPersonalSession])

  useEffect(() => {
    if (!sol.publicKey) return
    const id = window.setInterval(refreshBalance, 12_000)
    return () => clearInterval(id)
  }, [sol.publicKey, refreshBalance])

  useEffect(() => {
    if (!pending.current || !sol.wallet) return
    if (sol.wallet.adapter.name !== pending.current) return
    if (sol.connected || sol.connecting) return
    pending.current = null
    setBusy(true)
    sol
      .connect()
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Failed to connect'
        setError(/reject|cancel|denied|user/i.test(msg) ? 'Cancelled in wallet' : msg)
      })
      .finally(() => setBusy(false))
  }, [sol.wallet, sol.connected, sol.connecting, sol])

  const selectAndConnect = useCallback(
    (name: WalletName) => {
      setError(null)
      setBusy(true)
      if (sol.wallet?.adapter.name === name) {
        pending.current = null
        sol
          .connect()
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : 'Failed'
            setError(/reject|cancel|denied|user/i.test(msg) ? 'Cancelled in wallet' : msg)
          })
          .finally(() => setBusy(false))
        return
      }
      pending.current = name
      sol.select(name)
      window.setTimeout(() => setBusy(false), 5000)
    },
    [sol],
  )

  const connectPhantom = useCallback(async () => {
    setError(null)
    if (!phantomInstalled && isMobile()) {
      const url = encodeURIComponent(window.location.href)
      const ref = encodeURIComponent(window.location.origin)
      window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`
      return
    }
    if (!phantomInstalled) {
      setWalletModalOpen(true)
      setError('Phantom not found. Install the extension, then try again.')
      return
    }
    const listed = sol.wallets.find((w) => w.adapter.name === PHANTOM)
    if (listed) {
      const r = listed.readyState
      if (
        r === WalletReadyState.Installed ||
        r === WalletReadyState.Loadable ||
        r === WalletReadyState.NotDetected
      ) {
        selectAndConnect(PHANTOM)
        return
      }
    }
    try {
      setBusy(true)
      await getPhantom()?.connect()
      selectAndConnect(PHANTOM)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connect failed'
      setError(/reject|cancel|denied|user/i.test(msg) ? 'Cancelled in Phantom' : msg)
    } finally {
      setBusy(false)
    }
  }, [phantomInstalled, sol.wallets, selectAndConnect, setWalletModalOpen])

  const openModal = useCallback(() => {
    setError(null)
    setWalletModalOpen(true)
  }, [setWalletModalOpen])

  const closeModal = useCallback(() => setWalletModalOpen(false), [setWalletModalOpen])

  const disconnect = useCallback(async () => {
    try {
      await sol.disconnect()
    } catch {
      /* */
    }
    try {
      await getPhantom()?.disconnect()
    } catch {
      /* */
    }
    if (PERSONAL_MODE) {
      enterPersonalSession()
    } else {
      setChainWallet(false, null)
    }
  }, [sol, setChainWallet, enterPersonalSession])

  const paySol = useCallback(
    async (amountSol: number, memo: string) => {
      if (!sol.publicKey || !sol.sendTransaction) {
        throw new Error('Connect Phantom to trade with real SOL')
      }
      const s = await paySolOnChain({ wallet: sol, amountSol, memo })
      await refreshBalance()
      return s
    },
    [sol, refreshBalance],
  )

  const connectPersonal = useCallback(() => {
    enterPersonalSession()
    setError(null)
  }, [enterPersonalSession])

  return {
    connected: isRealTrader || storeConnected,
    /** True when Phantom is live — real SOL path */
    isRealTrader,
    address: isRealTrader
      ? sol.publicKey!.toBase58()
      : storeAddress,
    solBalance: isRealTrader
      ? solBalance
      : PERSONAL_MODE
        ? solBalance || PERSONAL_START_SOL
        : solBalance,
    holdings,
    costBasis,
    connecting: sol.connecting || busy,
    cluster: CLUSTER,
    phantomInstalled,
    personalMode: PERSONAL_MODE && !isRealTrader,
    marketPersonal: PERSONAL_MODE,
    error,
    clearError: () => setError(null),
    connectPhantom,
    connectPersonal,
    selectAndConnect,
    disconnect,
    openModal,
    closeModal,
    modalOpen: walletModalOpen,
    installPhantom: () => window.open(INSTALL, '_blank', 'noopener,noreferrer'),
    refreshBalance,
    paySol,
    wallets: sol.wallets,
    adapter: sol,
  }
}
