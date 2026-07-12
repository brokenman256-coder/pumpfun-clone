/**
 * Real, manually safety-reviewed meme images (not just API nsfw/spoiler
 * flags — each one was viewed before inclusion) used as coin art for the
 * simulated/demo board (seed tokens + local bot fleet). Real on-chain
 * coins get their art from whatever the creator (or scripts/bot-launch.mjs)
 * actually posted; this pool is only for the client-side simulated ones.
 *
 * All URLs are i.redd.it (static images only — GIFs from the same curation
 * pass were excluded for being 50-100MB, impractical as coin avatars. Two
 * more candidates were excluded despite passing the nsfw/spoiler API flags
 * because manual review found them inappropriate: a conspiracy-theory
 * collage and a lewd cartoon.)
 */
export type CuratedMeme = {
  url: string
  title: string
  subreddit: string
}

export const CURATED_MEMES: CuratedMeme[] = [
  { url: 'https://i.redd.it/h29hoaal8g6h1.png', title: 'Your Honor, Do I Rest My Case?', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/nx7llsqq0j0h1.png', title: 'We are NOT the same...', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/xib83t2nc2zg1.png', title: 'A long time ago in a galaxy far, far away...', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/ta0w4rbncqyg1.png', title: 'Welcome To MIAMI!', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/qsigg5e29q1h1.png', title: 'TIC-TAC-RAGE', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/ruixv7yk0fah1.png', title: 'Dogecoin under seven cents', subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/7x5zvajeg3ah1.png', title: 'If you bought $1 of DOGE here (2017)', subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/ufwedwbyb8bh1.png', title: "uhh, he's just standing there... menacingly", subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/m21nabo4hsbh1.png', title: 'Me after adding one small feature to the project', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/xw09xoi2ysbh1.png', title: 'idt inputs dont work at all', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/0wrb16tjfrbh1.png', title: 'Me after "accidentally" generating 19k+ URLs', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/9on1ujbr7pch1.png', title: 'Baby birds in a nest', subreddit: 'aww' },
  { url: 'https://i.redd.it/uc5ioco1qnch1.png', title: 'Made a very curious little friend today!', subreddit: 'aww' },
]

/** Deterministic pick so the same token seed always renders the same art. */
export function curatedMemeFor(seed: string, hashFn: (s: string) => number): CuratedMeme {
  return CURATED_MEMES[hashFn(seed) % CURATED_MEMES.length]
}
