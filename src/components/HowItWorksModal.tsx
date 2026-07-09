import { useStore } from '../store/useStore'

const STEPS = [
  { n: 1, text: 'pick a coin you like 👀' },
  { n: 2, text: 'buy the coin on the bonding curve 📈' },
  { n: 3, text: 'sell anytime to lock in profits (or losses 😅)' },
  {
    n: 4,
    text: 'when market cap hits $69k, liquidity goes to Raydium and burns 🔥🎓',
  },
]

export function HowItWorksModal() {
  const open = useStore((s) => s.howOpen)
  const setHowOpen = useStore((s) => s.setHowOpen)
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={() => setHowOpen(false)}
    >
      <div
        className="modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-[#26272e] bg-[#15161b]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-36 items-end justify-center bg-gradient-to-b from-[#14532d] to-[#15161b]">
          <span className="mb-2 text-6xl">🟢</span>
        </div>
        <div className="p-6">
          <h2 className="text-center font-logo text-sm text-white">
            pump<span className="text-[#86efac]">.fun</span>
          </h2>
          <p className="mt-3 text-center text-sm text-[#8b8d97]">
            how it works (it&apos;s really that simple)
          </p>
          <ol className="mt-5 space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#86efac] text-xs font-bold text-black">
                  {s.n}
                </span>
                <span className="pt-1 text-[#e8e8ed]">{s.text}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setHowOpen(false)}
            className="btn-press mt-6 w-full rounded-full bg-[#86efac] py-3 text-sm font-bold text-black hover:bg-[#4ade80]"
          >
            I&apos;m ready to pump 🚀
          </button>
        </div>
      </div>
    </div>
  )
}
