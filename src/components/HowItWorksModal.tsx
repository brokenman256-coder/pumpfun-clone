import { useStore } from '../store/useStore'

const STEPS = [
  'pick a coin you like 👀',
  'buy on the bonding curve 📈',
  'sell anytime to lock profits (or losses 😅)',
  'when market cap hits $69k, liquidity goes to Raydium 🔥',
]

export function HowItWorksModal() {
  const open = useStore((s) => s.howOpen)
  const setHowOpen = useStore((s) => s.setHowOpen)
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setHowOpen(false)}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#26272e] bg-[#15161b]" onClick={(e) => e.stopPropagation()}>
        <div className="flex h-28 items-end justify-center bg-gradient-to-b from-[#14532d] to-[#15161b]">
          <span className="mb-2 text-5xl">🟢</span>
        </div>
        <div className="p-6">
          <h2 className="text-center font-logo text-sm text-white">
            IGN<span className="text-[#86efac]">ITE</span>
          </h2>
          <p className="mt-3 text-center text-sm text-[#8b8d97]">how it works</p>
          <ol className="mt-5 space-y-3">
            {STEPS.map((text, i) => (
              <li key={text} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#86efac] text-xs font-bold text-black">
                  {i + 1}
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setHowOpen(false)}
            className="btn-press mt-6 w-full rounded-full bg-[#86efac] py-3 text-sm font-bold text-black"
          >
            I&apos;m ready to ignite 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
