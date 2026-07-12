/**
 * Serverless function (Vercel) — the only place that can flip the site's
 * maintenance flag. Password check and the GitHub write both happen here,
 * server-side, using env vars that are never shipped to the browser:
 *   - MAINTENANCE_KEY: the password checked against what's submitted
 *   - GITHUB_TOKEN: a PAT with contents:write on this repo only
 *
 * On success, commits public/site-status.json with the new flag, which
 * triggers Vercel to redeploy — every visitor's browser picks up the new
 * static file within roughly a minute, no per-visitor function calls.
 */
const OWNER = 'brokenman256-coder'
const REPO = 'pumpfun-clone'
const BRANCH = 'main'
const FILE_PATH = 'public/site-status.json'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { password, maintenance } = req.body || {}
  const expected = process.env.MAINTENANCE_KEY
  const token = process.env.GITHUB_TOKEN

  if (!expected || !token) {
    res.status(500).json({ error: 'Server not configured (missing MAINTENANCE_KEY or GITHUB_TOKEN)' })
    return
  }
  if (typeof password !== 'string' || password !== expected) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }
  if (typeof maintenance !== 'boolean') {
    res.status(400).json({ error: 'maintenance must be true or false' })
    return
  }

  const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }

  try {
    const getRes = await fetch(`${apiBase}?ref=${BRANCH}`, { headers })
    if (!getRes.ok) {
      const body = await getRes.text()
      res.status(502).json({ error: `Could not read current status file: ${getRes.status} ${body}` })
      return
    }
    const current = await getRes.json()
    const content = Buffer.from(
      JSON.stringify({ maintenance, updatedAt: new Date().toISOString() }, null, 2) + '\n',
    ).toString('base64')

    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: maintenance ? 'Site: enter maintenance mode' : 'Site: exit maintenance mode',
        content,
        sha: current.sha,
        branch: BRANCH,
      }),
    })
    if (!putRes.ok) {
      const body = await putRes.text()
      res.status(502).json({ error: `Could not update status file: ${putRes.status} ${body}` })
      return
    }
    res.status(200).json({ ok: true, maintenance })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unknown error' })
  }
}
