import { Link } from 'react-router-dom'
import { CHANNEL_WALLET, CHAIN_LABEL, CLUSTER, EXPLORER_ADDR, FEE_RECIPIENT } from '../chain/config'
import { PLATFORM_CHANNEL } from '../chain/tokenChannel'
import { useWallet } from '../hooks/useWallet'

/**
 * Official token channel — treasury wallet + how to mint your coin into this channel.
 */
export function ChannelPage() {
  const { connected, address, openModal } = useWallet()
  const isOwner = connected && address === CHANNEL_WALLET

  return (
    <div className="mx-auto max-w-2xl px-3 py-8 sm:px-4">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-[#86efac]/15 px-3 py-1 text-[11px] font-bold text-[#86efac]">
          ⛓ OFFICIAL CHANNEL · {CHAIN_LABEL}
        </span>
      </div>
      <h1 className="text-center text-3xl font-black text-white">
        {PLATFORM_CHANNEL.name}{' '}
        <span className="text-[#86efac]">${PLATFORM_CHANNEL.symbol}</span>
      </h1>
      <p className="mt-2 text-center text-sm text-[#8b8d97]">
        {PLATFORM_CHANNEL.description}
      </p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[#86efac]/30 bg-[#15161b] p-5">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[#8b8d97]">
            Channel treasury wallet
          </p>
          <p className="mt-1 break-all font-mono text-sm text-[#86efac]">{CHANNEL_WALLET}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-[#26272e] px-3 py-1 text-xs text-white hover:border-[#86efac]/40"
              onClick={() => navigator.clipboard.writeText(CHANNEL_WALLET)}
            >
              Copy address
            </button>
            <a
              href={EXPLORER_ADDR(CHANNEL_WALLET)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#86efac] px-3 py-1 text-xs font-bold text-black"
            >
              View on Solscan
            </a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info
            title="Create fee"
            body="0.02 SOL per launch → this wallet"
          />
          <Info title="Buy volume" body="Buy SOL settles to this treasury" />
          <Info title="Network" body={CLUSTER} />
          <Info title="Status" body={isOwner ? 'You own this channel ✓' : 'Public channel'} />
        </div>

        {PLATFORM_CHANNEL.mint ? (
          <div className="rounded-xl border border-[#86efac]/20 bg-[#0c1f14] p-4">
            <p className="text-xs text-[#8b8d97]">Official mint</p>
            <p className="break-all font-mono text-sm text-white">{PLATFORM_CHANNEL.mint}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 text-sm text-[#ccc]">
            <p className="font-semibold text-yellow-300">No mint yet</p>
            <p className="mt-1 text-xs text-[#8b8d97]">
              Connect the treasury wallet in Phantom and mint the official{' '}
              <span className="text-[#86efac]">${PLATFORM_CHANNEL.symbol}</span> coin.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/create-real"
            className="rounded-full bg-[#86efac] px-5 py-2.5 text-sm font-bold text-black"
          >
            Mint channel token
          </Link>
          {!connected ? (
            <button
              type="button"
              onClick={openModal}
              className="rounded-full border border-[#26272e] px-5 py-2.5 text-sm text-white"
            >
              Connect Phantom
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#26272e] bg-[#0e0f13] p-5 text-sm text-[#8b8d97]">
        <p className="font-semibold text-white">How this channel works</p>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>
            Treasury <span className="font-mono text-[11px] text-[#86efac]">{FEE_RECIPIENT.slice(0, 8)}…</span> receives all platform fees on-chain.
          </li>
          <li>Create coin mints a real SPL token into the connected Phantom wallet.</li>
          <li>To own the official channel mint, connect this exact treasury key in Phantom and create.</li>
          <li>Devnet: free SOL from faucet.solana.com · Mainnet: real SOL required.</li>
        </ol>
      </div>
    </div>
  )
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-[#26272e] bg-[#0e0f13] p-3">
      <p className="text-[10px] uppercase text-[#8b8d97]">{title}</p>
      <p className="mt-0.5 text-sm font-medium text-white">{body}</p>
    </div>
  )
}
