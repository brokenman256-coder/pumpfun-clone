import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatSol } from '../lib/format'
const NAV = [
  { to: '/', label: 'Markets', icon: '●' },
  { to: '/create', label: 'Launch', icon: '+' },
  { to: '/swap', label: 'Swap', icon: '⇄' },
  { to: '/profile', label: 'Portfolio', icon: '◇' },
  { to: '/channel', label: 'Channel', icon: '◎' },
  // Admin is intentionally NOT in the public nav — open /admin privately
]

/** Desktop left rail — atlas salon nav */
export function LeftSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const setHomeTab = useStore((s) => s.setHomeTab)
  const homeTab = useStore((s) => s.homeTab)
  const { connected, address, solBalance, openModal, disconnect } = useWallet()

  return (
    <aside className="hidden lg:flex lg:w-56 xl:w-64 shrink-0 flex-col border-r border-[#3a2433] bg-[#100814]/90 min-h-screen sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 border-b border-[#3a2433] px-4 py-4">
        <img
          src="/img/nova-mark.jpg"
          alt=""
          className="h-9 w-9 rounded-full object-cover ring-1 ring-[#e8a35a]/40"
        />
        <div>
          <p className="font-display text-lg tracking-tight text-[#f4ead8]">
            NOVA
          </p>
          <p className="text-[10px] tracking-wide text-[#b7a99a]">Est. 2021</p>
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
                  ? 'bg-[#e8a35a]/15 text-[#e8a35a]'
                  : 'text-[#b7a99a] hover:bg-white/5 hover:text-[#f4ead8]'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          )
        })}

        <div className="my-3 border-t border-[#1e293b]" />
        <p className="px-3 text-[10px] font-bold uppercase tracking-wide text-[#555]">Board</p>
        {[
          { id: 'board' as const, label: 'Live' },
          { id: 'communities' as const, label: 'Activity' },
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
                ? 'text-[#3b82f6]'
                : 'text-[#6b6d78] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="space-y-2 border-t border-[#1e293b] p-3">
        {!connected ? (
          <button
            type="button"
            onClick={() => openModal()}
            className="btn-press w-full rounded-full bg-[#e8a35a] py-2.5 text-sm font-bold text-[#100814] shadow-[0_0_16px_rgba(232,163,90,0.25)]"
          >
            Connect wallet
          </button>
        ) : (
          <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-3">
            <p className="font-mono text-[11px] text-[#3b82f6]">{shortAddr(address!, 4)}</p>
            <p className="text-xs text-white">{formatSol(solBalance)} SOL</p>
            <div className="mt-2 flex gap-1">
              <LinkBtn onClick={() => navigate('/profile')}>Portfolio</LinkBtn>
              <LinkBtn onClick={() => void disconnect()}>Out</LinkBtn>
            </div>
          </div>
        )}
        {null}
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
