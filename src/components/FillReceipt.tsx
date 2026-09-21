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
    <div className="mt-3 rounded-2xl border border-[#e8a35a]/30 bg-[#1a1018] p-4">
      <p className="font-display text-lg text-[#f4ead8]">
        {fill.side === 'buy' ? 'Order filled' : 'Position closed'} · ${fill.symbol}
      </p>
      {fill.side === 'buy' ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#b7a99a]">
          Tokens have been sent to your wallet. Open Phantom and refresh your
          token list if the balance is not visible yet.
        </p>
      ) : (
        <p className="mt-1.5 text-[12px] leading-relaxed text-[#b7a99a]">
          SOL has been sent to the same wallet you used to pay.
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
            Open in Phantom
          </a>
          <a
            href={solscanTokenUrl(mint)}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[#3a2433] px-3 py-1.5 text-[11px] text-[#b7a99a]"
          >
            View on Solscan
          </a>
        </div>
      )}
      {showSellGuide && fill.side === 'buy' && (
        <p className="mt-3 text-[11px] leading-relaxed text-[#f4ead8]/80">
          You can close this position at any time. Selling returns SOL to your wallet.
          <button
            type="button"
            onClick={onSellGuide}
            className="ml-1 font-semibold text-[#e8a35a]"
          >
            Understood
          </button>
        </p>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-3 text-[11px] text-[#7c6f66] hover:text-[#f4ead8]"
      >
        Close
      </button>
    </div>
  )
}
