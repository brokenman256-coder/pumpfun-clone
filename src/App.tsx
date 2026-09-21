import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { LeftSidebar } from './components/LeftSidebar'
import { MobileBanner } from './components/MobileBanner'
import { BottomNav } from './components/BottomNav'
import { WalletModal } from './components/WalletModal'
import { GraduationToast } from './components/GraduationToast'
import { HomePage } from './pages/HomePage'
import { TokenPage } from './pages/TokenPage'
import { CreatePage } from './pages/CreatePage'
import { ProfilePage } from './pages/ProfilePage'
import { ChannelPage } from './pages/ChannelPage'
import { SwapPage } from './pages/SwapPage'
import { PayPage } from './pages/PayPage'
import { AdminPage } from './pages/AdminPage'
import { SiteControlPage } from './pages/SiteControlPage'
import { MaintenanceGate } from './components/MaintenanceGate'
import { useSimulator } from './hooks/useSimulator'
import { useDexScreener } from './hooks/useDexScreener'
import { useLaunchBots } from './hooks/useLaunchBots'
import { useLiveBoard } from './hooks/useLiveBoard'
import { useJackpotWatch } from './hooks/useJackpotWatch'
import { useSystemSupervisor } from './hooks/useSystemSupervisor'
import { useOnChainTokens } from './hooks/useOnChainTokens'
import { useDeskPositions } from './hooks/useDeskPositions'
import { SiteFooter } from './components/SiteFooter'
import { LegalPage } from './pages/LegalPage'

export default function App() {
  useLiveBoard()
  useSimulator()
  useDexScreener()
  useLaunchBots()
  useOnChainTokens()
  useJackpotWatch()
  useSystemSupervisor()
  useDeskPositions()

  return (
    <BrowserRouter>
      <MaintenanceGate>
        <div className="min-h-screen bg-transparent text-[#f4ead8]">
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
                  <Route path="/about" element={<LegalPage />} />
                  <Route path="/terms" element={<LegalPage />} />
                  <Route path="/privacy" element={<LegalPage />} />
                  <Route path="/risk" element={<LegalPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/site-control" element={<SiteControlPage />} />
                </Routes>
              </main>
              <SiteFooter />
            </div>
          </div>
          <div className="lg:hidden">
            <BottomNav />
          </div>
          <WalletModal />
          <GraduationToast />
        </div>
      </MaintenanceGate>
    </BrowserRouter>
  )
}
