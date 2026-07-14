import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { PERSONAL_MODE } from '../chain/config'

/**
 * Superior health system — keeps market bots, coin launches, candles,
 * and jackpot cleanup running so the site never "goes dead".
 */
export function useSystemSupervisor() {
  const botConfig = useStore((s) => s.botConfig)
  const setBotEnabled = useStore((s) => s.setBotEnabled)
  const botTick = useStore((s) => s.botTick)
  const traderTick = useStore((s) => s.traderTick)
  const purgeExpiredJackpots = useStore((s) => s.purgeExpiredJackpots)
  const pushBotLog = useStore((s) => s.pushBotLog)
  const tokens = useStore((s) => s.tokens)
  const ensureCandles = useStore((s) => s.ensureCandles)
  const lastTradeAt = useRef(Date.now())
  const lastTokenCount = useRef(0)

  // Watch store for trade activity
  useEffect(() => {
    const unsub = useStore.subscribe((s, prev) => {
      if (s.trades[0]?.id !== prev.trades[0]?.id) {
        lastTradeAt.current = Date.now()
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    // Always keep fleet armed in personal/live mode
    if (!botConfig.enabled) {
      setBotEnabled(true)
      pushBotLog('supervisor · re-armed coin fleet')
    }
  }, [botConfig.enabled, setBotEnabled, pushBotLog])

  useEffect(() => {
    const id = window.setInterval(() => {
      const s = useStore.getState()
      const now = Date.now()

      // 1) Jackpot cleanup
      s.purgeExpiredJackpots()

      // 2) Ensure candles on hottest coins (charts never empty)
      const hot = s.tokens
        .filter((t) => !t.complete)
        .sort((a, b) => b.volumeUsd - a.volumeUsd)
        .slice(0, 12)
      for (const t of hot) {
        if (!t.candles?.length) s.ensureCandles(t.id)
      }

      // 3) If no trades for 12s — force trader activity
      if (now - lastTradeAt.current > 12_000) {
        s.traderTick()
        s.traderTick()
        s.simTick()
        lastTradeAt.current = now
        s.pushBotLog('supervisor · forced market pulse (idle tape)')
      }

      // 4) If coin count stalled > 90s and fleet should launch — force botTick
      if (
        s.botConfig.enabled &&
        s.tokens.length === lastTokenCount.current &&
        s.botConfig.launched < s.botConfig.fleetSize
      ) {
        // check every cycle; if still same after extra delay we already pulse
      }
      if (s.tokens.length > lastTokenCount.current) {
        lastTokenCount.current = s.tokens.length
      } else if (
        PERSONAL_MODE &&
        s.botConfig.enabled &&
        now % 45_000 < 16_000
      ) {
        // occasional guarantee launch
        s.botTick()
      }

      // 5) Re-top dead trader fleet bankrolls (handled in traderTick, call it)
      if (s.traderFleet.every((t) => t.sol < 0.05)) {
        s.traderTick()
        s.pushBotLog('supervisor · refilled idle trader fleet')
      }
    }, 8_000)

    // Boot pulse
    const boot = window.setTimeout(() => {
      const s = useStore.getState()
      s.traderTick()
      s.botTick()
      s.pushBotLog('supervisor · online · market health watch active')
    }, 1500)

    return () => {
      clearInterval(id)
      clearTimeout(boot)
    }
  }, [
    botTick,
    traderTick,
    purgeExpiredJackpots,
    pushBotLog,
    tokens.length,
    ensureCandles,
  ])
}
