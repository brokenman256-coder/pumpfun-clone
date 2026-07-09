import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { timeAgo } from '../lib/format'

const HANDLES = [
  'OrbitSignalLab',
  'SWIFEProtocol',
  'AIWhaleSignal',
  'PulseChainObs',
  'EmberChainX',
  'PolygonnftClub',
  'sussydev67',
  'anarchicor',
]

/**
 * "Coin communities" timeline — pump.fun mobile social feed look.
 */
export function CommunityFeed() {
  const tokens = useStore((s) => s.tokens)
  const comments = useStore((s) => s.comments)

  const posts = useMemo(() => {
    const fromComments = comments.slice(0, 40).map((c, i) => {
      const tok = tokens.find((t) => t.id === c.tokenId)
      return {
        id: c.id,
        author: c.author.replace(/^0x|^[A-Za-z0-9]{4}/, HANDLES[i % HANDLES.length]),
        handle: HANDLES[i % HANDLES.length],
        followers: 20 + ((i * 17) % 1300),
        text: c.text,
        symbol: tok?.symbol ?? 'PUMP',
        tokenId: c.tokenId,
        imageUrl: tok?.imageUrl,
        createdAt: c.createdAt,
        likes: c.likes,
      }
    })

    // Seed community posts from top tokens if few comments
    if (fromComments.length < 12) {
      tokens.slice(0, 16).forEach((t, i) => {
        fromComments.push({
          id: `feed_${t.id}`,
          author: HANDLES[i % HANDLES.length],
          handle: HANDLES[i % HANDLES.length],
          followers: 24 + i * 11,
          text: [
            `Every community has a beginning. Stay for the story — $${t.symbol}`,
            `Building every single day. That's our focus. 🟢 $${t.symbol}`,
            `You're free to watch. You're free to ask questions. $${t.symbol}`,
            `Glad you're here. Strong communities start small. $${t.symbol}`,
          ][i % 4],
          symbol: t.symbol,
          tokenId: t.id,
          imageUrl: t.imageUrl,
          createdAt: Date.now() - i * 3_600_000 * 2,
          likes: 12 + (i % 20),
        })
      })
    }

    return fromComments.sort((a, b) => b.createdAt - a.createdAt)
  }, [comments, tokens])

  return (
    <div className="mx-auto max-w-lg px-3 pb-24 pt-3">
      <div className="mb-4 rounded-2xl border border-[#86efac]/15 bg-gradient-to-b from-[#0f1f16] to-[#14151b] p-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">◎</span>
          <h1 className="text-lg font-bold text-white">Coin communities</h1>
        </div>
        <p className="mt-1 text-[13px] text-[#8b8d97]">
          Latest posts from every coin community, in one timeline.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#86efac]">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#86efac]" />
          LIVE
        </p>
      </div>

      <div className="space-y-3">
        {posts.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-3.5"
          >
            <div className="flex items-start gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1b22] text-sm">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  '🟢'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px]">
                  <span className="font-semibold text-white">@{p.handle}</span>
                  <span className="text-[#6b6d78]">· {p.followers} followers</span>
                  <Link
                    to={`/coin/${p.tokenId}`}
                    className="rounded-full bg-[#86efac]/10 px-2 py-0.5 text-[11px] font-bold text-[#86efac]"
                  >
                    ${p.symbol}
                  </Link>
                </div>
                <p className="mt-0.5 text-[11px] text-[#6b6d78]">{timeAgo(p.createdAt)}</p>
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-[#e8e8ed]">
                  {p.text}
                </p>
                {p.imageUrl && (
                  <Link to={`/coin/${p.tokenId}`} className="mt-3 block overflow-hidden rounded-xl">
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="max-h-56 w-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                )}
                <div className="mt-2 flex items-center gap-1 text-[12px] text-[#6b6d78]">
                  <span>♡</span> {p.likes}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
