import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { PERSONAL_MODE } from '../chain/config'

/**
 * Local coin fleet. In personal mode, useLiveBoard already runs botTick;
 * this stays as a quiet backup only when live board is off.
 */
export function useLaunchBots() {
  const enabled = useStore((s) => s.botConfig.enabled)
  const liveSynced = useStore((s) => s.liveBoardSynced)
  const botTick = useStore((s) => s.botTick)
  const intervalMs = useStore((s) => s.botConfig.intervalMs)
  const booted = useRef(false)

  useEffect(() => {
    // Personal: primary loop is in useLiveBoard
    if (PERSONAL_MODE) return
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
