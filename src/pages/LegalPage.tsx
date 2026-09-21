import { Link, useLocation } from 'react-router-dom'

const PAGES: Record<string, { title: string; body: string[] }> = {
  '/about': {
    title: 'About NOVA',
    body: [
      'NOVA is a Solana trading venue for listed tokens. The product has been in continuous operation since 2021.',
      'Traders connect a self-custody wallet, place orders, and receive tokens in that wallet. We do not provide investment advice, brokerage discretionary management, or guaranteed returns.',
      'Markets can be volatile. Listings may be paused or removed when required for operational integrity.',
    ],
  },
  '/terms': {
    title: 'Terms of use',
    body: [
      'By accessing NOVA you agree to use the interface at your own risk. You are responsible for your wallet, keys, and transactions.',
      'Access may be restricted in jurisdictions where digital-asset trading is not permitted. You confirm you are of legal age in your place of residence.',
      'NOVA may update these terms. Continued use after an update constitutes acceptance. Trades are final once confirmed on Solana.',
    ],
  },
  '/privacy': {
    title: 'Privacy',
    body: [
      'We do not require an email or password to trade. Wallet addresses and on-chain activity are public by nature of Solana.',
      'Interface logs may include technical data (browser, IP, error traces) used to operate and secure the service. We do not sell personal data.',
      'Third-party RPCs, wallet extensions, and block explorers apply their own policies. Review those before connecting a wallet.',
    ],
  },
  '/risk': {
    title: 'Risk disclosure',
    body: [
      'Digital assets can lose all of their value, including on the first trade. Liquidity can disappear. Tokens may be unaudited.',
      'New listings are especially volatile. Size positions you can afford to lose. Past market activity is not an indicator of future results.',
      'Network fees, slippage, and failed transactions can occur. NOVA is not liable for wallet malware, phishing, or user error.',
    ],
  },
}

export function LegalPage() {
  const { pathname } = useLocation()
  const page = PAGES[pathname] || PAGES['/about']
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#e8a35a]">NOVA · Est. 2021</p>
      <h1 className="mt-2 font-display text-3xl text-[#f4ead8]">{page.title}</h1>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-[#b7a99a]">
        {page.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <Link to="/" className="mt-8 inline-block text-[12px] text-[#e8a35a]">
        ← Markets
      </Link>
    </div>
  )
}
