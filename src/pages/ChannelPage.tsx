import { Link } from 'react-router-dom'
import { CHANNEL_WALLET, CHAIN_LABEL, CLUSTER, EXPLORER_ADDR, FEE_RECIPIENT } from '../chain/config'
import { useWallet } from '../hooks/useWallet'

export function ChannelPage() {
  const { connected, address, openModal } = useWallet()
  const isOwner = connected && address === CHANNEL_WALLET

  return (
    <div className="mx-auto max-w-lg px-3 py-8">
      <div className="text-center">
        <span className="rounded-full bg-[#3b82f6]/15 px-3 py-1 text-[11px] font-bold text-[#3b82f6]">
          ⛓ OFFICIAL CHANNEL · {CHAIN_LABEL}
        </span>
        <h1 className="mt-3 text-2xl font-black">
          Nova Channel <span className="text-[#3b82f6]">$NOVA</span>
        </h1>
        <p className="mt-2 text-sm text-[#8b8d97]">
          Platform treasury for create fees and buy volume.
        </p>
      </div>

      <div className="mt-6 space-y-4 rounded-2xl border border-[#3b82f6]/30 bg-[#111827] p-5">
        <div>
          <p className="text-[10px] uppercase text-[#8b8d97]">Treasury wallet</p>
          <p className="mt-1 break-all font-mono text-sm text-[#3b82f6]">{CHANNEL_WALLET}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-[#334155] px-3 py-1 text-xs"
              onClick={() => navigator.clipboard.writeText(CHANNEL_WALLET)}
            >
              Copy
            </button>
            <a
              href={EXPLORER_ADDR(CHANNEL_WALLET)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#3b82f6] px-3 py-1 text-xs font-bold text-white"
            >
              Solscan
            </a>
          </div>
        </div>
        <p className="text-sm text-[#8b8d97]">
          Status:{' '}
          <span className="text-white">{isOwner ? 'You own this channel ✓' : 'Public channel'}</span>
        </p>
        <p className="text-sm text-[#8b8d97]">Network: {CLUSTER}</p>
        <p className="text-xs text-[#6b6d78]">
          Fee recipient: {FEE_RECIPIENT.slice(0, 8)}…
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/create" className="rounded-full bg-[#3b82f6] px-5 py-2.5 text-sm font-bold text-white">
            Mint channel token
          </Link>
          {!connected && (
            <button
              type="button"
              onClick={openModal}
              className="rounded-full border border-[#334155] px-5 py-2.5 text-sm"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
