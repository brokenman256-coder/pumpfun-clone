const BOUNTIES = [
  {
    title: 'Place a Bet on Howl.com at the Peak of Mt. Everest',
    reward: '$62,082',
    left: '1d 8h left',
    subs: 9,
    hearts: 310,
    tag: 'howlcom',
    img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
  },
  {
    title: 'Pumpkin bounty of all time — BULLCALF mega',
    reward: '$5,620',
    left: '3d left',
    subs: 42,
    hearts: 180,
    tag: 'bullcalf',
    img: 'https://api.dicebear.com/7.x/shapes/svg?seed=bounty2&backgroundColor=86efac',
  },
  {
    title: 'Ship a viral meme for the community',
    reward: '$1,200',
    left: '12h left',
    subs: 18,
    hearts: 96,
    tag: 'meme',
    img: 'https://api.dicebear.com/7.x/bottts/svg?seed=bounty3&backgroundColor=1a1b22',
  },
]

/** Horizontal "Top bounties" row like pump.fun mobile */
export function BountiesStrip() {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold text-white">
          <span className="text-[#86efac]">💰</span> Top bounties
        </h2>
        <button type="button" className="text-[12px] text-[#8b8d97]">
          View all
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {BOUNTIES.map((b) => (
          <article
            key={b.title}
            className="w-[260px] shrink-0 overflow-hidden rounded-2xl border border-[#1f2028] bg-[#14151b]"
          >
            <div className="relative h-28">
              <img src={b.img} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-2 top-2 rounded-md bg-[#86efac] px-1.5 py-0.5 text-[10px] font-bold uppercase text-black">
                OPEN
              </span>
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-[13px] font-semibold text-white">{b.title}</p>
              <p className="mt-1 text-[18px] font-black text-[#86efac]">
                {b.reward}{' '}
                <span className="text-[10px] font-bold tracking-wide text-[#6b6d78]">REWARD</span>
              </p>
              <p className="mt-1 text-[11px] text-[#6b6d78]">
                ⏱ {b.left} · ⚑ {b.subs} · ♡ {b.hearts}
              </p>
              <p className="mt-0.5 text-[11px] text-[#8b8d97]">🔥 {b.tag}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
