/**
 * Each house coin is a unique community room — different name, palette,
 * picture, and voice. Never reuse the same art seed.
 */
import { realTokenImageUrl } from '../lib/realTokenImages'

const DISTRICTS = [
  'Dusk Harbor', 'Kite District', 'Velvet Pier', 'Ash Arcade', 'Copper Row',
  'Orchid Alley', 'Glass Market', 'Iris Dock', 'Salt Chapel', 'Neon Orchard',
  'Moth Archive', 'Ruby Kiln', 'Fog Circus', 'Ivory Yard', 'Echo Conservatory',
  'Lantern Quay', 'Obsidian Cafe', 'Pearl Workshop', 'Storm Atelier', 'Gilded Pit',
]

const VOICES = [
  'A late-night drawing club that trades sketches for candles.',
  'Harbor radio kids looping one song until the chart turns gold.',
  'A kiln guild that fires clay and coins in the same oven.',
  'Rooftop moth collectors who only post after midnight.',
  'A velvet salon that treats every candle like a guest list.',
  'Dock poets printing zines on copper plate.',
  'An arcade that only accepts jokes as collateral.',
  'Fog circus hands betting on which lantern lasts.',
]

const EMOJI = ['✶', '☾', '✧', '✦', '☄', '🜂', '🜄', '◎', '⌘', '✺']

const PALETTES = [
  { accent: '#e8a35a', ink: '#2a1208' },
  { accent: '#c084fc', ink: '#1a0824' },
  { accent: '#fb7185', ink: '#2a0810' },
  { accent: '#5eead4', ink: '#04201c' },
  { accent: '#fbbf24', ink: '#241a04' },
  { accent: '#93c5fd', ink: '#071428' },
  { accent: '#f9a8d4', ink: '#28081c' },
  { accent: '#a3e635', ink: '#142004' },
]

export type CommunityLook = {
  community: string
  voice: string
  accent: string
  ink: string
  emoji: string
  imageUrl: string
  imageHue: number
}

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h >>> 0)
}

export function uniqueArtSeed(seq: number, extra = ''): string {
  return `atlas_${seq}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}_${extra}`
}

export function paintCommunity(seq: number, usedUrls: Set<string>): CommunityLook {
  const h = hash(uniqueArtSeed(seq))
  const district = DISTRICTS[(h + seq) % DISTRICTS.length]
  const voice = VOICES[(h >> 3) % VOICES.length]
  const pal = PALETTES[(h >> 5) % PALETTES.length]
  let imageUrl = ''
  for (let i = 0; i < 10; i++) {
    const seed = uniqueArtSeed(seq + i * 97, district)
    imageUrl = realTokenImageUrl(seed, h + i)
    if (!usedUrls.has(imageUrl)) break
  }
  usedUrls.add(imageUrl)
  return {
    community: district,
    voice,
    accent: pal.accent,
    ink: pal.ink,
    emoji: EMOJI[(h >> 7) % EMOJI.length],
    imageUrl,
    imageHue: h % 360,
  }
}

export function communityBio(look: CommunityLook, symbol: string, title?: string): string {
  const hook = title ? `${title}\n\n` : ''
  return `${hook}${look.voice}\n\n${look.community}`
}
