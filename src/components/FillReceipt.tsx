import { phantomTokenUrl, solscanTokenUrl } from '../lib/coinHealth'

export type FillInfo = {
  side: 'buy' | 'sell'
  symbol: string
  mint?: string | null
  sol: number
  tokens?: number
}

export function FillReceipt({
  fill,
  onClose,
  showSellGuide,
  onSellGuide,
}: {
  fill: FillInfo
  onClose: () => void
  showSellGuide?: boolean
  onSellGuide?: () => void
}) {
  const mint = fill.mint && fill.mint.length >= 32 ? fill.mint : null
  return (
    <div className="mt-3 rounded-2xl border border-[#e8a35a]/30 bg-[#1a1018] p-3">
      <p className="font-display text-lg text-[#f4ead8]">
        {fill.side === 'buy' ? 'Bought' : 'Sold'} ${fill.symbol}
      </p>
      {fill.side === 'buy' ? (
        <p className="mt-1 text-[12px] leading-relaxed text-[#b7a99a]">
          The token is in your Phantom wallet. Open Phantom and check your token list
          (unknown tokens sit under Manage).
        </p>
      ) : (
        <p className="mt-1 text-[12px] leading-relaxed text-[#b7a99a]">
          SOL is on its way back to the same Phantom you paid with.
        </p>
      )}
      {mint && fill.side === 'buy' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={phantomTokenUrl(mint)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#e8a35a] px-3 py-1.5 text-[11px] font-bold text-[#100814]"
          >
            View in Phantom
          </a>
          <a
            href={solscanTokenUrl(mint)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#3a2433] px-3 py-1.5 text-[11px] text-[#b7a99a]"
          >
            Token on Solscan
          </a>
        </div>
      )}
      {showSellGuide && fill.side === 'buy' && (
        <p className="mt-3 text-[11px] text-[#f4ead8]/80">
          You can sell any time from this page. Selling sends the token out of Phantom
          and returns SOL there.
          <button
            type="button"
            onClick={onSellGuide}
            className="ml-1 underline decoration-[#e8a35a]/60"
          >
            Got it
          </button>
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-3 text-[11px] text-[#7c6f66] hover:text-[#f4ead8]"
      >
        Dismiss
      </button>
    </div>
  )
}
