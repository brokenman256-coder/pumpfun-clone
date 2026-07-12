import type { Token } from '../types'

/** Same "is this a real coin" check the admin dashboard's Manage Tokens uses. */
export function isSimulated(t: Token) {
  return !(t.mint && t.curvePda) && t.source !== 'dexscreener'
}

export function hasRealImage(t: Token) {
  return !!t.imageUrl && /^https?:\/\//i.test(t.imageUrl)
}

/** Hides made-up/demo tokens that don't have a real meme image — never hides real coins. */
export function isDisplayable(t: Token) {
  return !isSimulated(t) || hasRealImage(t)
}
