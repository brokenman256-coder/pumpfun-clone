/**
 * Real HTTPS token art (no SVG placeholders).
 * Uses stable CDNs that allow hotlinking so coins look like live memecoins.
 */

const STYLES = [
  'fun-emoji',
  'bottts-neutral',
  'thumbs',
  'shapes',
  'identicon',
  'adventurer',
  'avataaars',
  'lorelei',
  'pixel-art',
  'notionists',
] as const

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

/** Unique real image URL for a coin seed */
export function realTokenImageUrl(seed: string, styleHint?: number): string {
  const h = hashSeed(seed || 'meme')
  const style = STYLES[(styleHint ?? h) % STYLES.length]
  const safe = encodeURIComponent(seed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || `m${h}`)

  // Rotate providers so the board looks varied
  const mode = h % 5
  if (mode === 0) {
    return `https://api.dicebear.com/9.x/${style}/png?seed=${safe}&size=256&backgroundType=gradientLinear`
  }
  if (mode === 1) {
    const set = 1 + (h % 4)
    return `https://robohash.org/${safe}.png?set=set${set}&size=256x256&bgset=bg1`
  }
  if (mode === 2) {
    return `https://avatar.vercel.sh/${safe}.png?size=256`
  }
  if (mode === 3) {
    return `https://api.dicebear.com/9.x/${style}/png?seed=${safe}x&size=256`
  }
  // Real photos as occasional variety
  return `https://picsum.photos/seed/${safe}/256/256`
}

/** True if URL is a fake/placeholder (SVG data URI or empty) */
export function isPlaceholderImage(url?: string | null): boolean {
  if (!url) return true
  if (url.startsWith('data:image/svg')) return true
  if (url.startsWith('data:image/svg+xml')) return true
  // old broken procedural
  if (url.includes('data:image') && url.includes('svg')) return true
  return false
}

/** Prefer real URL; rewrite placeholders to CDN art */
export function ensureRealImageUrl(url: string | undefined, seed: string): string {
  if (url && !isPlaceholderImage(url) && /^https?:\/\//i.test(url)) {
    // Reddit often blocks hotlinking — rewrite to stable CDN art
    if (/i\.redd\.it|preview\.redd\.it|reddit\.com/i.test(url)) {
      return realTokenImageUrl(seed + url.slice(-12))
    }
    return url
  }
  return realTokenImageUrl(seed)
}
