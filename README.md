# pump.fun clone

A pump.fun-style Solana memecoin launchpad. Token creation and trading go
through a real deployed on-chain program (`program/`) — a bonding-curve PDA
vault that actually moves SOL and SPL tokens, not client-side math — plus a
board/feed UI with live charts, comments, holders, and an admin dashboard.

## Stack

- Vite + React + TypeScript, Tailwind CSS v4, Zustand
- `@solana/web3.js` + `@solana/wallet-adapter-react` (Phantom, Solflare)
- lightweight-charts (TradingView-style candles), canvas-confetti
- On-chain: Anchor program in `program/` (see `program/README.md` for the
  build/deploy process — it needs a pinned older toolchain, documented there)

## Run the frontend

```bash
npm install
npm run dev
```

Open http://localhost:5173. Set `VITE_SOLANA_CLUSTER` (`devnet` / `localnet` /
`mainnet-beta`) and `VITE_LAUNCHPAD_PROGRAM_ID` in `.env` to point at your
deployed program (see `.env.example`).

## What's real vs. simulated

- **Real, on-chain**: "Bonding curve" mode on the Create page mints a token
  and creates its curve via the deployed program; buying/selling a
  bonding-curve-backed coin sends real transactions that move real SOL and
  real SPL tokens through the program's vault. The TradePanel shows a
  "🔒 on-chain curve" badge for these.
- **Simulated**: the board's background trade ticker/bot fleet (demo
  activity for a livelier board) and any legacy/DexScreener-sourced coins —
  these show a "simulated" badge in the TradePanel and aren't backed by the
  on-chain program.

## Features

- Token board with King of the Hill, live ticker, shake-on-trade cards
- Token page: live candlestick chart, buy/sell panel, bonding curve, trades,
  thread, holders
- Create a real on-chain coin (bonding curve) or mint a standalone SPL token
- Profile: held / created / replies + PnL
- Admin dashboard: live treasury balance, deployed program ID, on-chain vs.
  simulated coin counts, bot fleet controls, gateway payment ledger
- Graduation flag once the curve's real SOL raised crosses the threshold
  (migrating liquidity to a DEX like Raydium is a real follow-up, not done)

## Program

See `program/README.md` for the on-chain program's architecture, how to build
it (needs a pinned Anchor/Solana toolchain — a plain `anchor build` on a
modern host will fail), deploy it, and run the one-time `initialize` step a
fresh deployment needs.
