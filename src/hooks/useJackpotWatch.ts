import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/** Every 15s: wipe jackpot coins whose 24h freeze ended. */
export function useJackpotWatch() {
  const purge = useStore((s) => s.purgeExpiredJackpots)

  useEffect(() => {
    purge()
    const id = window.setInterval(purge, 15_000)
    return () => clearInterval(id)
  }, [purge])
}
