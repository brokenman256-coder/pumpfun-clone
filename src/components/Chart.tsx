import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  ColorType,
} from 'lightweight-charts'
import type { Token } from '../types'
import { formatUsd } from '../lib/format'
import { useCountUp } from '../hooks/useCountUp'

const TFS = ['1m', '5m', '1h', '24h'] as const

export function Chart({ token }: { token: Token }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [tf, setTf] = useState<(typeof TFS)[number]>('1m')
  const mcap = useCountUp(token.marketCapUsd)

  useEffect(() => {
    if (!ref.current) return
    const chart = createChart(ref.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0e0f13' },
        textColor: '#8b8d97',
      },
      grid: {
        vertLines: { color: '#1a1b22' },
        horzLines: { color: '#1a1b22' },
      },
      width: ref.current.clientWidth,
      height: 320,
      timeScale: { borderColor: '#26272e', timeVisible: true },
      rightPriceScale: { borderColor: '#26272e' },
      crosshair: { mode: 0 },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#86efac',
      downColor: '#f87171',
      borderUpColor: '#86efac',
      borderDownColor: '#f87171',
      wickUpColor: '#86efac',
      wickDownColor: '#f87171',
    })

    chartRef.current = chart
    seriesRef.current = series

    const ro = new ResizeObserver(() => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth })
    })
    ro.observe(ref.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    const data: CandlestickData[] = token.candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))
    if (data.length) {
      seriesRef.current.setData(data)
      chartRef.current?.timeScale().scrollToRealTime()
    }
  }, [token.candles, tf, token.id])

  const up =
    token.candles.length >= 2
      ? token.candles[token.candles.length - 1].close >= token.candles[0].open
      : true

  return (
    <div className="overflow-hidden rounded-xl border border-[#26272e] bg-[#15161b]">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-[#26272e] px-4 py-3">
        <div>
          <p className="text-[10px] uppercase text-[#8b8d97]">market cap</p>
          <p className={`text-2xl font-bold ${up ? 'text-[#86efac]' : 'text-[#f87171]'}`}>
            {formatUsd(mcap)}
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-[#0e0f13] p-0.5">
          {TFS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTf(t)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                tf === t ? 'bg-[#1a1b22] text-[#86efac]' : 'text-[#8b8d97]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div ref={ref} className="w-full" />
    </div>
  )
}
