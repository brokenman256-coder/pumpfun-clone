# pump.fun clone

Full frontend demo of pump.fun — Solana memecoin launchpad with mock bonding-curve engine.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Zustand store
- lightweight-charts (TradingView-style candles)
- canvas-confetti

## Run

```bash
cd pumpfun-clone
npm install
npm run dev
```

Open http://localhost:5173

## Features

- Token board with King of the Hill, live ticker, shake-on-trade cards
- Token page: live candlestick chart, buy/sell panel, bonding curve, trades, thread, holders
- Create coin with rocket + confetti
- Profile: held / created / replies + PnL
- How it works modal, wallet modal (Phantom/Solflare/Backpack demo)
- Mock engine fires random trades every 1–4s
- Graduation at $69k mcap with confetti toast

## Real Solana later

- `hooks/useWallet.ts` — swap for `@solana/wallet-adapter`
- `store/useStore.ts` `executeTrade` / `createToken` — mark TODOs for program IX
- Chart + board stay the same
