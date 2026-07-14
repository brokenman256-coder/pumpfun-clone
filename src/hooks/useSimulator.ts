import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * Live board activity for managed coins — keeps charts, mcaps, and tickers
 * moving like a real order book without touching DexScreener / on-chain mints.
 */
export function useSimulator() {
  const simTick = useStore((s) => s.simTick)

  useEffect(() => {
    // ~2.2s cadence = lively but not chaotic
    const id = window.setInterval(() => {
      if (document.hidden) return
      simTick()
    }, 2200)
    return () => clearInterval(id)
  }, [simTick])
}
