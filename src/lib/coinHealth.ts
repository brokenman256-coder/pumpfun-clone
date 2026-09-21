import type { Token } from '../types'

export type CoinLight = {
  id: 'new' | 'liquid' | 'thin'
  label: string
  hint: string
  tone: 'ok' | 'warn' | 'mute'
}

export function coinLights(token: Token): CoinLight[] {
  const ageMin = (Date.now() - (token.createdAt || Date.now())) / 60_000
  const liq = token.liquidityUsd || 0
  const vol = token.volumeUsd || token.volumeSol * 140 || 0
  const mcap = token.marketCapUsd || 0
  const out: CoinLight[] = []

  if (ageMin < 45) {
    out.push({
      id: 'new',
      label: 'New',
      hint: 'Listed recently — price can move fast',
      tone: 'mute',
    })
  }
  if (liq >= 50_000 || vol >= 80_000 || mcap >= 120_000) {
    out.push({
      id: 'liquid',
      label: 'Liquid',
      hint: 'Enough size that small trades usually fill',
      tone: 'ok',
    })
  } else if (liq < 15_000 && mcap < 40_000 && vol < 20_000) {
    out.push({
      id: 'thin',
      label: 'Thin',
      hint: 'Small market — easy to slip',
      tone: 'warn',
    })
  }
  return out.slice(0, 2)
}

export function phantomTokenUrl(mint: string): string {
  const solscan = `https://solscan.io/token/${mint}`
  return `https://phantom.app/ul/browse/${encodeURIComponent(solscan)}?ref=${encodeURIComponent(window.location.origin)}`
}

export function solscanTokenUrl(mint: string): string {
  return `https://solscan.io/token/${mint}`
}
