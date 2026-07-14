/**
 * Popular Solana wallets used for meme-coin trading.
 * `joinUrl` = official download / signup page.
 */

export type WalletCatalogItem = {
  id: string
  /** Matches wallet-adapter name when connectable */
  adapterName?: string
  label: string
  blurb: string
  emoji: string
  /** Official install / join link */
  joinUrl: string
  /** Highlight for memecoin traders */
  popular?: boolean
}

export const MEMECOIN_WALLETS: WalletCatalogItem[] = [
  {
    id: 'phantom',
    adapterName: 'Phantom',
    label: 'Phantom',
    blurb: '#1 for Solana memecoins',
    emoji: '👻',
    joinUrl: 'https://phantom.app/download',
    popular: true,
  },
  {
    id: 'solflare',
    adapterName: 'Solflare',
    label: 'Solflare',
    blurb: 'Powerful Solana wallet',
    emoji: '🔥',
    joinUrl: 'https://solflare.com/download',
    popular: true,
  },
  {
    id: 'backpack',
    adapterName: 'Backpack',
    label: 'Backpack',
    blurb: 'xNFT + trading wallet',
    emoji: '🎒',
    joinUrl: 'https://backpack.app/download',
    popular: true,
  },
  {
    id: 'glow',
    adapterName: 'Glow',
    label: 'Glow',
    blurb: 'Simple Solana wallet',
    emoji: '✨',
    joinUrl: 'https://glow.app/',
  },
  {
    id: 'trust',
    label: 'Trust Wallet',
    blurb: 'Multi-chain · Solana support',
    emoji: '🛡️',
    joinUrl: 'https://trustwallet.com/download',
  },
  {
    id: 'coinbase',
    adapterName: 'Coinbase Wallet',
    label: 'Coinbase Wallet',
    blurb: 'Easy onboarding',
    emoji: '🔵',
    joinUrl: 'https://www.coinbase.com/wallet/downloads',
  },
  {
    id: 'exodus',
    label: 'Exodus',
    blurb: 'Desktop & mobile',
    emoji: '🌌',
    joinUrl: 'https://www.exodus.com/download/',
  },
]

export function openWalletJoin(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
