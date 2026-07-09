/**
 * Official platform token channel / treasury on Solana.
 * All create fees + buy SOL route here.
 * Create-coin mints can be configured to use this as platform wallet display.
 */

export const PLATFORM_CHANNEL = {
  /** Official treasury wallet (receives fees + holds platform tokens) */
  treasury: 'ApuMe4AJTv7B7rLord3pxjGAAhmeuwR9ttaQVkJShUuh',
  name: 'Pump Channel',
  symbol: 'PCHAN',
  description:
    'Official pump.fun clone token channel on Solana. Fees and launches route through this wallet.',
  cluster: 'devnet' as const,
  /** Set after first successful mint on this wallet */
  mint: '' as string,
  socials: {
    website: typeof window !== 'undefined' ? window.location.origin : '',
    twitter: '',
    telegram: '',
  },
}

export const DEFAULT_TOKEN = {
  name: PLATFORM_CHANNEL.name,
  symbol: PLATFORM_CHANNEL.symbol,
  supply: 1_000_000_000,
  description: PLATFORM_CHANNEL.description,
}
