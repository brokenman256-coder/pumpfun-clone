import { useStore } from '../store/useStore'
import { useExitTransition } from '../hooks/useExitTransition'

const STEPS = [
  'pick a coin you like 👀',
  'buy on the bonding curve 📈',
  'sell anytime to lock profits (or losses 😅)',
  'when market cap hits $69k, liquidity goes to Raydium 🔥',
]

export function HowItWorksModal() {
  const open = useStore((s) => s.howOpen)
  const setHowOpen = useStore((s) => s.setHowOpen)
  const { mounted, state } = useExitTransition(open, 200)
  if (!mounted) return null
  const shown = state === 'entered'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 transition-opacity duration-200 ease-out ${shown ? 'opacity-100' : 'opacity-0'}`}
      onClick={() => setHowOpen(false)}
    >
      <div
        className={`w-full max-w-md overflow-hidden rounded-2xl border border-[#334155] bg-[#111827] transition-all duration-200 ease-out ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-28 items-center justify-center bg-gradient-to-b from-[#1d4ed8] to-[#111827]">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-2xl font-black text-white shadow-[0_0_24px_rgba(59,130,246,0.4)]">
            N
          </span>
        </div>
        <div className="p-6">
          <h2 className="text-center font-logo text-lg text-white">
            NOVA
          </h2>
          <p className="mt-3 text-center text-sm text-[#8b8d97]">how it works</p>
          <ol className="mt-5 space-y-3">
            {STEPS.map((text, i) => (
              <li key={text} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3b82f6] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setHowOpen(false)}
            className="btn-press mt-6 w-full rounded-full bg-[#3b82f6] py-3 text-sm font-bold text-white"
          >
            I&apos;m ready to launch 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
