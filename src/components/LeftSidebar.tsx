import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatSol } from '../lib/format'
import { CLUSTER } from '../chain/config'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/create', label: 'Create', icon: '🚀' },
  { to: '/swap', label: 'Swap', icon: '🔄' },
  { to: '/profile', label: 'Bag / Profile', icon: '💼' },
  { to: '/channel', label: 'Channel', icon: '📡' },
  { to: '/admin', label: 'Admin', icon: '🛡️' },
]

/**
 * Desktop left rail — pump.fun style navigation panel
 */
export function LeftSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const setHomeTab = useStore((s) => s.setHomeTab)
  const homeTab = useStore((s) => s.homeTab)
  const dexStatus = useStore((s) => s.dexStatus)
  const { connected, address, solBalance, openModal, connectPhantom, disconnect } = useWallet()

  return (
    <aside className="hidden lg:flex lg:w-56 xl:w-64 shrink-0 flex-col border-r border-[#1f2028] bg-[#0a0b0f] min-h-screen sticky top-0 h-screen">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-[#1f2028]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#86efac] to-[#4ade80] text-lg">
          💊
        </span>
        <div>
          <p className="font-logo text-[9px] text-white">
            pump<span className="text-[#86efac]">.fun</span>
          </p>
          <p className="text-[10px] text-[#6b6d78]">{CLUSTER}</p>
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

      <div className="border-t border-[#1f2028] p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-[#6b6d78]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              dexStatus === 'ok' ? 'bg-[#86efac] animate-pulse' : 'bg-[#555]'
            }`}
          />
          DexScreener {dexStatus}
        </div>
        {!connected ? (
          <button
            type="button"
            onClick={() => {
              openModal()
              void connectPhantom()
            }}
            className="w-full rounded-full bg-[#86efac] py-2 text-sm font-bold text-black"
          >
            Sign in
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
