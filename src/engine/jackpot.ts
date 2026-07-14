/**
 * Jackpot / freeze trap:
 * 1) Coin goes past 2× launch → ARMED (freeze button shoots up, bots hype)
 * 2) Real user puts ≥ 10 SOL into that coin → FREEZE (no transfers)
 * 3) After freeze window → coin completely disappears
 */

/** Arm hyping UI + bots when multiple exceeds this */
export const JACKPOT_ARM_X = 2

/** Real-user SOL required after arm before freeze */
export const JACKPOT_USER_SOL_MIN = 10

/** Freeze duration before coin vanishes */
export const JACKPOT_FREEZE_MS = 24 * 60 * 60 * 1000

// legacy aliases (unused trigger band)
export const JACKPOT_MIN_X = JACKPOT_ARM_X
export const JACKPOT_MAX_X = JACKPOT_ARM_X

export function multipleFromLaunch(launchPrice: number, currentPrice: number): number {
  if (!launchPrice || launchPrice <= 0) return 1
  return currentPrice / launchPrice
}

export function rollJackpotTriggerX(): number {
  return JACKPOT_ARM_X
}

export function isJackpotArmed(t: {
  jackpotArmed?: boolean
  jackpotFrozen?: boolean
  priceSol?: number
  launchPriceSol?: number
}): boolean {
  if (t.jackpotFrozen) return false
  if (t.jackpotArmed) return true
  const mult = multipleFromLaunch(t.launchPriceSol || 0, t.priceSol || 0)
  return mult > JACKPOT_ARM_X
}

export function isJackpotFrozen(t: {
  jackpotFrozen?: boolean
  jackpotUnlockAt?: number
}): boolean {
  if (!t.jackpotFrozen) return false
  if (t.jackpotUnlockAt && Date.now() >= t.jackpotUnlockAt) return false
  return true
}

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

/** Progress toward 10 SOL real-user bag for freeze */
export function freezeSolProgress(realUserSol: number): number {
  return Math.min(100, (realUserSol / JACKPOT_USER_SOL_MIN) * 100)
}
