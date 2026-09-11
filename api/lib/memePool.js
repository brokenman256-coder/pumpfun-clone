/**
 * Live meme sourcing for the server-side coin bot.
 *
 * Pulls real, currently-live memes from meme-api.com across safe/curated
 * subreddits on every call, so the pool is effectively unlimited and never
 * exhausts the way a small static list does. Falls back to a small static
 * pool only if the live fetch fails outright (network issue, API down).
 *
 * Safety: only wholesome/crypto-culture/programmer-humor subreddits, never
 * the generic "memes" pool — keeps unattended, unmoderated posting low-risk.
 * Same nsfw/spoiler + static-image-only filters as the rest of this project.
 */

const SAFE_SUBREDDITS = [
  'wholesomememes',
  'cryptocurrencymemes',
  'dogecoin',
  'ProgrammerHumor',
  'aww',
  'MadeMeSmile',
]

const FETCH_TIMEOUT_MS = 5000
const MEMES_PER_SUBREDDIT = 50

// Small, already-safety-reviewed fallback pool — only used if the live
// fetch fails entirely (e.g. meme-api.com is unreachable).
const FALLBACK_MEMES = [
  { url: 'https://i.redd.it/h29hoaal8g6h1.png', title: 'Your Honor, Do I Rest My Case?', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/nx7llsqq0j0h1.png', title: 'We are NOT the same...', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/xib83t2nc2zg1.png', title: 'A long time ago in a galaxy far, far away...', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/ta0w4rbncqyg1.png', title: 'Welcome To MIAMI!', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/qsigg5e29q1h1.png', title: 'TIC-TAC-RAGE', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/ruixv7yk0fah1.png', title: 'Dogecoin under seven cents', subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/7x5zvajeg3ah1.png', title: 'If you bought $1 of DOGE here (2017)', subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/m21nabo4hsbh1.png', title: 'Me after adding one small feature to the project', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/9on1ujbr7pch1.png', title: 'Baby birds in a nest', subreddit: 'aww' },
  { url: 'https://i.redd.it/uc5ioco1qnch1.png', title: 'Made a very curious little friend today!', subreddit: 'aww' },
]

function shuffled(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function fetchSubreddit(subreddit) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}/${MEMES_PER_SUBREDDIT}`, {
      signal: controller.signal,
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.memes || [])
      .filter(
        (m) =>
          !m.nsfw &&
          !m.spoiler &&
          /^https:\/\/i\.redd\.it\/.+\.(png|jpe?g|webp)$/i.test(m.url) &&
          m.url.length <= 180,
      )
      .map((m) => ({ url: m.url, title: m.title, subreddit }))
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/** Async — pulls a fresh live pool and picks one URL not already in `usedUrls`. */
export async function pickUniqueMeme(usedUrls) {
  const used = new Set(usedUrls || [])

  try {
    const batches = await Promise.all(shuffled(SAFE_SUBREDDITS).map(fetchSubreddit))
    const pool = batches.flat().filter((m) => !used.has(m.url))
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)]
  } catch {
    // fall through to fallback pool below
  }

  const free = FALLBACK_MEMES.filter((m) => !used.has(m.url))
  if (!free.length) return null
  return free[Math.floor(Math.random() * free.length)]
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'is', 'are',
  'was', 'were', 'be', 'my', 'your', 'our', 'this', 'that', 'with', 'from',
])

function cleanWords(title) {
  return title
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()))
}

export function memeToName(title, fallback) {
  const words = cleanWords(title)
  if (!words.length) return fallback
  const name = words.slice(0, 4).join(' ')
  return name.length > 28 ? name.slice(0, 28).trim() : name
}

export function memeToSymbol(title, seq) {
  const words = cleanWords(title)
  let base = ''
  if (words.length >= 2) {
    base = words
      .slice(0, 4)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
  } else if (words.length === 1) {
    base = words[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase()
  }
  if (base.length < 3) base = `MEME${seq % 1000}`.slice(0, 6)
  if (base.length < 4) base = `${base}${seq % 10}`
  return base.slice(0, 8)
}

/** Real, per-coin description built from the actual meme's own title/subreddit — never generic boilerplate alone. */
export function memeToBio(meme, symbol) {
  const sub = meme.subreddit ? `r/${meme.subreddit}` : 'the timeline'
  return `"${meme.title}"\n\nBorn from ${sub}. Community-driven meme on the curve.\nFixed supply · fair launch · no team dump · NFA DYOR.\n$${symbol} is managed on-curve — trade with Phantom anytime.`
}
