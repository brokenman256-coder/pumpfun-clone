import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatSol } from '../lib/format'

export function Navbar() {
  const navigate = useNavigate()
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const { connected, address, solBalance, openModal, disconnect, connecting } = useWallet()
  const [menu, setMenu] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-[#0e0f13]/95 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-lg items-center gap-2 px-3 sm:max-w-5xl">
        <Link to="/" aria-label="Home" className="shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#86efac] to-[#4ade80] text-base shadow-[0_0_12px_rgba(134,239,172,0.45)]">
            🔥
          </span>
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          aria-label="Channel"
          onClick={() => navigate('/channel')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#9a9ba3] hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#9a9ba3] hover:bg-white/5"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </button>
        {!connected ? (
          <button
            type="button"
            onClick={() => openModal()}
            className="btn-press rounded-full bg-[#00c805] px-3.5 py-1.5 text-[13px] font-bold text-black shadow-[0_0_16px_rgba(0,200,5,0.25)]"
          >
            {connecting ? '…' : 'Connect wallet'}
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              className="rounded-full border border-[#2a2b33] bg-[#15161b] px-3 py-1.5 text-[12px] font-semibold text-[#86efac]"
            >
              <span className="hidden sm:inline">{formatSol(solBalance)} · </span>
              {shortAddr(address!)}
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-xl border border-[#2a2b33] bg-[#15161b] py-1 shadow-xl">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    setMenu(false)
                    navigate('/profile')
                  }}
                >
                  Bag
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                  onClick={() => {
                    setMenu(false)
                    void disconnect()
                  }}
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {searchOpen && (
        <div className="border-t border-[#1a1b22] px-3 py-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search for token"
            className="w-full rounded-full border border-[#2a2b33] bg-[#15161b] px-4 py-2 text-sm outline-none focus:border-[#86efac]/40"
          />
        </div>
      )}
    </header>
  )
}
