import { TokenBoard } from '../components/TokenBoard'
import { CommunityFeed } from '../components/CommunityFeed'
import { BountiesStrip } from '../components/BountiesStrip'
import { useStore } from '../store/useStore'

export function HomePage() {
  const homeTab = useStore((s) => s.homeTab)

  if (homeTab === 'communities') return <CommunityFeed />

  if (homeTab === 'bounties') {
    return (
      <div className="mx-auto max-w-lg px-3 pb-8 pt-4">
        <h1 className="mb-1 text-xl font-black">Bounties</h1>
        <p className="mb-4 text-sm text-[#8b8d97]">Open challenges across the board.</p>
        <BountiesStrip />
      </div>
    )
  }

  return <TokenBoard />
}
