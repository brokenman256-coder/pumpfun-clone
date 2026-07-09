import type { Candle } from '../types'

export function seedCandles(mcapUsd: number, count = 36): Candle[] {
  const now = Math.floor(Date.now() / 1000)
  let price = Math.max(0.00001, mcapUsd / 1_000_000_000)
  const out: Candle[] = []
  for (let i = count; i > 0; i--) {
    const open = price
    const drift = (Math.random() - 0.48) * price * 0.08
    const close = Math.max(0.000001, open + drift)
    const high = Math.max(open, close) * (1 + Math.random() * 0.02)
    const low = Math.min(open, close) * (1 - Math.random() * 0.02)
    out.push({
      time: now - i * 60,
      open,
      high,
      low,
      close,
    })
    price = close
  }
  return out
}

export function applyTradeToCandles(
  candles: Candle[],
  price: number,
  _side: 'buy' | 'sell',
): Candle[] {
  const now = Math.floor(Date.now() / 1000)
  if (candles.length === 0) {
    return [{ time: now, open: price, high: price, low: price, close: price }]
  }
  const last = candles[candles.length - 1]
  const bucket = Math.floor(now / 60) * 60
  if (last.time >= bucket) {
    return [
      ...candles.slice(0, -1),
      {
        ...last,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        close: price,
      },
    ]
  }
  return [
    ...candles.slice(-80),
    {
      time: bucket,
      open: last.close,
      high: Math.max(last.close, price),
      low: Math.min(last.close, price),
      close: price,
    },
  ]
}
