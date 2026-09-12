/**
 * Durable live board store via GitHub Contents API.
 * Fallback: in-memory (single warm lambda) when GITHUB_TOKEN is missing.
 */

const OWNER = process.env.GITHUB_OWNER || 'brokenman256-coder'
const REPO = process.env.GITHUB_REPO || 'pumpfun-clone'
const BRANCH = process.env.GITHUB_BRANCH || 'main'
const FILE_PATH = 'public/live-board.json'

const emptyBoard = () => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  tokens: [],
  recentTrades: [],
  usedMemeUrls: [],
  launched: 0,
})

// Warm-instance fallback (not multi-region durable)
if (!globalThis.__IGNITE_BOARD__) {
  globalThis.__IGNITE_BOARD__ = emptyBoard()
}

function ghHeaders() {
  const token = process.env.GITHUB_TOKEN
  if (!token) return null
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'ignite-live-board',
  }
}

export async function readBoard() {
  const headers = ghHeaders()
  if (!headers) {
    return { board: globalThis.__IGNITE_BOARD__, sha: null, source: 'memory' }
  }
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`
  const res = await fetch(url, { headers })
  if (res.status === 404) {
    return { board: emptyBoard(), sha: null, source: 'github-missing' }
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub read failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  const raw = Buffer.from(data.content, 'base64').toString('utf8')
  let board
  try {
    board = JSON.parse(raw)
  } catch {
    board = emptyBoard()
  }
  if (!board.tokens) board.tokens = []
  if (!board.recentTrades) board.recentTrades = []
  if (!board.usedMemeUrls) board.usedMemeUrls = []
  globalThis.__IGNITE_BOARD__ = board
  return { board, sha: data.sha, source: 'github' }
}

export async function writeBoard(board, sha) {
  board.updatedAt = new Date().toISOString()
  board.version = (board.version || 0) + 1
  globalThis.__IGNITE_BOARD__ = board

  const headers = ghHeaders()
  if (!headers) {
    return { ok: true, source: 'memory', board }
  }

  const content = Buffer.from(JSON.stringify(board, null, 2) + '\n').toString('base64')
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`
  const body = {
    message: `live-board: v${board.version} · ${board.tokens.length} coins`,
    content,
    branch: BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    // Conflict — caller should re-read and retry
    if (res.status === 409) {
      return { ok: false, conflict: true, error: text }
    }
    throw new Error(`GitHub write failed: ${res.status} ${text}`)
  }
  const data = await res.json()
  return { ok: true, source: 'github', sha: data.content?.sha, board }
}

export { emptyBoard, FILE_PATH }
