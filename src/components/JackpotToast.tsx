import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import { formatJackpotCountdown } from '../engine/jackpot'
import { useExitTransition } from '../hooks/useExitTransition'

export function JackpotToast() {
  const toast = useStore((s) => s.jackpotToast)
  const clear = useStore((s) => s.clearJackpotToast)
  const token = useStore((s) =>
    toast ? s.tokens.find((t) => t.id === toast.id) : undefined,
  )
  const { mounted, state } = useExitTransition(!!toast, 200)
  const last = useRef<{ toast: typeof toast; token: typeof token }>({ toast, token })
  if (toast) last.current = { toast, token }

  useEffect(() => {
    if (!toast) return
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.55 },
      colors: ['#3b82f6', '#3b82f6', '#fff', '#fbbf24'],
    })
    const id = window.setTimeout(clear, 12_000)
    return () => clearTimeout(id)
  }, [toast, clear])

  if (!mounted || !last.current.toast) return null
  const shown = state === 'entered'
  const t = last.current.toast
  const unlock = last.current.token?.jackpotUnlockAt

  return (
    <div
      className={`fixed bottom-20 left-1/2 z-[90] w-[min(92vw,380px)] -translate-x-1/2 transition-all duration-200 ease-out lg:bottom-8 ${shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      <div className="rounded-2xl border border-[#3b82f6]/50 bg-[#0f172a] p-4 shadow-2xl shadow-blue-500/25">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60a5fa]">
          🚀 Past 2× — freeze button up
        </p>
        <p className="mt-1 text-lg font-black text-white">
          ${t.symbol} · {t.multiple.toFixed(1)}×
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[#9ab0c9]">
          You can still <strong>BUY</strong>. <strong>SELL is locked</strong>. Bots keep hyping.
          After <strong>24 hours</strong> this coin disappears completely.
        </p>
        {unlock && (
          <p className="mt-2 text-sm font-semibold text-[#93c5fd]">
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
