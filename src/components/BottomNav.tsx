import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

type Tab = 'home' | 'communities' | 'create' | 'bag' | 'more'

/**
 * pump.fun-style bottom nav: home · people · + · bag · more
 */
export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const homeTab = useStore((s) => s.homeTab)
  const setHomeTab = useStore((s) => s.setHomeTab)
  const [moreOpen, setMoreOpen] = useState(false)

  const path = location.pathname
  const active: Tab =
    path.startsWith('/profile') || path.startsWith('/bag')
      ? 'bag'
      : path.startsWith('/create')
        ? 'create'
        : homeTab === 'communities'
          ? 'communities'
          : path === '/'
            ? 'home'
            : 'home'

  function go(tab: Tab) {
    setMoreOpen(false)
    if (tab === 'home') {
      setHomeTab('board')
      navigate('/')
    } else if (tab === 'communities') {
      setHomeTab('communities')
      navigate('/')
    } else if (tab === 'create') {
      navigate('/create-real')
    } else if (tab === 'bag') {
      navigate('/profile')
    } else if (tab === 'more') {
      setMoreOpen((v) => !v)
    }
  }

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-[55]" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute bottom-[4.25rem] left-1/2 w-44 -translate-x-1/2 overflow-hidden rounded-2xl border border-[#2a2b33] bg-[#1a1b22] py-1 shadow-2xl sm:left-auto sm:right-4 sm:translate-x-0"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: 'Callout', icon: '📢', action: () => navigate('/') },
              { label: 'Post bounty', icon: '💰', action: () => setHomeTab('bounties') },
              { label: 'Go live', icon: '📡', action: () => navigate('/') },
              {
                label: 'Create coin',
                icon: '🪙',
                action: () => navigate('/create-real'),
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                onClick={() => {
                  setMoreOpen(false)
                  if (item.label === 'Post bounty') {
                    setHomeTab('bounties')
                    navigate('/')
                  } else item.action()
                }}
              >
                <span className="text-base opacity-80">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#1f2028] bg-[#0e0f13]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
          <NavBtn
            active={active === 'home' && homeTab !== 'communities'}
            onClick={() => go('home')}
            label="Home"
          >
            <HomeIcon />
          </NavBtn>
          <NavBtn
            active={active === 'communities' || homeTab === 'communities'}
            onClick={() => go('communities')}
            label="Communities"
          >
            <PeopleIcon />
          </NavBtn>
          <button
            type="button"
            aria-label="Create"
            onClick={() => go('create')}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2a2b33] bg-[#15161b] text-2xl text-white hover:border-[#86efac]/40"
          >
            +
          </button>
          <NavBtn active={active === 'bag'} onClick={() => go('bag')} label="Bag">
            <BagIcon />
          </NavBtn>
          <NavBtn active={moreOpen} onClick={() => go('more')} label="More">
            <MoreIcon />
          </NavBtn>
        </div>
      </nav>
    </>
  )
}

function NavBtn({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
        active ? 'text-[#86efac]' : 'text-[#6b6d78] hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M15 19c0-2 1.5-3.5 4-3.5 1.2 0 2.2.3 3 1" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  )
}
