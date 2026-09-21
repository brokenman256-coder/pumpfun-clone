import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'

export function PracticeBanner() {
  const practice = useStore((s) => s.practiceMode)
  const setPractice = useStore((s) => s.setPracticeMode)
  const { isRealTrader } = useWallet()
  if (isRealTrader || !practice) return null
  return (
    <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between gap-3 rounded-2xl border border-yellow-400/25 bg-yellow-400/10 px-3 py-2.5">
      <p className="text-[12px] font-semibold text-yellow-100">
        Practice — not real SOL. Fills never leave this device.
      </p>
      <button
        type="button"
        onClick={() => setPractice(false)}
        className="shrink-0 rounded-full bg-yellow-300 px-3 py-1 text-[11px] font-bold text-[#100814]"
      >
        Exit practice
      </button>
    </div>
  )
}
