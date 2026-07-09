import { useEffect, useState } from 'react'

/**
 * Cookie / privacy sheet styled like pump.fun mobile.
 */
export function CookieConsent() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('pump_cookie_ok') === '1') return
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(() => setOpen(true), 800)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null

  function accept() {
    try {
      localStorage.setItem('pump_cookie_ok', '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  function reject() {
    try {
      localStorage.setItem('pump_cookie_ok', '0')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <div className="fixed inset-x-0 bottom-[4.5rem] z-[70] px-3 sm:bottom-6 sm:left-1/2 sm:max-w-md sm:-translate-x-1/2">
      <div className="rounded-2xl border border-[#2a2b33] bg-[#1a1b22] p-4 shadow-2xl">
        <p className="text-[15px] font-semibold text-white">We value your privacy</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#9a9ba3]">
          This site uses cookies to improve your browsing experience, analyze site traffic, and show
          personalized content.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reject}
            className="rounded-full border border-[#3a3b44] px-3.5 py-2 text-[12px] font-semibold text-white"
          >
            Reject all
          </button>
          <button
            type="button"
            className="rounded-full border border-[#3a3b44] px-3.5 py-2 text-[12px] font-semibold text-white"
          >
            Customize
          </button>
          <button
            type="button"
            onClick={accept}
            className="ml-auto rounded-full bg-[#86efac] px-4 py-2 text-[12px] font-bold text-black"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  )
}
