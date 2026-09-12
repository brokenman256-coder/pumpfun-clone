/**
 * Rising coin lock — DISABLED.
 *
 * This used to sell-lock a coin past 2x and delete it 24h later. That's
 * fine for a fake demo curve, but not once real wallets/SOL are involved:
 * it would trap a real user's real position and then destroy it outright.
 * The functions below are kept (many call sites reference them) but now
 * always report "not armed" so nothing is ever locked or vanished.
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

/** Disabled — always false, see file header. */
export function isJackpotArmed(_t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  return false
}

/** Disabled — always false, see file header. */
export function isJackpotFrozen(_t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  return false
}

/** Disabled — sells are never locked, see file header. */
export function isSellLocked(_t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  return false
}

/** Disabled — coins are never auto-deleted, see file header. */
export function shouldJackpotVanish(_t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
}): boolean {
  return false
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
