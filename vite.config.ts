import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      '@solana/web3.js',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-phantom',
      '@solana/wallet-adapter-solflare',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    allowedHosts: ['.trycloudflare.com', '.loca.lt', 'localhost', '127.0.0.1'],
  },
  server: {
    allowedHosts: ['.trycloudflare.com', '.loca.lt', 'localhost', '127.0.0.1'],
  },
})

