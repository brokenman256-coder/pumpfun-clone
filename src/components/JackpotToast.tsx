import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { formatJackpotCountdown } from '../engine/jackpot'

export function JackpotToast() {
  const toast = useStore((s) => s.jackpotToast)
  const clear = useStore((s) => s.clearJackpotToast)
  const token = useStore((s) =>
    toast ? s.tokens.find((t) => t.id === toast.id) : undefined,
  )

  useEffect(() => {
    if (!toast) return
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#a78bfa', '#86efac', '#fff', '#fbbf24'],
    })
    const id = window.setTimeout(clear, 12_000)
    return () => clearTimeout(id)
  }, [toast, clear])

  if (!toast) return null

  const unlock = token?.jackpotUnlockAt

  return (
    <div className="fixed bottom-20 left-1/2 z-[90] w-[min(92vw,380px)] -translate-x-1/2 animate-bounce lg:bottom-8 lg:animate-none">
      <div className="rounded-2xl border border-violet-400/50 bg-[#14081a] p-4 shadow-2xl shadow-violet-500/25">
        <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
          🚀 Past 2× — freeze button up
        </p>
        <p className="mt-1 text-lg font-black text-white">
          ${toast.symbol} · {toast.multiple.toFixed(1)}×
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#c4b5d0]">
          You can still <strong>BUY</strong>. <strong>SELL is locked</strong>. Bots keep hyping.
          After <strong>24 hours</strong> this coin disappears completely.
        </p>
        {unlock && (
          <p className="mt-2 text-sm font-semibold text-violet-200">
            Vanishes in {formatJackpotCountdown(unlock)}
          </p>
        )}
        <button
          type="button"
          onClick={clear}
          className="mt-3 w-full rounded-lg bg-white/10 py-2 text-xs font-bold text-white/90"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
