import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Token } from '../types'
import { useStore } from '../store/useStore'

export function Chart({ token }: { token: Token }) {
  const ensureCandles = useStore((s) => s.ensureCandles)
  const wrap = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

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
      height: 280,
      timeScale: { borderColor: '#26272e' },
      rightPriceScale: { borderColor: '#26272e' },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#86efac',
      downColor: '#f87171',
      borderVisible: false,
      wickUpColor: '#86efac',
      wickDownColor: '#f87171',
    })
    chartRef.current = chart
    seriesRef.current = series

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
  }, [])

  useEffect(() => {
    const series = seriesRef.current
    if (!series || token.candles.length === 0) return
    const data: CandlestickData[] = token.candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    series.setData(data)
    chartRef.current?.timeScale().fitContent()
  }, [token.candles, token.id])

  return <div ref={wrap} className="w-full overflow-hidden rounded-2xl border border-[#1f2028]" />
}
