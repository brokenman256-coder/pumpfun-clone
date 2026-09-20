import { useStore } from '../store/useStore'
import { useExitTransition } from '../hooks/useExitTransition'

const STEPS = [
  'Walk the atlas — every room is its own community, with unique art.',
  'House rooms are boosted by NOVA AI. Open-market coins sit further back.',
  'Buy a Solana mint: your SOL hits the desk wallet, we buy it on Jupiter for you.',
  'Sell: the desk sells that same bag and sends SOL back to Phantom.',
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
        className={`w-full max-w-md overflow-hidden rounded-2xl border border-[#e8a35a]/25 bg-[#1a1018] transition-all duration-200 ease-out ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex h-36 items-end p-5"
          style={{
            background:
              'linear-gradient(180deg, rgba(16,8,20,0.1), rgba(16,8,20,0.85)), url(/img/hero-salon.jpg) center/cover',
          }}
        >
          <img
            src="/img/nova-mark.jpg"
            alt=""
            className="h-14 w-14 rounded-full object-cover ring-2 ring-[#e8a35a]/50"
          />
        </div>
        <div className="p-6">
          <h2 className="font-display text-center text-2xl text-[#f4ead8]">NOVA atlas</h2>
          <p className="mt-2 text-center text-sm text-[#b7a99a]">how the rooms work</p>
          <ol className="mt-5 space-y-3">
            {STEPS.map((text, i) => (
              <li key={text} className="flex gap-3 text-sm text-[#f4ead8]/90">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e8a35a] text-xs font-bold text-[#100814]">
                  {i + 1}
                </span>
                <span className="pt-1">{text}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setHowOpen(false)}
            className="btn-press mt-6 w-full rounded-full bg-[#e8a35a] py-3 text-sm font-bold text-[#100814]"
          >
            Enter the salon
          </button>
        </div>
      </div>
    </div>
  )
}
