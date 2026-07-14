import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'

/**
 * Local backup fleet — only fills the board if the live API is unreachable.
 * Primary coin bot is useLiveBoard → POST /api/live-board every 30s.
 */
export function useLaunchBots() {
  const enabled = useStore((s) => s.botConfig.enabled)
  const liveSynced = useStore((s) => s.liveBoardSynced)
  const botTick = useStore((s) => s.botTick)
  const intervalMs = useStore((s) => s.botConfig.intervalMs)
  const booted = useRef(false)

  useEffect(() => {
    // When live board works, skip local-only spam (live bot is source of truth)
    if (!enabled || liveSynced) {
      booted.current = false
      return
    }

    if (!booted.current) {
      booted.current = true
      const warm = window.setTimeout(() => {
        if (!document.hidden) botTick()
      }, 4000)
      const id = window.setInterval(() => {
        if (document.hidden) return
        botTick()
      }, intervalMs)
      return () => {
        clearTimeout(warm)
        clearInterval(id)
      }
    }

    const id = window.setInterval(() => {
      if (document.hidden) return
      botTick()
    }, intervalMs)
    return () => clearInterval(id)
  }, [enabled, liveSynced, intervalMs, botTick])
}
