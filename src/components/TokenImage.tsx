import { useEffect, useState } from 'react'
import { ensureRealImageUrl, isPlaceholderImage, realTokenImageUrl } from '../lib/realTokenImages'

/**
 * Always shows a real coin picture (HTTPS CDN).
 * Rewrites SVG placeholders / broken Reddit links automatically.
 */
export function TokenImage({
  src,
  seed,
  emoji: _emoji,
  alt,
  className = '',
}: {
  src: string
  seed: string
  emoji?: string
  alt: string
  className?: string
}) {
  const primary = ensureRealImageUrl(src, seed || alt)
  const [url, setUrl] = useState(primary)
  const [tries, setTries] = useState(0)

  useEffect(() => {
    setUrl(ensureRealImageUrl(src, seed || alt))
    setTries(0)
  }, [src, seed, alt])

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        // Cascade through alternate real image providers
        if (tries === 0) {
          setTries(1)
          setUrl(realTokenImageUrl(`${seed}-fb1`, 1))
        } else if (tries === 1) {
          setTries(2)
          setUrl(realTokenImageUrl(`${seed}-fb2`, 3))
        } else if (tries === 2) {
          setTries(3)
          setUrl(`https://avatar.vercel.sh/${encodeURIComponent(seed || alt)}.png?size=256`)
        } else if (!isPlaceholderImage(url)) {
          setTries(4)
          setUrl(realTokenImageUrl(`${seed}-final`, 0))
        }
      }}
    />
  )
}
