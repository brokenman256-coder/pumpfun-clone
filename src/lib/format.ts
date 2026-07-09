export function formatUsd(n: number, digits = 0) {
  if (!Number.isFinite(n)) return '$0'
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1e3).toFixed(1)}K`
  if (n > 0 && n < 1) return `$${n.toFixed(4)}`
  return `$${n.toFixed(digits)}`
}

export function shortAddr(a: string, n = 4) {
  if (!a || a.length < n * 2 + 2) return a || ''
  return `${a.slice(0, n)}…${a.slice(-n)}`
}

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function formatSol(n: number) {
  if (!Number.isFinite(n)) return '0'
  if (n >= 100) return n.toFixed(1)
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(3)
}

export function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}
