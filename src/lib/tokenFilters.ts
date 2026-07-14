import type { Token } from '../types'

/** Same "is this a real coin" check the admin dashboard's Manage Tokens uses. */
export function isSimulated(t: Token) {
  return !(t.mint && t.curvePda) && t.source !== 'dexscreener'
}

/** Accept http(s) URLs and data-URI procedural meme art */
export function hasRealImage(t: Token) {
  if (!t.imageUrl) return false
  return /^(https?:\/\/|data:image\/)/i.test(t.imageUrl)
}

/** Board should show bot coins, local coins, and external ones with art */
export function isDisplayable(t: Token) {
  // Always show jackpot / managed bot coins even mid-freeze
  if (t.source === 'bot' || t.managed) return true
  return !isSimulated(t) || hasRealImage(t)
}
