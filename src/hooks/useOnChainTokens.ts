import { useCallback, useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { fetchAllOnChainTokens } from '../chain/discoverTokens'
import { getConnection } from '../chain/launchpadClient'

const POLL_MS = 20_000
let pollStarted = false

/**
 * Polls the on-chain program for every bonding-curve token that exists
 * (created by any wallet, including the bot launcher) and merges it into
 * the board — so real coins show up for every visitor, not just whichever
 * browser session created them.
 */
export function useOnChainTokens() {
  const mergeOnChainTokens = useStore((s) => s.mergeOnChainTokens)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    try {
      const tokens = await fetchAllOnChainTokens(getConnection())
      if (tokens.length > 0) mergeOnChainTokens(tokens)
    } catch (e) {
      console.error('[on-chain tokens]', e)
    } finally {
      busy.current = false
    }
  }, [mergeOnChainTokens])

  useEffect(() => {
    if (pollStarted) return
    pollStarted = true
    void refresh()
    const id = window.setInterval(() => {
      if (document.hidden) return
      void refresh()
    }, POLL_MS)
    return () => {
      clearInterval(id)
      pollStarted = false
    }
  }, [refresh])

  return { refresh }
}
