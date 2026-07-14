/**
 * Real meme-style coin art via stable CDNs (no Reddit hotlink breakage,
 * no SVG placeholders). Deterministic seeds → same coin always same art.
 */

import { realTokenImageUrl } from './realTokenImages'

export type CuratedMeme = {
  url: string
  title: string
  subreddit: string
}

const TITLES: { title: string; subreddit: string; seed: string }[] = [
  { title: 'Gigachad Solana', subreddit: 'solana', seed: 'gigachad-sol' },
  { title: 'Pepe Moon Mission', subreddit: 'pepe', seed: 'pepe-moon-1' },
  { title: 'Doge to the Moon', subreddit: 'dogecoin', seed: 'doge-moon-2' },
  { title: 'Wojak Still Holding', subreddit: 'memes', seed: 'wojak-hold' },
  { title: 'Based Department', subreddit: 'cryptomemes', seed: 'based-dept' },
  { title: 'Sir This Is A Casino', subreddit: 'degen', seed: 'casino-sir' },
  { title: 'Diamond Hands Only', subreddit: 'cryptomemes', seed: 'diamond-hands' },
  { title: 'Paper Hands Left Chat', subreddit: 'cryptomemes', seed: 'paper-hands' },
  { title: 'When Chart Goes Vertical', subreddit: 'memes', seed: 'vertical-chart' },
  { title: 'Average Degen Morning', subreddit: 'degen', seed: 'degen-am' },
  { title: 'Bulls vs Bears', subreddit: 'cryptomemes', seed: 'bulls-bears' },
  { title: 'Probably Nothing', subreddit: 'shitpost', seed: 'probably-nothing' },
  { title: 'Few Understand', subreddit: 'memes', seed: 'few-understand' },
  { title: 'Literally Me Buying', subreddit: 'dankmemes', seed: 'literally-me' },
  { title: 'Trust The Process', subreddit: 'wholesomememes', seed: 'trust-process' },
  { title: 'WAGMI Forever', subreddit: 'solana', seed: 'wagmi-4ever' },
  { title: 'NPC Behavior Detected', subreddit: 'memes', seed: 'npc-detect' },
  { title: 'Real Ones Know', subreddit: 'cryptomemes', seed: 'real-ones' },
  { title: 'This Is The Way', subreddit: 'memes', seed: 'this-is-way' },
  { title: 'Cope And Seethe', subreddit: 'shitpost', seed: 'cope-seethe' },
  { title: 'Exit Liquidity Arrives', subreddit: 'degen', seed: 'exit-liq' },
  { title: 'Moon Mission Briefing', subreddit: 'solana', seed: 'moon-brief' },
  { title: 'Ape First Ask Later', subreddit: 'degen', seed: 'ape-first' },
  { title: 'Community Takeover', subreddit: 'cryptomemes', seed: 'cto-live' },
  { title: 'Chart Looking Juicy', subreddit: 'cryptomemes', seed: 'juicy-chart' },
  { title: 'Bags Of Glory', subreddit: 'memes', seed: 'bags-glory' },
  { title: 'Pump The Volume', subreddit: 'solana', seed: 'pump-vol' },
  { title: 'Hold Through The Dip', subreddit: 'wholesomememes', seed: 'hold-dip' },
  { title: 'Solana Summer', subreddit: 'solana', seed: 'sol-summer' },
  { title: 'Degen Hours Only', subreddit: 'degen', seed: 'degen-hours' },
  { title: 'Pepe Is Back', subreddit: 'pepe', seed: 'pepe-back' },
  { title: 'Cat Coin Supremacy', subreddit: 'memes', seed: 'cat-coin' },
  { title: 'Doggo Inu Rising', subreddit: 'dogecoin', seed: 'doggo-inu' },
  { title: 'Frog On Curve', subreddit: 'pepe', seed: 'frog-curve' },
  { title: 'Laser Eyes Energy', subreddit: 'cryptomemes', seed: 'laser-eyes' },
  { title: 'Green Candle Ritual', subreddit: 'degen', seed: 'green-ritual' },
  { title: 'Red Day Therapy', subreddit: 'wholesomememes', seed: 'red-therapy' },
  { title: 'Whale Watching', subreddit: 'solana', seed: 'whale-watch' },
  { title: 'Shrimp Portfolio', subreddit: 'memes', seed: 'shrimp-port' },
  { title: 'Alpha In Bio', subreddit: 'cryptomemes', seed: 'alpha-bio' },
  { title: 'Beta Testing Life', subreddit: 'dankmemes', seed: 'beta-life' },
  { title: 'Sigma Grindset Coin', subreddit: 'memes', seed: 'sigma-grind' },
  { title: 'Chad Liquidity', subreddit: 'degen', seed: 'chad-liq' },
  { title: 'Virgin Sell Button', subreddit: 'shitpost', seed: 'virgin-sell' },
  { title: 'Bonk Moment', subreddit: 'solana', seed: 'bonk-moment' },
  { title: 'Popcat Stare', subreddit: 'memes', seed: 'popcat-stare' },
  { title: 'Wif Hat Club', subreddit: 'solana', seed: 'wif-hat' },
  { title: 'Moo Deng Vibes', subreddit: 'memes', seed: 'moodeng' },
  { title: 'Goat Status', subreddit: 'cryptomemes', seed: 'goat-status' },
  { title: 'Chill Guy Coin', subreddit: 'memes', seed: 'chill-guy' },
  { title: 'Fartcoin Lore', subreddit: 'shitpost', seed: 'fart-lore' },
  { title: 'AI Agent Bags', subreddit: 'cryptomemes', seed: 'ai-bags' },
  { title: 'Terminal Degen', subreddit: 'degen', seed: 'term-degen' },
  { title: 'On-Chain Comedy', subreddit: 'memes', seed: 'onchain-comedy' },
  { title: 'Curve Wizard', subreddit: 'solana', seed: 'curve-wizard' },
  { title: 'Fair Launch Only', subreddit: 'cryptomemes', seed: 'fair-launch' },
  { title: 'No Team Dump', subreddit: 'wholesomememes', seed: 'no-dump' },
  { title: 'Community First', subreddit: 'wholesomememes', seed: 'comm-first' },
  { title: 'Send It Higher', subreddit: 'degen', seed: 'send-higher' },
  { title: 'Never Selling', subreddit: 'cryptomemes', seed: 'never-sell' },
  { title: 'One More Candle', subreddit: 'memes', seed: 'one-more' },
  { title: 'Touch Grass Later', subreddit: 'dankmemes', seed: 'touch-grass' },
  { title: 'Markets Open', subreddit: 'solana', seed: 'mkts-open' },
  { title: 'Liquidity Dance', subreddit: 'degen', seed: 'liq-dance' },
  { title: 'Ticker Goes Hard', subreddit: 'cryptomemes', seed: 'ticker-hard' },
  { title: 'Name Is The Vibe', subreddit: 'memes', seed: 'name-vibe' },
  { title: 'Avatar Energy', subreddit: 'memes', seed: 'avatar-nrg' },
  { title: 'Meme Supercycle', subreddit: 'cryptomemes', seed: 'super-cycle' },
  { title: 'Retail FOMO', subreddit: 'degen', seed: 'retail-fomo' },
  { title: 'Smart Money Copy', subreddit: 'cryptomemes', seed: 'smart-copy' },
  { title: 'Late Night Entry', subreddit: 'shitpost', seed: 'late-entry' },
  { title: 'Early Bird Bags', subreddit: 'wholesomememes', seed: 'early-bags' },
  { title: 'Mid Curve Wisdom', subreddit: 'memes', seed: 'mid-curve' },
  { title: 'High Curve Genius', subreddit: 'cryptomemes', seed: 'high-curve' },
  { title: 'Low Curve Chaos', subreddit: 'dankmemes', seed: 'low-curve' },
  { title: 'Solana Speedrun', subreddit: 'solana', seed: 'sol-speed' },
  { title: 'Phantom Ready', subreddit: 'solana', seed: 'phantom-rdy' },
  { title: 'Jupiter Route', subreddit: 'solana', seed: 'jup-route' },
  { title: 'Raydium Splash', subreddit: 'solana', seed: 'ray-splash' },
  { title: 'Bonding Curve Baby', subreddit: 'degen', seed: 'bonding-baby' },
  { title: 'Graduation Day', subreddit: 'cryptomemes', seed: 'grad-day' },
  { title: 'King Of The Hill', subreddit: 'memes', seed: 'koth-king' },
  { title: 'Trending Right Now', subreddit: 'memes', seed: 'trending-now' },
  { title: 'Mayhem Mode', subreddit: 'degen', seed: 'mayhem-mode' },
  { title: 'Featured Fren', subreddit: 'wholesomememes', seed: 'feat-fren' },
]

/** Full curated set — all real HTTPS images */
export const CURATED_MEMES: CuratedMeme[] = TITLES.map((t, i) => ({
  url: realTokenImageUrl(t.seed, i),
  title: t.title,
  subreddit: t.subreddit,
}))

/** Deterministic pick so the same token seed always renders the same art. */
export function curatedMemeFor(seed: string, hashFn: (s: string) => number): CuratedMeme {
  return CURATED_MEMES[hashFn(seed) % CURATED_MEMES.length]
}
