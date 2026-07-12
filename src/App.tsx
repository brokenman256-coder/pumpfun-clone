import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Navbar } from './components/Navbar'
import { LeftSidebar } from './components/LeftSidebar'
import { MobileBanner } from './components/MobileBanner'
import { BottomNav } from './components/BottomNav'
import { CookieConsent } from './components/CookieConsent'
import { WalletModal } from './components/WalletModal'
import { HowItWorksModal } from './components/HowItWorksModal'
import { GraduationToast } from './components/GraduationToast'
import { HomePage } from './pages/HomePage'
import { TokenPage } from './pages/TokenPage'
import { CreatePage } from './pages/CreatePage'
import { ProfilePage } from './pages/ProfilePage'
import { ChannelPage } from './pages/ChannelPage'
import { SwapPage } from './pages/SwapPage'
import { PayPage } from './pages/PayPage'
import { AdminPage } from './pages/AdminPage'
import { useSimulator } from './hooks/useSimulator'
import { useDexScreener } from './hooks/useDexScreener'
import { useLaunchBots } from './hooks/useLaunchBots'
import { useOnChainTokens } from './hooks/useOnChainTokens'
import { useStore } from './store/useStore'

export default function App() {
  useSimulator()
  useDexScreener()
  useLaunchBots()
  useOnChainTokens()
  const setHowOpen = useStore((s) => s.setHowOpen)

  useEffect(() => {
    const g = globalThis as typeof globalThis & { __pumpWelcome?: boolean }
    if (!g.__pumpWelcome) {
      g.__pumpWelcome = true
      window.setTimeout(() => setHowOpen(true), 900)
    }
  }, [setHowOpen])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0e0f13] text-[#e8e8ed]">
        <div className="flex min-h-screen">
          <LeftSidebar />
          <div className="flex min-w-0 flex-1 flex-col pb-16 lg:pb-0">
            <MobileBanner />
            <div className="lg:hidden">
              <Navbar />
            </div>
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/coin/:id" element={<TokenPage />} />
                <Route path="/create" element={<CreatePage />} />
                <Route path="/create-real" element={<CreatePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/channel" element={<ChannelPage />} />
                <Route path="/swap" element={<SwapPage />} />
                <Route path="/pay" element={<PayPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Routes>
            </main>
          </div>
        </div>
        <div className="lg:hidden">
          <BottomNav />
        </div>
        <CookieConsent />
        <WalletModal />
        <HowItWorksModal />
        <GraduationToast />
      </div>
    </BrowserRouter>
  )
}
