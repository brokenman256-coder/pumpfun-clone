import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Token } from '../types'
import { useStore } from '../store/useStore'
import { formatUsd } from '../lib/format'
import { SOL_PRICE_USD } from '../engine/bondingCurve'

/**
 * pump.fun-style chart: dark canvas, green/red candles, volume underlay,
 * crosshair, live last-price line, timeframes.
 */
type Tf = '1s' | '1m' | '5m' | '15m' | '1h'

const TF_SEC: Record<Tf, number> = {
  '1s': 1,
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
}

// pump.fun palette
const UP = '#00c805'
const DOWN = '#f23645'
const BG = '#0b0e11'
const GRID = '#1a1d24'
const TEXT = '#848e9c'

export function Chart({ token }: { token: Token }) {
  const ensureCandles = useStore((s) => s.ensureCandles)
  const wrap = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [tf, setTf] = useState<Tf>('1m')
  const [hoverPx, setHoverPx] = useState<number | null>(null)

  const lastPx = token.priceSol
  const lastUsd = lastPx * SOL_PRICE_USD
  const up = token.change24h >= 0

  useEffect(() => {
    ensureCandles(token.id)
  }, [token.id, ensureCandles])

  useEffect(() => {
    if (!wrap.current) return

    const chart = createChart(wrap.current, {
      layout: {
        background: { color: BG },
        textColor: TEXT,
        fontSize: 11,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      },
      grid: {
        vertLines: { color: GRID, style: 1 },
        horzLines: { color: GRID, style: 1 },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(134,239,172,0.35)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1a1d24',
        },
        horzLine: {
          color: 'rgba(134,239,172,0.35)',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1a1d24',
        },
      },
      width: wrap.current.clientWidth,
      height: wrap.current.clientHeight || 380,
      timeScale: {
        borderColor: GRID,
        timeVisible: true,
        secondsVisible: tf === '1s' || tf === '1m',
        rightOffset: 4,
        barSpacing: 8,
        minBarSpacing: 3,
      },
      rightPriceScale: {
        borderColor: GRID,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      handleScroll: { vertTouchDrag: false },
    })

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: true,
      priceLineVisible: true,
      lastValueVisible: true,
      priceFormat: {
        type: 'price',
        precision: 10,
        minMove: 1e-10,
      },
    })

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      borderVisible: false,
    })

    chartRef.current = chart
    candleRef.current = candles
    volRef.current = volume

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoverPx(null)
        return
      }
      const d = param.seriesData.get(candles) as CandlestickData | undefined
      if (d && 'close' in d) setHoverPx(d.close as number)
      else setHoverPx(null)
    })

    const ro = new ResizeObserver(() => {
      if (wrap.current) {
        chart.applyOptions({
          width: wrap.current.clientWidth,
          height: wrap.current.clientHeight || 380,
        })
      }
    })
    ro.observe(wrap.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleRef.current = null
      volRef.current = null
    }
  }, [token.id])

  useEffect(() => {
    const candles = candleRef.current
    const vol = volRef.current
    const chart = chartRef.current
    if (!candles || !vol || !chart) return

    const raw = resample(token.candles, TF_SEC[tf])
    if (raw.length === 0) return

    const cdata: CandlestickData[] = raw.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    candles.setData(cdata)

    const vdata: HistogramData[] = raw.map((c) => {
      const body = Math.abs(c.close - c.open)
      const wick = c.high - c.low
      const value = Math.max(body, wick * 0.3) * 1e12 + c.close * 1e6
      return {
        time: c.time as UTCTimestamp,
        value,
        color: c.close >= c.open ? 'rgba(0,200,5,0.45)' : 'rgba(242,54,69,0.45)',
      }
    })
    vol.setData(vdata)
    chart.timeScale().scrollToRealTime()
  }, [token.candles, token.id, tf, token.priceSol])

  const displayPx = hoverPx ?? lastPx
  const displayUsd = displayPx * SOL_PRICE_USD

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1a1d24] bg-[#0b0e11] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* pump.fun-style header strip */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#1a1d24] px-3 py-2.5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-[#5d6573]">
            Price · {token.symbol}/SOL
          </p>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
            <span className={`font-mono text-lg font-bold tabular-nums sm:text-xl ${up ? 'text-[#00c805]' : 'text-[#f23645]'}`}>
              {displayPx < 0.0001 ? displayPx.toExponential(4) : displayPx.toFixed(8)}
            </span>
            <span className="text-xs text-[#848e9c]">≈ {formatUsd(displayUsd)}</span>
            <span className={`text-xs font-bold ${up ? 'text-[#00c805]' : 'text-[#f23645]'}`}>
              {up ? '▲' : '▼'} {Math.abs(token.change24h).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg bg-[#12151a] p-0.5">
          {(['1s', '1m', '5m', '15m', '1h'] as Tf[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                tf === t
                  ? 'bg-[#1e2329] text-white shadow-sm'
                  : 'text-[#5d6573] hover:text-[#848e9c]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={wrap} className="h-[320px] w-full sm:h-[400px]" />
      <div className="flex items-center justify-between border-t border-[#1a1d24] px-3 py-1.5 text-[10px] text-[#5d6573]">
        <span>MC {formatUsd(token.marketCapUsd)}</span>
        <span>Vol {formatUsd(token.volumeUsd)}</span>
        <span>
          🟢{token.buyCount} 🔴{token.sellCount}
        </span>
      </div>
    </div>
  )
}

function resample(candles: Token['candles'], bucketSec: number): Token['candles'] {
  if (!candles.length) return []
  if (bucketSec <= 1) {
    // expand 1m candles into pseudo 1s trail for live feel
    const out: Token['candles'] = []
    for (const c of candles.slice(-40)) {
      const steps = 4
      for (let i = 0; i < steps; i++) {
        const t = c.time - (steps - 1 - i) * 15
        const mix = i / (steps - 1)
        const mid = c.open + (c.close - c.open) * mix
        out.push({
          time: t,
          open: i === 0 ? c.open : out[out.length - 1].close,
          high: Math.max(c.open, c.close, mid) * (1 + Math.random() * 0.002),
          low: Math.min(c.open, c.close, mid) * (1 - Math.random() * 0.002),
          close: mid,
        })
      }
    }
    return out.sort((a, b) => a.time - b.time)
  }
  if (bucketSec <= 60) return candles
  const map = new Map<number, Token['candles'][0]>()
  for (const c of candles) {
    const t = Math.floor(c.time / bucketSec) * bucketSec
    const prev = map.get(t)
    if (!prev) {
      map.set(t, { ...c, time: t })
    } else {
      map.set(t, {
        time: t,
        open: prev.open,
        high: Math.max(prev.high, c.high),
        low: Math.min(prev.low, c.low),
        close: c.close,
      })
    }
  }
  return [...map.values()].sort((a, b) => a.time - b.time)
}
