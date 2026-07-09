import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Navbar } from './components/Navbar'
import { TickerBar } from './components/TickerBar'
import { WalletModal } from './components/WalletModal'
import { HowItWorksModal } from './components/HowItWorksModal'
import { GraduationToast } from './components/GraduationToast'
import { HomePage } from './pages/HomePage'
import { TokenPage } from './pages/TokenPage'
import { CreateCoinPage } from './pages/CreateCoinPage'
import { ProfilePage } from './pages/ProfilePage'
import { useSimulator } from './hooks/useSimulator'
import { useStore } from './store/useStore'

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="fade-up">
      {children}
    </div>
  )
}

function WelcomeGate() {
  const setHowOpen = useStore((s) => s.setHowOpen)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Show how-it-works once per session (in-memory only, no localStorage per spec)
    const g = globalThis as typeof globalThis & { __pumpWelcome?: boolean }
    if (!g.__pumpWelcome) {
      g.__pumpWelcome = true
      setHowOpen(true)
    }
    setReady(true)
  }, [setHowOpen])

  if (!ready) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="skeleton h-10 w-40 rounded-full" />
      </div>
    )
  }

  return null
}

export default function App() {
  useSimulator()

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0e0f13] text-[#e8e8ed]">
        <Navbar />
        <TickerBar />
        <WelcomeGate />
        <PageTransition>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/coin/:id" element={<TokenPage />} />
            <Route path="/create" element={<CreateCoinPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </PageTransition>
        <WalletModal />
        <HowItWorksModal />
        <GraduationToast />
      </div>
    </BrowserRouter>
  )
}
