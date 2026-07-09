import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useStore } from '../store/useStore'
import { useWallet } from '../hooks/useWallet'
import { shortAddr, formatSol } from '../lib/format'
import { CLUSTER, CHAIN_LABEL } from '../chain/config'

export function Navbar() {
  const navigate = useNavigate()
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const setHowOpen = useStore((s) => s.setHowOpen)
  const { connected, address, solBalance, openModal, connectPhantom, disconnect, connecting } =
    useWallet()
  const [menu, setMenu] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#26272e] bg-[#0e0f13]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-3 sm:px-4">
        <Link to="/" className="group flex shrink-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#86efac] text-lg shadow-[0_0_16px_rgba(134,239,172,0.5)] transition group-hover:rotate-12 group-hover:scale-110">
            <span className="inline-block animate-bounce">💊</span>
          </span>
          <span className="font-logo hidden text-[10px] leading-none text-white sm:block">
            pump<span className="text-[#86efac]">.fun</span>
          </span>
        </Link>

        <span
          className="hidden rounded-full border border-[#86efac]/30 bg-[#86efac]/10 px-2 py-0.5 text-[10px] font-semibold text-[#86efac] md:inline"
          title={CHAIN_LABEL}
        >
          ⛓ {CLUSTER}
        </span>

        <div className="relative mx-auto hidden max-w-md flex-1 sm:block">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search for token"
            className="w-full rounded-full border border-[#26272e] bg-[#15161b] py-2 pl-4 pr-3 text-sm text-white outline-none placeholder:text-[#8b8d97] focus:border-[#86efac]/50"
          />
        </div>

        <button
          type="button"
          onClick={() => navigate('/channel')}
          className="hidden text-xs text-[#8b8d97] hover:text-[#86efac] sm:inline"
        >
          channel
        </button>
        <button
          type="button"
          onClick={() => setHowOpen(true)}
          className="hidden text-xs text-[#8b8d97] hover:text-white sm:inline"
        >
          how it works
        </button>

        <button
          type="button"
          onClick={() => navigate('/create-real')}
          className="btn-press rounded-full bg-[#86efac] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#4ade80] sm:px-4 sm:text-sm"
        >
          create coin
        </button>

        {!connected ? (
          <button
            type="button"
            onClick={() => {
              // Open chooser + kick Phantom connect immediately when installed
              openModal()
              void connectPhantom()
            }}
            className="btn-press rounded-full border border-[#86efac]/40 bg-[#86efac] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#4ade80] sm:text-sm"
          >
            {connecting ? 'connecting…' : 'connect Phantom'}
          </button>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-2 rounded-full border border-[#26272e] bg-[#15161b] px-3 py-1.5 text-xs font-semibold text-[#86efac]"
            >
              <span className="hidden text-[#8b8d97] sm:inline">{formatSol(solBalance)} SOL</span>
              {shortAddr(address!)}
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-[#26272e] bg-[#15161b] py-1 shadow-xl">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    setMenu(false)
                    navigate('/profile')
                  }}
                >
                  profile
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                  onClick={() => {
                    setMenu(false)
                    disconnect()
                  }}
                >
                  disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-[#1a1b22] px-3 py-2 sm:hidden">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search for token"
          className="w-full rounded-full border border-[#26272e] bg-[#15161b] py-2 px-4 text-sm outline-none"
        />
      </div>
    </header>
  )
}
