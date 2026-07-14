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
      particleCount: 120,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#fbbf24', '#f59e0b', '#fff', '#86efac'],
    })
    const id = window.setTimeout(clear, 12_000)
    return () => clearTimeout(id)
  }, [toast, clear])

  if (!toast) return null

  const unlock = token?.jackpotUnlockAt

  return (
    <div className="fixed bottom-20 left-1/2 z-[90] w-[min(92vw,380px)] -translate-x-1/2 lg:bottom-8">
      <div className="rounded-2xl border border-amber-400/50 bg-[#1a1408] p-4 shadow-2xl shadow-amber-500/20">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
          🎰 Jackpot locked
        </p>
        <p className="mt-1 text-lg font-black text-white">
          ${toast.symbol} hit {toast.multiple.toFixed(0)}×
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#c4b5a0]">
          All transfers frozen for <strong>24 hours</strong>. No buys, no sells,
          no withdrawals. After that the coin <strong>disappears forever</strong>.
        </p>
        {unlock && (
          <p className="mt-2 text-sm font-semibold text-amber-300">
            Vanishes in {formatJackpotCountdown(unlock)}
          </p>
        )}
        <button
          type="button"
          onClick={clear}
          className="mt-3 w-full rounded-lg bg-amber-400/20 py-2 text-xs font-bold text-amber-200"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
