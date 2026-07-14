# IGNITE — live memecoin launchpad

pump.fun-style Solana board with a **live managed market**: real Phantom SOL
for buys/sells, system-owned price/supply/charts, **5% platform margin**, and a
**coin creation bot** that launches unique realistic meme coins every 30s.

## Live trading model

| Layer | What happens |
|--------|----------------|
| **SOL** | Buy → Phantom pays treasury. Sell → bot wallet pays trader. |
| **Curve** | Shared managed bonding curve (mcap, supply, candles). |
| **Margin** | 5% on every buy & sell (platform profit). |
| **Coin bot** | One unique curated meme / 30s via `/api/live-board` + GitHub Actions. |

Board state is shared through `GET/POST /api/live-board` (durable via GitHub
when `GITHUB_TOKEN` is set; warm-memory fallback otherwise).

## Stack

- Vite + React + TypeScript, Tailwind CSS v4, Zustand
- Phantom / Solflare wallet adapters
- lightweight-charts, canvas-confetti
- Optional real Anchor program in `program/` for on-chain curves

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

### `.env` (client)

```env
VITE_SOLANA_CLUSTER=devnet
VITE_SOLANA_RPC=https://api.devnet.solana.com
VITE_FEE_RECIPIENT=YourTreasuryPublicKey
VITE_ADMIN_KEY=change-me
```

### Vercel (server)

```env
# Durable board writes (contents:write PAT)
GITHUB_TOKEN=
# Sell payouts (base58 secret of funded bot wallet)
BOT_WALLET_SECRET=
# Optional API auth
BOT_API_SECRET=
CRON_SECRET=
LIVE_BOARD_OPEN=1
```

## Coin bot

1. **Browser** — `useLiveBoard` POSTs `action: launch` every 30s while open  
2. **Vercel cron** — `/api/cron-coin-bot` every minute  
3. **GitHub Actions** — `managed-board-bot.yml` loops every 30s for ~6h  

```bash
# Manual loop against production
LIVE_BOARD_URL=https://your-app.vercel.app node scripts/managed-board-bot.mjs
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local frontend |
| `npm run build` | Production build |
| `node scripts/managed-board-bot.mjs` | Continuous managed coin launches |
| `node scripts/bot-launch.mjs` | Real on-chain bot (needs `BOT_WALLET_SECRET`) |

## Trade flow

1. Connect Phantom  
2. Buy → approve SOL transfer to treasury → live curve updates for everyone  
3. Sell → curve books fill (after 5% margin) → `/api/managed-sell` pays SOL  
4. Charts / mcap / volume update in real time on the shared board  
