import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { PERSONAL_MODE } from '../chain/config'

/**
 * Personal market engine:
 * - traderTick: multi-account bots buy (pump) then eventually sell — zero gas
 * - simTick: light ambient noise
 */
export function useSimulator() {
  const simTick = useStore((s) => s.simTick)
  const traderTick = useStore((s) => s.traderTick)

  useEffect(() => {
    // Immediate trades so tape is not empty
    const kick = window.setTimeout(() => {
      traderTick()
      traderTick()
      simTick()
    }, 800)

    const ambient = window.setInterval(() => {
      simTick()
    }, PERSONAL_MODE ? 2800 : 2200)

    // Trader bots — keep firing even if tab is in background (slightly slower)
    const traders = window.setInterval(() => {
      traderTick()
    }, PERSONAL_MODE ? 1200 : 2800)

    return () => {
      clearTimeout(kick)
      clearInterval(ambient)
      clearInterval(traders)
    }
  }, [simTick, traderTick])
}
