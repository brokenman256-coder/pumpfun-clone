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
]

export function CommunityFeed() {
  const tokens = useStore((s) => s.tokens)
  const comments = useStore((s) => s.comments)

  const posts = useMemo(() => {
    const list = comments.slice(0, 30).map((c, i) => {
      const tok = tokens.find((t) => t.id === c.tokenId)
      return {
        id: c.id,
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
    if (list.length < 12) {
      tokens.slice(0, 16).forEach((t, i) => {
        list.push({
          id: `feed_${t.id}`,
          handle: HANDLES[i % HANDLES.length],
          followers: 24 + i * 11,
          text: [
            `Every community has a beginning. Stay for the story — $${t.symbol}`,
            `Building every day. That's our focus. 🟢 $${t.symbol}`,
            `You're free to watch. You're free to ask. $${t.symbol}`,
            `Glad you're here. Strong communities start small. $${t.symbol}`,
          ][i % 4],
          symbol: t.symbol,
          tokenId: t.id,
          imageUrl: t.imageUrl,
          createdAt: Date.now() - i * 7_200_000,
          likes: 12 + (i % 20),
        })
      })
    }
    return list.sort((a, b) => b.createdAt - a.createdAt)
  }, [comments, tokens])

  return (
    <div className="mx-auto max-w-lg px-3 pb-8 pt-3">
      <div className="mb-4 rounded-2xl border border-[#86efac]/15 bg-gradient-to-b from-[#0f1f16] to-[#14151b] p-4">
        <h1 className="text-lg font-bold text-white">◎ Coin communities</h1>
        <p className="mt-1 text-[13px] text-[#8b8d97]">
          Latest posts from every coin community, in one timeline.
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#86efac]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#86efac]" />
          LIVE
        </p>
      </div>
      <div className="space-y-3">
        {posts.map((p) => (
          <article key={p.id} className="rounded-2xl border border-[#1f2028] bg-[#14151b] p-3.5">
            <div className="flex gap-2.5">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#1a1b22]">
                {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="font-semibold">@{p.handle}</span>
                  <span className="text-[#6b6d78]">· {p.followers} followers</span>
                  <Link to={`/coin/${p.tokenId}`} className="rounded-full bg-[#86efac]/10 px-2 py-0.5 text-[11px] font-bold text-[#86efac]">
                    ${p.symbol}
                  </Link>
                </div>
                <p className="mt-0.5 text-[11px] text-[#6b6d78]">{timeAgo(p.createdAt)}</p>
                <p className="mt-2 text-[14px] leading-relaxed">{p.text}</p>
                {p.imageUrl && (
                  <Link to={`/coin/${p.tokenId}`} className="mt-3 block overflow-hidden rounded-xl">
                    <img src={p.imageUrl} alt="" className="max-h-56 w-full object-cover" loading="lazy" />
                  </Link>
                )}
                <p className="mt-2 text-[12px] text-[#6b6d78]">♡ {p.likes}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
