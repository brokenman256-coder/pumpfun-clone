/**
 * Jackpot rule:
 * - When a coin hits 180×–200× from launch price → FREEZE all transfers 24h
 * - After 24h → coin is wiped from the board (disappears)
 */

export const JACKPOT_MIN_X = 180
export const JACKPOT_MAX_X = 200
export const JACKPOT_FREEZE_MS = 24 * 60 * 60 * 1000

export function multipleFromLaunch(launchPrice: number, currentPrice: number): number {
  if (!launchPrice || launchPrice <= 0) return 1
  return currentPrice / launchPrice
}

/** Random freeze trigger between 180x and 200x (inclusive band) */
export function rollJackpotTriggerX(): number {
  return JACKPOT_MIN_X + Math.random() * (JACKPOT_MAX_X - JACKPOT_MIN_X)
}

export function isJackpotFrozen(t: {
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
}): boolean {
  if (!t.jackpotFrozen) return false
  if (t.jackpotUnlockAt && Date.now() >= t.jackpotUnlockAt) return false
  return true
}

/** True when freeze window ended and coin should be deleted */
export function shouldJackpotVanish(t: {
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
}): boolean {
  return Boolean(t.jackpotFrozen && t.jackpotUnlockAt && Date.now() >= t.jackpotUnlockAt)
}

export function formatJackpotCountdown(unlockAt: number): string {
  const ms = Math.max(0, unlockAt - Date.now())
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}
