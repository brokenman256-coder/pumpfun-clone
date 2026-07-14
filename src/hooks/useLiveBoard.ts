import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { fetchLiveBoard, launchLiveCoin } from '../lib/liveBoardApi'

/**
 * Syncs the shared live board (server bot coins + shared curves)
 * and keeps the coin-creation bot running every 30s via the API.
 */
export function useLiveBoard() {
  const mergeLiveBoard = useStore((s) => s.mergeLiveBoard)
  const setBotLog = useStore((s) => s.pushBotLog)
  const botEnabled = useStore((s) => s.botConfig.enabled)
  const intervalMs = useStore((s) => s.botConfig.intervalMs)
  const lastLaunch = useRef(0)

  // Poll shared board
  useEffect(() => {
    let cancelled = false
    async function pull() {
      const snap = await fetchLiveBoard()
      if (cancelled || !snap.ok) return
      mergeLiveBoard({
        tokens: snap.tokens || [],
        trades: snap.recentTrades || [],
        usedMemeUrls: snap.usedMemeUrls || [],
        launched: snap.launched,
      })
    }
    void pull()
    const id = window.setInterval(pull, 8_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [mergeLiveBoard])

  // Server-side coin bot (one unique meme every 30s)
  useEffect(() => {
    if (!botEnabled) return

    async function tick() {
      if (document.hidden) return
      const now = Date.now()
      if (now - lastLaunch.current < intervalMs - 500) return
      lastLaunch.current = now
      const res = await launchLiveCoin()
      if (res.ok && res.token) {
        setBotLog(
          `LIVE bot · $${res.token.symbol} · mcap $${Math.round(res.token.marketCapUsd).toLocaleString()}`,
        )
        // Immediate merge so board updates without waiting for poll
        const snap = await fetchLiveBoard()
        if (snap.ok) {
          mergeLiveBoard({
            tokens: snap.tokens || [],
            trades: snap.recentTrades || [],
            usedMemeUrls: snap.usedMemeUrls || [],
            launched: snap.launched,
          })
        }
      }
    }

    // First launch soon after load
    const warm = window.setTimeout(() => void tick(), 3_000)
    const id = window.setInterval(() => void tick(), intervalMs)
    return () => {
      clearTimeout(warm)
      clearInterval(id)
    }
  }, [botEnabled, intervalMs, mergeLiveBoard, setBotLog])
}
