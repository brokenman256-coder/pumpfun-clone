import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * Background mock engine:
 * - random trades every 0.6–2.2s (busy board)
 * - also spawns new coin launches inside simTick (~18%)
 */
export function useSimulator() {
  const simTick = useStore((s) => s.simTick)

  useEffect(() => {
    let timer: number
    const schedule = () => {
      const delay = 600 + Math.random() * 1600
      timer = window.setTimeout(() => {
        // burst: sometimes fire 2–3 ticks so board feels like pump.fun
        const bursts = Math.random() < 0.35 ? 2 + Math.floor(Math.random() * 2) : 1
        for (let i = 0; i < bursts; i++) simTick()
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [simTick])
}
