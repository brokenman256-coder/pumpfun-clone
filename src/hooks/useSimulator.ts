import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Live board activity — simulated trades + new launches */
export function useSimulator() {
  const simTick = useStore((s) => s.simTick)

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return
      simTick()
    }, 2200)
    return () => clearInterval(id)
  }, [simTick])
}
