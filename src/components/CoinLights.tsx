import type { Token } from '../types'
import { coinLights } from '../lib/coinHealth'

export function CoinLights({ token, compact }: { token: Token; compact?: boolean }) {
  const lights = coinLights(token)
  if (!lights.length) return null
  return (
    <div className={`flex flex-wrap gap-1 ${compact ? '' : 'mt-1'}`}>
      {lights.map((l) => (
        <span
          key={l.id}
          title={l.hint}
          className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            l.tone === 'ok'
              ? 'bg-[#e8a35a]/15 text-[#e8a35a]'
              : l.tone === 'warn'
                ? 'bg-[#fb7185]/15 text-[#fb7185]'
                : 'bg-white/10 text-[#f4ead8]/80'
          }`}
        >
          {l.label}
        </span>
      ))}
    </div>
  )
}
