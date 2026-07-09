import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import process from 'process'
import './index.css'
import App from './App.tsx'
import { SolanaProvider } from './chain/SolanaProvider'

// Solana web3 / wallet-adapter polyfills for browser
const g = globalThis as typeof globalThis & {
  Buffer: typeof Buffer
  process: typeof process
}
g.Buffer = Buffer
g.process = process

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProvider>
      <App />
    </SolanaProvider>
  </StrictMode>,
)
