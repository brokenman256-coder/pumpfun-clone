import { useStore } from '../store/useStore'
import { useDexScreener } from '../hooks/useDexScreener'
import { timeAgo } from '../lib/format'

/** Status bar: DexScreener sync + toggle live feed */
export function DexLiveBar() {
  const dexStatus = useStore((s) => s.dexStatus)
  const dexError = useStore((s) => s.dexError)
  const dexLastSync = useStore((s) => s.dexLastSync)
  const liveMode = useStore((s) => s.liveMode)
  const setLiveMode = useStore((s) => s.setLiveMode)
  const tokens = useStore((s) => s.tokens)
  const { refresh } = useDexScreener()

  const liveCount = tokens.filter((t) => t.source === 'dexscreener').length

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#1f2028] bg-[#14151b] px-3 py-2 text-[11px]">
      <span
        className={`inline-flex h-2 w-2 rounded-full ${
          dexStatus === 'ok'
            ? 'animate-pulse bg-[#86efac]'
            : dexStatus === 'loading'
              ? 'bg-yellow-400'
              : dexStatus === 'error'
                ? 'bg-[#f87171]'
                : 'bg-[#6b6d78]'
        }`}
      />
      <span className="font-semibold text-white">DexScreener</span>
      <span className="text-[#8b8d97]">
        {dexStatus === 'loading' && 'syncing Solana pairs…'}
        {dexStatus === 'ok' && `${liveCount} live coins`}
        {dexStatus === 'error' && (dexError || 'offline — showing local board')}
        {dexStatus === 'idle' && 'starting…'}
      </span>
      {dexLastSync && dexStatus === 'ok' && (
        <span className="text-[#555]">· updated {timeAgo(dexLastSync)}</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={dexStatus === 'loading'}
          className="rounded-full border border-[#26272e] px-2.5 py-1 font-semibold text-[#86efac] hover:border-[#86efac]/40 disabled:opacity-50"
        >
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setLiveMode(!liveMode)}
          className={`rounded-full px-2.5 py-1 font-semibold ${
            liveMode ? 'bg-[#86efac]/15 text-[#86efac]' : 'bg-[#1a1b22] text-[#8b8d97]'
          }`}
        >
          {liveMode ? 'Live ON' : 'Live OFF'}
        </button>
        <a
          href="https://dexscreener.com/solana"
          target="_blank"
          rel="noreferrer"
          className="text-[#6b6d78] underline hover:text-white"
        >
          Open DEX →
        </a>
      </div>
    </div>
  )
}
