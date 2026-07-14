/**
 * Rising coin lock:
 * - Past 2× launch → "FREEZE" button up, bots hype
 * - People can BUY but cannot SELL
 * - No SOL threshold
 * - 24h after lock → coin completely disappears
 */

/** Lock sells when multiple exceeds this */
export const JACKPOT_ARM_X = 2

/** How long buy-only lasts before coin vanishes */
export const JACKPOT_FREEZE_MS = 24 * 60 * 60 * 1000

export const JACKPOT_MIN_X = JACKPOT_ARM_X
export const JACKPOT_MAX_X = JACKPOT_ARM_X
/** @deprecated no longer used */
export const JACKPOT_USER_SOL_MIN = 0

export function multipleFromLaunch(launchPrice: number, currentPrice: number): number {
  if (!launchPrice || launchPrice <= 0) return 1
  return currentPrice / launchPrice
}

export function rollJackpotTriggerX(): number {
  return JACKPOT_ARM_X
}

/** Past 2× — sells locked, buys still open */
export function isJackpotArmed(t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  if (t.jackpotArmed || t.jackpotFrozen) return true
  const mult = multipleFromLaunch(t.launchPriceSol || 0, t.priceSol || 0)
  return mult > JACKPOT_ARM_X
}

/**
 * "Frozen" for UI = sell-locked rising coin (same as armed).
 * Buys still allowed until vanish.
 */
export function isJackpotFrozen(t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  // Sell lock while armed/frozen and timer not expired
  if (!isJackpotArmed(t) && !t.jackpotFrozen) return false
  if (t.jackpotUnlockAt && Date.now() >= t.jackpotUnlockAt) return false
  return Boolean(t.jackpotArmed || t.jackpotFrozen)
}

/** Sells blocked; buys OK */
export function isSellLocked(t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  return isJackpotFrozen(t)
}

/** After 24h lock window → delete coin */
export function shouldJackpotVanish(t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
}): boolean {
  if (!t.jackpotUnlockAt) return false
  if (!(t.jackpotArmed || t.jackpotFrozen)) return false
  return Date.now() >= t.jackpotUnlockAt
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

export function freezeSolProgress(_realUserSol: number): number {
  return 0
}
