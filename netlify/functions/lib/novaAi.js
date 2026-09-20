/**
 * Server-side NOVA AI desk helpers (keep in sync with src/engine/novaAiDesk.ts).
 */
export const AI_WALLET = 'NOVA AI'
export const HOUSE_BOOST = 2.2
export const DEX_UNFAVOUR = 0.38

export function isHouseCoin(t) {
  if (!t) return false
  if (t.source === 'dexscreener') return false
  if (t.curvePda) return false
  return t.managed === true || t.source === 'bot' || t.source === 'local' || !t.mint
}

export function pickHouseTargets(tokens, n = 8) {
  return [...(tokens || [])]
    .filter((t) => isHouseCoin(t) && !t.complete)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, Math.max(1, n))
}

export function ambientBoostSol(tokenAgeMs) {
  const fresh = tokenAgeMs < 6 * 60_000
  const base = fresh ? 0.08 : 0.03
  return base + Math.random() * (fresh ? 0.28 : 0.12)
}

export function reactionSol(side, userSol) {
  const size = Math.min(1.8, Math.max(0.05, Number(userSol) || 0.05))
  if (side === 'buy') return size * (0.35 + Math.random() * 0.25)
  return size * (0.12 + Math.random() * 0.1)
}
