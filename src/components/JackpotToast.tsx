import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { useStore } from '../store/useStore'
import {
  formatJackpotCountdown,
  freezeSolProgress,
  JACKPOT_USER_SOL_MIN,
} from '../engine/jackpot'

export function JackpotToast() {
  const toast = useStore((s) => s.jackpotToast)
  const clear = useStore((s) => s.clearJackpotToast)
  const token = useStore((s) =>
    toast ? s.tokens.find((t) => t.id === toast.id) : undefined,
  )

  useEffect(() => {
    if (!toast) return
    confetti({
      particleCount: toast.kind === 'frozen' ? 140 : 80,
      spread: 80,
      origin: { y: 0.55 },
      colors:
        toast.kind === 'frozen'
          ? ['#fbbf24', '#f59e0b', '#fff', '#86efac']
          : ['#a78bfa', '#86efac', '#fff'],
    })
    const id = window.setTimeout(clear, 14_000)
    return () => clearTimeout(id)
  }, [toast, clear])

  if (!toast) return null

  const unlock = token?.jackpotUnlockAt
  const realSol = token?.realUserSolIn ?? toast.realUserSol ?? 0

  return (
    <div className="fixed bottom-20 left-1/2 z-[90] w-[min(92vw,380px)] -translate-x-1/2 animate-bounce lg:bottom-8 lg:animate-none">
      <div
        className={`rounded-2xl border p-4 shadow-2xl ${
          toast.kind === 'frozen'
            ? 'border-amber-400/50 bg-[#1a1408] shadow-amber-500/20'
            : 'border-violet-400/50 bg-[#14081a] shadow-violet-500/25'
        }`}
      >
        {toast.kind === 'armed' ? (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
              🚀 Freeze button shot up
            </p>
            <p className="mt-1 text-lg font-black text-white">
              ${toast.symbol} is past {toast.multiple.toFixed(1)}×
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#c4b5d0]">
              Bots are <strong>hyping</strong> this coin. When real users put in{' '}
              <strong>{JACKPOT_USER_SOL_MIN} SOL</strong> total, it freezes — then vanishes
              after 24h.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-violet-400 transition-all"
                style={{ width: `${freezeSolProgress(realSol)}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-violet-200">
              Real SOL in: {realSol.toFixed(2)} / {JACKPOT_USER_SOL_MIN}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-400">
              🎰 FREEZE LOCKED
            </p>
            <p className="mt-1 text-lg font-black text-white">
              ${toast.symbol} · {toast.multiple.toFixed(1)}× · {realSol.toFixed(1)} SOL bag
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#c4b5a0]">
              No buys, sells, or withdrawals for <strong>24 hours</strong>. After that the coin{' '}
              <strong>disappears forever</strong>.
            </p>
            {unlock && (
              <p className="mt-2 text-sm font-semibold text-amber-300">
                Vanishes in {formatJackpotCountdown(unlock)}
              </p>
            )}
          </>
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
