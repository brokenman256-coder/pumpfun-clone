import { Link } from 'react-router-dom'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[#3a2433] px-4 py-8 text-[#7c6f66]">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg text-[#f4ead8]">NOVA</p>
          <p className="mt-1 max-w-sm text-[11px] leading-relaxed">
            Digital asset venue on Solana. Operating since 2021. Trading involves
            risk of loss. Nothing here is financial advice.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
          <Link to="/about" className="hover:text-[#f4ead8]">
            About
          </Link>
          <Link to="/terms" className="hover:text-[#f4ead8]">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-[#f4ead8]">
            Privacy
          </Link>
          <Link to="/risk" className="hover:text-[#f4ead8]">
            Risk disclosure
          </Link>
          <Link to="/channel" className="hover:text-[#f4ead8]">
            Channel
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-[10px] tracking-wide">
        © 2021–2026 NOVA Markets. All rights reserved.
      </p>
    </footer>
  )
}
