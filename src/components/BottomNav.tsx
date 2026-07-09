import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'

export function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const homeTab = useStore((s) => s.homeTab)
  const setHomeTab = useStore((s) => s.setHomeTab)
  const [more, setMore] = useState(false)

  const homeActive = pathname === '/' && homeTab !== 'communities'
  const communityActive = pathname === '/' && homeTab === 'communities'
  const createActive = pathname.startsWith('/create')
  const bagActive = pathname.startsWith('/profile')

  return (
    <>
      {more && (
        <div className="fixed inset-0 z-[55]" onClick={() => setMore(false)}>
          <div
            className="absolute bottom-[4.25rem] left-1/2 w-44 -translate-x-1/2 overflow-hidden rounded-2xl border border-[#2a2b33] bg-[#1a1b22] py-1 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: 'Callout', go: () => navigate('/') },
              { label: 'Post bounty', go: () => { setHomeTab('bounties'); navigate('/') } },
              { label: 'Go live', go: () => navigate('/') },
              { label: 'Create coin', go: () => navigate('/create') },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5"
                onClick={() => {
                  setMore(false)
                  item.go()
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[#1f2028] bg-[#0e0f13]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-around px-2">
          <IconBtn active={homeActive} label="Home" onClick={() => { setHomeTab('board'); navigate('/') }}>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
          </IconBtn>
          <IconBtn active={communityActive} label="Communities" onClick={() => { setHomeTab('communities'); navigate('/') }}>
            <circle cx="9" cy="8" r="3" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
          </IconBtn>
          <button
            type="button"
            aria-label="Create"
            onClick={() => navigate('/create')}
            className={`flex h-11 w-11 items-center justify-center rounded-full border text-2xl ${
              createActive ? 'border-[#86efac] text-[#86efac]' : 'border-[#2a2b33] text-white'
            } bg-[#15161b]`}
          >
            +
          </button>
          <IconBtn active={bagActive} label="Bag" onClick={() => navigate('/profile')}>
            <path d="M6 8h12l-1 12H7L6 8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </IconBtn>
          <button
            type="button"
            aria-label="More"
            onClick={() => setMore((v) => !v)}
            className={`flex h-11 w-11 items-center justify-center ${more ? 'text-[#86efac]' : 'text-[#6b6d78]'}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="18" cy="12" r="1.6" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  )
}

function IconBtn({
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
      className={`flex h-11 w-11 items-center justify-center ${active ? 'text-[#86efac]' : 'text-[#6b6d78]'}`}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        {children}
      </svg>
    </button>
  )
}
