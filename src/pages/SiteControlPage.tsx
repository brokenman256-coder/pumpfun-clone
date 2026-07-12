import { useEffect, useState } from 'react'
import { fetchMaintenanceFlag } from '../lib/siteStatus'

/**
 * Standalone kill-switch page — always reachable at /site-control even
 * while the rest of the site shows "down for maintenance" (see
 * MaintenanceGate). Password check and the actual write both happen
 * server-side in api/toggle-maintenance.js; nothing here can be bypassed
 * by reading the page's source.
 */
export function SiteControlPage() {
  const [password, setPassword] = useState('')
  const [current, setCurrent] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchMaintenanceFlag().then(setCurrent)
  }, [])

  async function toggle(next: boolean) {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const res = await fetch('/api/toggle-maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, maintenance: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
      setCurrent(next)
      setMessage(
        next
          ? 'Site is now down for maintenance for every visitor.'
          : 'Site is back up for every visitor.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-16">
      <h1 className="text-center text-xl font-black">🛑 Site control</h1>
      <p className="mt-2 text-center text-xs text-[#8b8d97]">
        Password-gated site-wide switch — takes the whole site down (or brings it back) for every
        visitor, not just this browser.
      </p>

      <div className="mt-6 space-y-3 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5">
        <p className="text-center text-xs text-[#8b8d97]">
          Current status:{' '}
          <span className={current ? 'text-red-400' : 'text-[#86efac]'}>
            {current === null ? 'checking…' : current ? 'DOWN' : 'LIVE'}
          </span>
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-xl border border-[#26272e] bg-[#0e0f13] px-3 py-3 text-sm outline-none focus:border-[#86efac]/40"
        />
        {error && <p className="text-center text-xs text-[#f87171]">{error}</p>}
        {message && <p className="text-center text-xs text-[#86efac]">{message}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading || !password}
            onClick={() => void toggle(true)}
            className="flex-1 rounded-full bg-red-500 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            Take site down
          </button>
          <button
            type="button"
            disabled={loading || !password}
            onClick={() => void toggle(false)}
            className="flex-1 rounded-full bg-[#86efac] py-3 text-sm font-bold text-black disabled:opacity-40"
          >
            Bring back up
          </button>
        </div>
      </div>
    </div>
  )
}
