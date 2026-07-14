import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatSol } from '../lib/format'
const NAV = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/create', label: 'Create', icon: '🚀' },
  { to: '/swap', label: 'Swap', icon: '🔄' },
  { to: '/profile', label: 'Bag / Profile', icon: '💼' },
  { to: '/channel', label: 'Channel', icon: '📡' },
  // Admin is intentionally NOT in the public nav — open /admin privately
]

/**
 * Desktop left rail — pump.fun style navigation panel
 */
export function LeftSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const setHomeTab = useStore((s) => s.setHomeTab)
  const homeTab = useStore((s) => s.homeTab)
  const { connected, address, solBalance, openModal, disconnect } = useWallet()
  const tokens = useStore((s) => s.tokens)
  const trades = useStore((s) => s.tickerTrades)

  return (
    <aside className="hidden lg:flex lg:w-56 xl:w-64 shrink-0 flex-col border-r border-[#1f2028] bg-[#0a0b0f] min-h-screen sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 border-b border-[#1f2028] px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#86efac] to-[#4ade80] text-lg shadow-[0_0_16px_rgba(134,239,172,0.35)]">
          🔥
        </span>
        <div>
          <p className="text-sm font-black tracking-tight text-white">
            IGNITE
          </p>
          <p className="flex items-center gap-1 text-[10px] text-[#6b6d78]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#86efac]" />
            Live board
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const active =
            item.to === '/'
              ? pathname === '/'
              : pathname.startsWith(item.to)
          return (
            <button
              key={item.to}
              type="button"
              onClick={() => {
                if (item.to === '/') setHomeTab('board')
                navigate(item.to)
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                active
                  ? 'bg-[#86efac]/15 text-[#86efac]'
                  : 'text-[#9a9ba3] hover:bg-white/5 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          )
        })}

        <div className="my-3 border-t border-[#1f2028]" />
        <p className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#555]">Board</p>
        {[
          { id: 'board' as const, label: 'Trending' },
          { id: 'communities' as const, label: 'Communities' },
          { id: 'bounties' as const, label: 'Bounties' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setHomeTab(t.id)
              navigate('/')
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${
              pathname === '/' && homeTab === t.id
                ? 'text-[#86efac]'
                : 'text-[#6b6d78] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="space-y-2 border-t border-[#1f2028] p-3">
        <div className="rounded-xl border border-[#1f2028] bg-[#14151b]/80 px-3 py-2">
          <p className="text-[10px] text-[#6b6d78]">Markets</p>
          <p className="text-sm font-bold text-white">{tokens.length.toLocaleString()}</p>
          <p className="mt-0.5 text-[10px] text-[#555]">
            {trades.length ? `${trades[0]?.side} · live tape` : 'warming up'}
          </p>
        </div>
        {!connected ? (
          <button
            type="button"
            onClick={() => openModal()}
            className="btn-press w-full rounded-full bg-[#00c805] py-2.5 text-sm font-bold text-black shadow-[0_0_16px_rgba(0,200,5,0.2)]"
          >
            Connect wallet
          </button>
        ) : (
          <div className="rounded-xl border border-[#1f2028] bg-[#14151b] p-3">
            <p className="font-mono text-[11px] text-[#86efac]">{shortAddr(address!, 4)}</p>
            <p className="text-xs text-white">{formatSol(solBalance)} SOL</p>
            <div className="mt-2 flex gap-1">
              <LinkBtn onClick={() => navigate('/profile')}>Bag</LinkBtn>
              <LinkBtn onClick={() => void disconnect()}>Out</LinkBtn>
            </div>
          </div>
        )}
        <Link to="/pay" className="block text-center text-[11px] text-[#6b6d78] hover:text-[#86efac]">
          Payment gateway →
        </Link>
      </div>
    </aside>
  )
}

function LinkBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 rounded-lg bg-white/5 py-1 text-[10px] font-semibold text-[#8b8d97] hover:text-white"
    >
      {children}
    </button>
  )
}
