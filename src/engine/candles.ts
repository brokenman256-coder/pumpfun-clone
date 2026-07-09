import type { Candle, Trade } from '../types'

const INTERVAL_SEC: Record<string, number> = {
  '1m': 60,
  '5m': 300,
  '1h': 3600,
  '24h': 86400,
}

export function bucketTime(tsMs: number, tf: string) {
  const sec = INTERVAL_SEC[tf] ?? 60
  return Math.floor(tsMs / 1000 / sec) * sec
}

/** Upsert a candle from a trade (mcap as price series for pump.fun feel) */
export function applyTradeToCandles(
  candles: Candle[],
  trade: Trade,
  tf: string,
): Candle[] {
  const t = bucketTime(trade.createdAt, tf)
  const price = trade.marketCapUsd
  if (!candles.length) {
    return [{ time: t, open: price, high: price, low: price, close: price }]
  }
  const last = candles[candles.length - 1]
  if (last.time === t) {
    const next = {
      ...last,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price,
    }
    return [...candles.slice(0, -1), next]
  }
  if (t > last.time) {
    return [
      ...candles,
      { time: t, open: last.close, high: Math.max(last.close, price), low: Math.min(last.close, price), close: price },
    ].slice(-200)
  }
  return candles
}

/** Seed initial candle history from current mcap */
export function seedCandles(mcap: number, points = 40, tf = '1m'): Candle[] {
  const sec = INTERVAL_SEC[tf] ?? 60
  const now = Math.floor(Date.now() / 1000 / sec) * sec
  const out: Candle[] = []
  let price = mcap * 0.55
  for (let i = points; i >= 0; i--) {
    const noise = 1 + (Math.sin(i * 1.3) * 0.04 + (Math.random() - 0.5) * 0.03)
    const open = price
    const close = Math.max(500, price * noise + (mcap - price) * (0.08 / points) * (points - i))
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)
    out.push({ time: now - i * sec, open, high, low, close })
    price = close
  }
  // pin last to current
  if (out.length) {
    const last = out[out.length - 1]
    last.close = mcap
    last.high = Math.max(last.high, mcap)
    last.low = Math.min(last.low, mcap)
  }
  return out
}
