import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#e8a35a]">NOVA · Est. 2021</p>
      <h1 className="mt-3 font-display text-3xl text-[#f4ead8]">Page not found</h1>
      <p className="mt-3 text-sm text-[#b7a99a]">That route does not exist on this venue.</p>
      <Link
        to="/"
        className="mt-8 inline-block rounded-full bg-[#e8a35a] px-5 py-2 text-sm font-bold text-[#100814]"
      >
        Back to markets
      </Link>
    </div>
  )
}
