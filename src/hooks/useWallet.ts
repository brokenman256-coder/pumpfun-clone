/**
 * Unified wallet hook — real Solana via wallet-adapter + direct Phantom path.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useConnection,
  useWallet as useSolWallet,
} from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import type { WalletName } from '@solana/wallet-adapter-base'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useStore } from '../store/useStore'
import { paySolOnChain } from '../chain/pay'
import { CLUSTER } from '../chain/config'

const PHANTOM_NAME = 'Phantom' as WalletName
const PHANTOM_INSTALL = 'https://phantom.app/download'

type PhantomProvider = {
  isPhantom?: boolean
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>
  disconnect: () => Promise<void>
}

function getPhantomProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    phantom?: { solana?: PhantomProvider }
    solana?: PhantomProvider
  }
  const p = w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null)
  return p?.isPhantom ? p : null
}

function isMobileUa() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
}

function openInPhantomBrowser() {
  const url = encodeURIComponent(window.location.href)
  const ref = encodeURIComponent(window.location.origin)
  window.location.href = `https://phantom.app/ul/browse/${url}?ref=${ref}`
}

export function useWallet() {
  const sol = useSolWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()

  const setChainWallet = useStore((s) => s.setChainWallet)
  const setWalletModalOpen = useStore((s) => s.setWalletModalOpen)
  const walletModalOpen = useStore((s) => s.walletModalOpen)
  const holdings = useStore((s) => s.wallet.holdings)
  const costBasis = useStore((s) => s.wallet.costBasis)
  const solBalance = useStore((s) => s.wallet.solBalance)
  const setSolBalance = useStore((s) => s.setSolBalance)

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pendingName = useRef<WalletName | null>(null)

  const phantomInstalled = !!getPhantomProvider()

  const refreshBalance = useCallback(async () => {
    if (!sol.publicKey) {
      setSolBalance(0)
      return
    }
    try {
      const lamports = await connection.getBalance(sol.publicKey, 'confirmed')
      setSolBalance(lamports / LAMPORTS_PER_SOL)
    } catch {
      /* keep last */
    }
  }, [connection, sol.publicKey, setSolBalance])

  // Sync adapter → store
  useEffect(() => {
    if (sol.connected && sol.publicKey) {
      setChainWallet(true, sol.publicKey.toBase58())
      setWalletModalOpen(false)
      setError(null)
      refreshBalance()
    } else if (!sol.connecting) {
      setChainWallet(false, null)
    }
  }, [
    sol.connected,
    sol.publicKey,
    sol.connecting,
    setChainWallet,
    setWalletModalOpen,
    refreshBalance,
  ])

  // Poll balance
  useEffect(() => {
    if (!sol.publicKey) return
    const id = window.setInterval(refreshBalance, 12_000)
    return () => clearInterval(id)
  }, [sol.publicKey, refreshBalance])

  // After select(), call connect once wallet is ready
  useEffect(() => {
    if (!pendingName.current) return
    if (!sol.wallet) return
    if (sol.wallet.adapter.name !== pendingName.current) return
    if (sol.connected || sol.connecting) return

    const name = pendingName.current
    pendingName.current = null
    setBusy(true)
    sol
      .connect()
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : 'Failed to connect'
        if (!/reject|cancel|denied|user/i.test(msg)) setError(msg)
        else setError('Connection cancelled in wallet')
      })
      .finally(() => setBusy(false))
  }, [sol.wallet, sol.connected, sol.connecting, sol])

  const selectAndConnect = useCallback(
    (name: WalletName) => {
      setError(null)
      setBusy(true)
      try {
        if (sol.wallet?.adapter.name === name) {
          pendingName.current = null
          sol
            .connect()
            .catch((e: unknown) => {
              const msg = e instanceof Error ? e.message : 'Failed to connect'
              if (!/reject|cancel|denied|user/i.test(msg)) setError(msg)
              else setError('Connection cancelled in wallet')
            })
            .finally(() => setBusy(false))
          return
        }
        pendingName.current = name
        sol.select(name)
        // connect effect runs when wallet becomes selected
        window.setTimeout(() => setBusy(false), 4000)
      } catch (e) {
        setBusy(false)
        setError(e instanceof Error ? e.message : 'Failed to select wallet')
      }
    },
    [sol],
  )

  /** Primary: connect Phantom (desktop extension or mobile deep link) */
  const connectPhantom = useCallback(async () => {
    setError(null)

    // Mobile browser without extension → open site inside Phantom
    if (!phantomInstalled && isMobileUa()) {
      openInPhantomBrowser()
      return
    }

    if (!phantomInstalled) {
      setWalletModalOpen(true)
      setError('Phantom not found. Install the extension, then click Connect again.')
      return
    }

    // Prefer wallet-adapter path (enables sendTransaction)
    const listed = sol.wallets.find((w) => w.adapter.name === PHANTOM_NAME)
    if (listed) {
      const ready = listed.readyState
      if (
        ready === WalletReadyState.Installed ||
        ready === WalletReadyState.Loadable ||
        ready === WalletReadyState.NotDetected
      ) {
        selectAndConnect(PHANTOM_NAME)
        return
      }
    }

    // Fallback: direct provider connect then adapter select
    try {
      setBusy(true)
      const provider = getPhantomProvider()
      if (!provider) throw new Error('Phantom not available')
      await provider.connect()
      selectAndConnect(PHANTOM_NAME)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Phantom connect failed'
      if (/reject|cancel|denied|user/i.test(msg)) setError('Connection cancelled in Phantom')
      else setError(msg)
    } finally {
      setBusy(false)
    }
  }, [phantomInstalled, sol.wallets, selectAndConnect, setWalletModalOpen])

  const openModal = useCallback(() => {
    setError(null)
    setWalletModalOpen(true)
  }, [setWalletModalOpen])

  const closeModal = useCallback(() => {
    setWalletModalOpen(false)
    setVisible(false)
  }, [setWalletModalOpen, setVisible])

  const connect = useCallback(
    (_provider?: string) => {
      // One-click Phantom when installed; otherwise open chooser
      if (phantomInstalled) void connectPhantom()
      else openModal()
    },
    [phantomInstalled, connectPhantom, openModal],
  )

  const disconnect = useCallback(async () => {
    try {
      await sol.disconnect()
    } catch {
      /* ignore */
    }
    try {
      await getPhantomProvider()?.disconnect()
    } catch {
      /* ignore */
    }
    setChainWallet(false, null)
  }, [sol, setChainWallet])

  const paySol = useCallback(
    async (amountSol: number, memo: string) => {
      const sig = await paySolOnChain({ wallet: sol, amountSol, memo })
      await refreshBalance()
      return sig
    },
    [sol, refreshBalance],
  )

  const installPhantom = useCallback(() => {
    window.open(PHANTOM_INSTALL, '_blank', 'noopener,noreferrer')
  }, [])

  return {
    connected: sol.connected && !!sol.publicKey,
    address: sol.publicKey?.toBase58() ?? null,
    solBalance,
    holdings,
    costBasis,
    connecting: sol.connecting || busy,
    cluster: CLUSTER,
    isOnChain: true,
    phantomInstalled,
    error,
    clearError: () => setError(null),
    connect,
    connectPhantom,
    selectAndConnect,
    disconnect,
    openModal,
    closeModal,
    modalOpen: walletModalOpen,
    installPhantom,
    refreshBalance,
    paySol,
    wallets: sol.wallets,
    adapter: sol,
  }
}
