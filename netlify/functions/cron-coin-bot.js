/**
 * Manual/external trigger: launch one managed coin on the live board.
 * Kept for parity with the old Vercel Cron endpoint — the live bot is
 * actually driven by the GitHub Actions workflow calling /api/live-board
 * directly (see scripts/managed-board-bot.mjs), so this is an optional
 * extra entry point (e.g. to hit by hand or from an external scheduler).
 */

export const config = { path: '/api/cron-coin-bot' }

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req) {
  const cronSecret = process.env.CRON_SECRET || process.env.BOT_API_SECRET
  const auth = req.headers.get('authorization') || ''
  const botHdr = req.headers.get('x-bot-secret') || ''
  if (cronSecret) {
    const ok =
      auth === `Bearer ${cronSecret}` ||
      botHdr === cronSecret ||
      process.env.LIVE_BOARD_OPEN === '1'
    if (!ok) {
      return json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const base = process.env.URL || process.env.LIVE_BOARD_URL || 'http://127.0.0.1:8888'

    const headers = { 'Content-Type': 'application/json' }
    if (cronSecret) headers['x-bot-secret'] = cronSecret

    const launchRes = await fetch(`${base}/api/live-board`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'launch' }),
    })
    const data = await launchRes.json().catch(() => ({}))

    // Optional light market activity
    await fetch(`${base}/api/live-board`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'sim-tick' }),
    }).catch(() => null)

    return json(
      { ok: launchRes.ok, ...data, at: new Date().toISOString() },
      { status: launchRes.ok ? 200 : launchRes.status },
    )
  } catch (e) {
    return json({ ok: false, error: e?.message || 'cron failed' }, { status: 500 })
  }
}
