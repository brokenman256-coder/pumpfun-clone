import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Local board activity — only for non-DexScreener coins when live feed is off or sparse */
export function useSimulator() {
  const simTick = useStore((s) => s.simTick)
  const liveMode = useStore((s) => s.liveMode)
  const dexStatus = useStore((s) => s.dexStatus)

  useEffect(() => {
    // When DexScreener is live, slow down fake activity
    const ms = liveMode && dexStatus === 'ok' ? 8000 : 2200
    const id = window.setInterval(() => {
      if (document.hidden) return
      simTick()
    }, ms)
    return () => clearInterval(id)
  }, [simTick, liveMode, dexStatus])
}
