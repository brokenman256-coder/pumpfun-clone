import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { fetchLiveSolanaMemes } from '../lib/dexscreener'

const POLL_MS = 45_000
let pollStarted = false

/**
 * Polls DexScreener for latest Solana meme / new pairs and merges into the board.
 * Safe to call from multiple components — only one poll loop runs.
 */
export function useDexScreener() {
  const liveMode = useStore((s) => s.liveMode)
  const mergeDexTokens = useStore((s) => s.mergeDexTokens)
  const setDexStatus = useStore((s) => s.setDexStatus)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setDexStatus('loading')
    try {
      const { tokens } = await fetchLiveSolanaMemes()
      if (tokens.length === 0) {
        setDexStatus('error', 'No Solana pairs returned')
      } else {
        mergeDexTokens(tokens)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'DexScreener fetch failed'
      setDexStatus('error', msg)
      console.error('[dexscreener]', e)
    } finally {
      busy.current = false
    }
  }, [mergeDexTokens, setDexStatus])

  useEffect(() => {
    if (!liveMode) return
    // Single global poll loop
    if (pollStarted) return
    pollStarted = true
    void refresh()
    const id = window.setInterval(() => {
      if (document.hidden) return
      if (!useStore.getState().liveMode) return
      void refresh()
    }, POLL_MS)
    return () => {
      clearInterval(id)
      pollStarted = false
    }
  }, [liveMode, refresh])

  return { refresh }
}
