import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { fetchLiveBoard, launchLiveCoin } from '../lib/liveBoardApi'
import { PERSONAL_MODE } from '../chain/config'

/**
 * Shared live board sync — skipped in PERSONAL_MODE (everything is local,
 * free, and self-contained).
 */
export function useLiveBoard() {
  const mergeLiveBoard = useStore((s) => s.mergeLiveBoard)
  const setBotLog = useStore((s) => s.pushBotLog)
  const botEnabled = useStore((s) => s.botConfig.enabled)
  const intervalMs = useStore((s) => s.botConfig.intervalMs)
  const botTick = useStore((s) => s.botTick)
  const lastLaunch = useRef(0)

  // Personal mode: only local coin bot (no server / no gas)
  useEffect(() => {
    if (!PERSONAL_MODE || !botEnabled) return
    const warm = window.setTimeout(() => {
      if (!document.hidden) botTick()
    }, 2000)
    const id = window.setInterval(() => {
      if (document.hidden) return
      botTick()
    }, intervalMs)
    return () => {
      clearTimeout(warm)
      clearInterval(id)
    }
  }, [botEnabled, intervalMs, botTick])

  useEffect(() => {
    if (PERSONAL_MODE) return
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

  useEffect(() => {
    if (PERSONAL_MODE || !botEnabled) return

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

    const warm = window.setTimeout(() => void tick(), 3_000)
    const id = window.setInterval(() => void tick(), intervalMs)
    return () => {
      clearTimeout(warm)
      clearInterval(id)
    }
  }, [botEnabled, intervalMs, mergeLiveBoard, setBotLog])
}
