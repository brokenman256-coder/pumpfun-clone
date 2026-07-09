import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Runs the admin-controlled launch fleet on interval */
export function useLaunchBots() {
  const enabled = useStore((s) => s.botConfig.enabled)
  const intervalMs = useStore((s) => s.botConfig.intervalMs)
  const botTick = useStore((s) => s.botTick)

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => {
      if (document.hidden) return
      botTick()
    }, intervalMs)
    return () => clearInterval(id)
  }, [enabled, intervalMs, botTick])
}
