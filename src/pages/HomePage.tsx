import { TokenBoard } from '../components/TokenBoard'
import { CommunityFeed } from '../components/CommunityFeed'
import { BountiesStrip } from '../components/BountiesStrip'
import { useStore } from '../store/useStore'

export function HomePage() {
  const homeTab = useStore((s) => s.homeTab)

  if (homeTab === 'communities') {
    return <CommunityFeed />
  }

  if (homeTab === 'bounties') {
    return (
      <div className="mx-auto max-w-lg px-3 pb-24 pt-4 sm:max-w-3xl">
        <h1 className="mb-1 text-xl font-black text-white">Bounties</h1>
        <p className="mb-4 text-sm text-[#8b8d97]">
          Open challenges and rewards across the pump board.
        </p>
        <BountiesStrip />
        <div className="mt-4 rounded-2xl border border-[#1f2028] bg-[#14151b] p-5 text-center">
          <p className="text-3xl">💰</p>
          <p className="mt-2 font-semibold text-white">Post a bounty</p>
          <p className="mt-1 text-sm text-[#8b8d97]">
            Coming soon — for now explore open bounties above.
          </p>
        </div>
      </div>
    )
  }

  return <TokenBoard />
}
