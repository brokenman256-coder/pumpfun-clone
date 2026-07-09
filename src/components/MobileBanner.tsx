import { useState } from 'react'

/** Top promo strip matching pump.fun mobile: "Trade faster. Pump is better on mobile." */
export function MobileBanner() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  return (
    <div className="flex items-center justify-center gap-2 bg-[#12131a] px-3 py-2 text-center text-[12px] text-[#c8c9d0]">
      <span>Trade faster. Pump is better on mobile.</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setOpen(false)}
        className="ml-1 text-[#8b8d97] hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}
