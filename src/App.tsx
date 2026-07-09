import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Navbar } from './components/Navbar'
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
import { useSimulator } from './hooks/useSimulator'
import { useDexScreener } from './hooks/useDexScreener'
import { useStore } from './store/useStore'

export default function App() {
  useSimulator()
  useDexScreener()
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
      <div className="min-h-screen bg-[#0e0f13] text-[#e8e8ed] pb-16">
        <MobileBanner />
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/coin/:id" element={<TokenPage />} />
            <Route path="/create" element={<CreatePage />} />
            <Route path="/create-real" element={<CreatePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/channel" element={<ChannelPage />} />
          </Routes>
        </main>
        <BottomNav />
        <CookieConsent />
        <WalletModal />
        <HowItWorksModal />
        <GraduationToast />
      </div>
    </BrowserRouter>
  )
}
