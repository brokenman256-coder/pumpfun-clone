import { useEffect, useState, type ReactNode } from 'react'
import { fetchMaintenanceFlag } from '../lib/siteStatus'

const POLL_MS = 30_000
/** The control page must always render, even while the rest of the site is down. */
const BYPASS_PATHS = ['/site-control']

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const [down, setDown] = useState(false)
  const bypass = BYPASS_PATHS.includes(window.location.pathname)

  useEffect(() => {
    if (bypass) return
    let cancelled = false
    async function check() {
      const flag = await fetchMaintenanceFlag()
      if (!cancelled) setDown(flag)
    }
    void check()
    const id = window.setInterval(check, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [bypass])

  if (bypass) return <>{children}</>

  if (down) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0e0f13] px-6 text-center text-[#e8e8ed]">
        <p className="text-5xl">🛠️</p>
        <h1 className="mt-4 text-2xl font-black">Down for maintenance</h1>
        <p className="mt-2 max-w-sm text-sm text-[#8b8d97]">
          We'll be back shortly. Thanks for your patience.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
