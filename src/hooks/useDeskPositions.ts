import { useEffect } from 'react'
import { useStore } from '../store/useStore'
import { fetchDeskPositions } from '../lib/deskApi'

/** Pull server-side desk bags into local holdings so Profile/Trade stay in sync. */
export function useDeskPositions() {
  const address = useStore((s) => s.wallet.address)
  const syncDeskHoldings = useStore((s) => s.syncDeskHoldings)

  useEffect(() => {
    if (!address || address.startsWith('personal')) return
    let cancelled = false

    async function pull() {
      const snap = await fetchDeskPositions(address as string)
      if (cancelled || !snap.ok) return
      syncDeskHoldings(
        snap.positions.map((p) => ({
          tokenId: p.tokenId || p.mint,
          tokens: p.tokens,
          costSol: p.costSol,
        })),
      )
    }

    void pull()
    const id = window.setInterval(pull, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [address, syncDeskHoldings])
}
