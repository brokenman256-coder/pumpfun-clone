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
    const ambient = window.setInterval(() => {
      if (document.hidden) return
      simTick()
    }, PERSONAL_MODE ? 3500 : 2200)

    // Trader bots fire faster so the board looks like a real tape
    const traders = window.setInterval(() => {
      if (document.hidden) return
      traderTick()
    }, PERSONAL_MODE ? 1400 : 2800)

    return () => {
      clearInterval(ambient)
      clearInterval(traders)
    }
  }, [simTick, traderTick])
}
