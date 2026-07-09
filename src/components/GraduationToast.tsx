import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'

export function GraduationToast() {
  const toast = useStore((s) => s.graduationToast)
  const clear = useStore((s) => s.clearGraduation)
  if (!toast) return null

  return (
    <div className="fixed left-1/2 top-16 z-[60] w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl border border-yellow-400/40 bg-[#1a1b22] p-4 shadow-2xl">
      <p className="font-bold text-yellow-300">🎓 ${toast.symbol} graduated!</p>
      <p className="mt-1 text-xs text-[#8b8d97]">Liquidity moving to Raydium…</p>
      <div className="mt-3 flex gap-2">
        <Link to={`/coin/${toast.id}`} className="rounded-full bg-[#86efac] px-3 py-1.5 text-xs font-bold text-black" onClick={clear}>
          View coin
        </Link>
        <button type="button" onClick={clear} className="rounded-full border border-[#26272e] px-3 py-1.5 text-xs">
          Dismiss
        </button>
      </div>
    </div>
  )
}
