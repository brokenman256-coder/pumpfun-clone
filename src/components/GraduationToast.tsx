import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'

export function GraduationToast() {
  const toast = useStore((s) => s.graduationToast)
  const clear = useStore((s) => s.clearGraduation)

  useEffect(() => {
    if (!toast) return

    // Full-screen confetti burst (graduation event)
    const end = Date.now() + 2200
    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#86efac', '#facc15', '#ffffff', '#4ade80'],
      })
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#86efac', '#facc15', '#ffffff', '#4ade80'],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
    confetti({
      particleCount: 180,
      spread: 120,
      origin: { y: 0.35 },
      colors: ['#86efac', '#facc15', '#fff'],
    })

    const t = setTimeout(clear, 9000)
    return () => clearTimeout(t)
  }, [toast, clear])

  if (!toast) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]">
      <div className="modal-panel flex max-w-md flex-col items-center gap-3 rounded-2xl border border-yellow-400/50 bg-[#15161b] px-8 py-8 text-center shadow-2xl">
        <span className="text-5xl">🎓🔥</span>
        <p className="text-xl font-black text-yellow-300">
          ${toast.symbol} has graduated to Raydium!
        </p>
        <p className="text-sm text-[#8b8d97]">
          bonding curve complete · liquidity deposited & burned
        </p>
        <div className="mt-2 flex gap-3">
          <Link
            to={`/coin/${toast.id}`}
            className="rounded-full bg-[#86efac] px-5 py-2 text-sm font-bold text-black"
            onClick={clear}
          >
            view coin
          </Link>
          <button
            type="button"
            onClick={clear}
            className="rounded-full border border-[#26272e] px-5 py-2 text-sm text-[#8b8d97]"
          >
            close
          </button>
        </div>
      </div>
    </div>
  )
}
