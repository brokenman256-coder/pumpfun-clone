import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Token } from '../types'
import { useStore } from '../store/useStore'

type ChartKind = 'candles' | 'line' | 'area' | 'volume'
type Tf = '1m' | '5m' | '15m' | '1h' | '4h'

const TF_SEC: Record<Tf, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
}

/**
 * Multi-type charts: candles · line · area · volume + timeframes
 */
export function Chart({ token }: { token: Token }) {
  const ensureCandles = useStore((s) => s.ensureCandles)
  const wrap = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area' | 'Histogram'> | null>(null)
  const [kind, setKind] = useState<ChartKind>('candles')
  const [tf, setTf] = useState<Tf>('1m')

  useEffect(() => {
    ensureCandles(token.id)
  }, [token.id, ensureCandles])

  useEffect(() => {
    if (!wrap.current) return
    const chart = createChart(wrap.current, {
      layout: {
        background: { color: '#14151b' },
        textColor: '#8b8d97',
      },
      grid: {
        vertLines: { color: '#1f2028' },
        horzLines: { color: '#1f2028' },
      },
      width: wrap.current.clientWidth,
      height: 320,
      timeScale: { borderColor: '#26272e' },
      rightPriceScale: { borderColor: '#26272e' },
    })
    chartRef.current = chart

    const ro = new ResizeObserver(() => {
      if (wrap.current) chart.applyOptions({ width: wrap.current.clientWidth })
    })
    ro.observe(wrap.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [token.id, kind])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    // Remove previous series by recreating chart content
    // lightweight-charts v5: removeSeries
    if (seriesRef.current) {
      try {
        chart.removeSeries(seriesRef.current)
      } catch {
        /* */
      }
    }

    let series: ISeriesApi<'Candlestick' | 'Line' | 'Area' | 'Histogram'>
    if (kind === 'candles') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#86efac',
        downColor: '#f87171',
        borderVisible: false,
        wickUpColor: '#86efac',
        wickDownColor: '#f87171',
      })
    } else if (kind === 'line') {
      series = chart.addSeries(LineSeries, {
        color: '#86efac',
        lineWidth: 2,
      })
    } else if (kind === 'area') {
      series = chart.addSeries(AreaSeries, {
        lineColor: '#86efac',
        topColor: 'rgba(134,239,172,0.4)',
        bottomColor: 'rgba(134,239,172,0.02)',
        lineWidth: 2,
      })
    } else {
      series = chart.addSeries(HistogramSeries, {
        color: '#86efac',
      })
    }
    seriesRef.current = series

    const candles = resample(token.candles, TF_SEC[tf])
    if (candles.length === 0) return

    if (kind === 'candles') {
      const data: CandlestickData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      ;(series as ISeriesApi<'Candlestick'>).setData(data)
    } else if (kind === 'volume') {
      const data = candles.map((c, i) => ({
        time: c.time as UTCTimestamp,
        value: Math.abs(c.close - c.open) * 1e9 + i,
        color: c.close >= c.open ? 'rgba(134,239,172,0.7)' : 'rgba(248,113,113,0.7)',
      }))
      ;(series as ISeriesApi<'Histogram'>).setData(data)
    } else {
      const data: LineData[] = candles.map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.close,
      }))
      ;(series as ISeriesApi<'Line'>).setData(data)
    }
    chart.timeScale().fitContent()
  }, [token.candles, token.id, kind, tf])

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1f2028] bg-[#14151b]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1f2028] px-3 py-2">
        <div className="flex gap-1">
          {(['candles', 'line', 'area', 'volume'] as ChartKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold capitalize ${
                kind === k ? 'bg-[#86efac] text-black' : 'text-[#8b8d97] hover:text-white'
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          {(['1m', '5m', '15m', '1h', '4h'] as Tf[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                tf === t ? 'bg-white/10 text-white' : 'text-[#6b6d78]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={wrap} className="w-full" />
    </div>
  )
}

function resample(
  candles: Token['candles'],
  bucketSec: number,
): Token['candles'] {
  if (!candles.length || bucketSec <= 60) return candles
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
