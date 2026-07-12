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
  { url: 'https://i.redd.it/qj5731jqvoah1.png', title: 'Helping A Horror', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/c3phfu13z9ch1.png', title: 'Professional Courtesy', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/ehckaftwqhah1.png', title: 'A Helping Horror', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/7ybkfaj6fz1h1.png', title: "Don't tell the McDonald's employee", subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/5kqyfgx6k39h1.png', title: 'Quest (sort of) complete', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/w4gvd7qxovbh1.png', title: 'Would you like a snack?', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/8nhimqy50j5h1.png', title: "I'm doing my part!", subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/3jen3yy57z0h1.png', title: 'How I sleep after meditating instead of my phone', subreddit: 'wholesomememes' },
  { url: 'https://i.redd.it/t6vkax2og5yg1.png', title: '2021 vs 2026 crypto market', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/d4sg6zfzpk2h1.png', title: "I don't check prices, prices check me", subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/682fh5ojsa3h1.png', title: 'The Bitcoin Standard', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/2owzp8g37i1h1.png', title: 'Explaining crypto payments to friends', subreddit: 'cryptocurrencymemes' },
  { url: 'https://i.redd.it/z7fbv4c7qp9h1.png', title: 'Dogecoin bear market overlay', subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/ryot4trt5qah1.png', title: 'Resting over unbroken support', subreddit: 'dogecoin' },
  { url: 'https://i.redd.it/so1pngecfjch1.png', title: 'AI agent changed 47 files', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/44021xzpw0ch1.png', title: 'If filesystem has more space than RAM', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/34l7iufud86h1.png', title: 'Back to work', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/vi5wzws7o55h1.png', title: 'Let it bleed', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/m77yffqgqybh1.png', title: 'Why would I exit vim?', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/o0iehm8bzrch1.png', title: 'Eighties programmers were a different breed', subreddit: 'ProgrammerHumor' },
  { url: 'https://i.redd.it/ra755pg2ivbh1.png', title: "That's why vibe coding is efficient", subreddit: 'ProgrammerHumor' },
]

/** Deterministic pick so the same token seed always renders the same art. */
export function curatedMemeFor(seed: string, hashFn: (s: string) => number): CuratedMeme {
  return CURATED_MEMES[hashFn(seed) % CURATED_MEMES.length]
}
