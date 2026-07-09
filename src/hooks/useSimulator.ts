import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Background mock engine: random trades every 1–4s */
export function useSimulator() {
  const simTick = useStore((s) => s.simTick)

  useEffect(() => {
    let timer: number
    const schedule = () => {
      const delay = 1000 + Math.random() * 3000
      timer = window.setTimeout(() => {
        simTick()
        schedule()
      }, delay)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [simTick])
}
