import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useExitTransition } from '../hooks/useExitTransition'

export function GraduationToast() {
  const toast = useStore((s) => s.graduationToast)
  const clear = useStore((s) => s.clearGraduation)
  const { mounted, state } = useExitTransition(!!toast, 200)
  const lastToast = useRef(toast)
  if (toast) lastToast.current = toast
  if (!mounted || !lastToast.current) return null
  const shown = state === 'entered'
  const t = lastToast.current

  return (
    <div
      className={`fixed left-1/2 top-16 z-[60] w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl border border-yellow-400/40 bg-[#1a1b22] p-4 shadow-2xl transition-all duration-200 ease-out ${shown ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}
    >
      <p className="font-bold text-yellow-300">🎓 ${t.symbol} graduated!</p>
      <p className="mt-1 text-xs text-[#8b8d97]">Liquidity moving to Raydium…</p>
      <div className="mt-3 flex gap-2">
        <Link to={`/coin/${t.id}`} className="rounded-full bg-[#3b82f6] px-3 py-1.5 text-xs font-bold text-white" onClick={clear}>
          View coin
        </Link>
        <button type="button" onClick={clear} className="rounded-full border border-[#334155] px-3 py-1.5 text-xs">
          Dismiss
        </button>
      </div>
    </div>
  )
}
