/**
 * Client-side fetch of a real, safety-filtered internet meme image — used by
 * the "random meme" button on the Create page. Mirrors the filtering rules
 * in scripts/bot-launch.mjs (never nsfw/spoiler, curated subreddits only).
 */
const SAFE_SUBREDDITS = ['wholesomememes', 'cryptocurrencymemes', 'dogecoin', 'ProgrammerHumor']

export async function fetchSafeMeme(): Promise<{ url: string; title: string } | null> {
  const subreddit = SAFE_SUBREDDITS[Math.floor(Math.random() * SAFE_SUBREDDITS.length)]
  try {
    const res = await fetch(`https://meme-api.com/gimme/${subreddit}/20`)
    if (!res.ok) return null
    const data = await res.json()
    type Meme = { url: string; title: string; nsfw?: boolean; spoiler?: boolean }
    const candidates = ((data.memes || []) as Meme[]).filter(
      (m) => !m.nsfw && !m.spoiler && /^https:\/\/i\.redd\.it\//.test(m.url) && m.url.length <= 200,
    )
    if (candidates.length === 0) return null
    const picked = candidates[Math.floor(Math.random() * candidates.length)]
    return { url: picked.url, title: picked.title }
  } catch {
    return null
  }
}
