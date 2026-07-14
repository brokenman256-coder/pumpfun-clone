/**
 * Continuous managed-board coin launcher.
 * Posts { action: 'launch' } to /api/live-board every LOOP_INTERVAL_MS.
 *
 * Env:
 *   LIVE_BOARD_URL   e.g. https://your-app.vercel.app
 *   BOT_API_SECRET   optional x-bot-secret
 *   LOOP_INTERVAL_MS default 30000
 *   LOOP_BUDGET_MS   0 = single shot; >0 loop until budget
 */

const BASE = (process.env.LIVE_BOARD_URL || 'https://pumpfun-clone-mw7z.vercel.app').replace(
  /\/$/,
  '',
)
const INTERVAL = Number(process.env.LOOP_INTERVAL_MS || 30_000)
const BUDGET = Number(process.env.LOOP_BUDGET_MS || 0)
const SECRET = process.env.BOT_API_SECRET || ''

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function launchOnce() {
  const headers = { 'Content-Type': 'application/json' }
  if (SECRET) headers['x-bot-secret'] = SECRET

  const res = await fetch(`${BASE}/api/live-board`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'launch' }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`[fail] ${res.status}`, data.error || data)
    return false
  }
  const t = data.token
  console.log(
    `[ok] $${t?.symbol || '?'} · mcap $${Math.round(t?.marketCapUsd || 0).toLocaleString()} · total ${data.total}`,
  )

  // Wiggle the board a bit
  await fetch(`${BASE}/api/live-board`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action: 'sim-tick' }),
  }).catch(() => null)

  return true
}

async function main() {
  console.log(`Managed board bot → ${BASE}`)
  console.log(`interval=${INTERVAL}ms budget=${BUDGET || 'single'}`)

  if (!BUDGET) {
    const ok = await launchOnce()
    process.exit(ok ? 0 : 1)
  }

  const end = Date.now() + BUDGET
  let n = 0
  let fails = 0
  while (Date.now() < end) {
    const ok = await launchOnce()
    if (ok) {
      n++
      fails = 0
    } else {
      fails++
      if (fails >= 8) {
        console.error('Too many consecutive failures — exiting')
        process.exit(1)
      }
    }
    const left = end - Date.now()
    if (left <= 0) break
    await sleep(Math.min(INTERVAL, left))
  }
  console.log(`Done. Launched ${n} coins.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
