import { useState } from 'react'

export function MobileBanner() {
  const [open, setOpen] = useState(true)
  if (!open) return null
  return (
    <div className="flex items-center justify-center gap-2 bg-[#12131a] px-3 py-2 text-center text-[12px] text-[#c8c9d0]">
      <span>Trade faster. IGNITE is better on mobile.</span>
      <button type="button" aria-label="Dismiss" onClick={() => setOpen(false)} className="text-[#8b8d97]">
        ✕
      </button>
    </div>
  )
}
