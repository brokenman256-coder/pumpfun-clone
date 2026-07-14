/**
 * Vercel Cron + manual trigger: launch one managed coin on the live board.
 * Schedule in vercel.json every minute (Hobby may throttle).
 * Also safe to hit from GitHub Actions every 30s.
 */

export default async function handler(req, res) {
  // Vercel Cron sends GET with Authorization: Bearer CRON_SECRET
  const cronSecret = process.env.CRON_SECRET || process.env.BOT_API_SECRET
  const auth = req.headers['authorization'] || ''
  const botHdr = req.headers['x-bot-secret'] || ''
  if (cronSecret) {
    const ok =
      auth === `Bearer ${cronSecret}` ||
      botHdr === cronSecret ||
      process.env.LIVE_BOARD_OPEN === '1'
    if (!ok && req.headers['x-vercel-cron'] !== '1') {
      // Still allow Vercel cron header
      if (!req.headers['x-vercel-cron']) {
        res.status(401).json({ ok: false, error: 'Unauthorized' })
        return
      }
    }
  }

  try {
    const base =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.LIVE_BOARD_URL || 'http://127.0.0.1:3000'

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

    res.status(launchRes.ok ? 200 : launchRes.status).json({
      ok: launchRes.ok,
      ...data,
      at: new Date().toISOString(),
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || 'cron failed' })
  }
}
