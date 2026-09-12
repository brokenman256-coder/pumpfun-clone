/**
 * Netlify Function — the only place that can flip the site's maintenance
 * flag. Password check and the GitHub write both happen here, server-side,
 * using env vars that are never shipped to the browser:
 *   - MAINTENANCE_KEY: the password checked against what's submitted
 *   - GITHUB_TOKEN: a PAT with contents:write on this repo only
 *
 * On success, commits public/site-status.json with the new flag. Netlify
 * rebuilds on every push to the repo, so every visitor's browser picks up
 * the new static file within roughly a minute, no per-visitor function calls.
 */
const OWNER = 'brokenman256-coder'
const REPO = 'pumpfun-clone'
const BRANCH = 'main'
const FILE_PATH = 'public/site-status.json'

export const config = { path: '/api/toggle-maintenance' }

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  const { password, maintenance } = await req.json().catch(() => ({}))
  const expected = process.env.MAINTENANCE_KEY
  const token = process.env.GITHUB_TOKEN

  if (!expected || !token) {
    return json(
      { error: 'Server not configured (missing MAINTENANCE_KEY or GITHUB_TOKEN)' },
      { status: 500 },
    )
  }
  if (typeof password !== 'string' || password !== expected) {
    return json({ error: 'Wrong password' }, { status: 401 })
  }
  if (typeof maintenance !== 'boolean') {
    return json({ error: 'maintenance must be true or false' }, { status: 400 })
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
      return json(
        { error: `Could not read current status file: ${getRes.status} ${body}` },
        { status: 502 },
      )
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
      return json({ error: `Could not update status file: ${putRes.status} ${body}` }, { status: 502 })
    }
    return json({ ok: true, maintenance })
  } catch (e) {
    return json({ error: e.message || 'Unknown error' }, { status: 500 })
  }
}
