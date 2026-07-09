import { useState } from 'react'
import { tokenImageUrl } from '../lib/tokenImage'

/**
 * Always shows a token picture.
 * Tries imageUrl first; on error falls back to generated emoji avatar.
 */
export function TokenImage({
  src,
  seed,
  emoji,
  alt,
  className = '',
}: {
  src: string
  seed: string
  emoji?: string
  alt: string
  className?: string
}) {
  const fallback = tokenImageUrl(seed || alt, emoji)
  const [url, setUrl] = useState(src || fallback)

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => {
        if (url !== fallback) setUrl(fallback)
      }}
    />
  )
}
