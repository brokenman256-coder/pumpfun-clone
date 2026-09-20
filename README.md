# NOVA — community rooms on Solana

Not a pump.fun clone. Each listing is its own **community room** (unique art,
unique crowd). **NOVA AI** boosts house rooms, unfavours open-market coins,
and follows live trader flow. Real Solana mints trade through the **desk**:
your SOL goes to the bot Phantom wallet, the desk buys on Jupiter, and a sell
sells that same bag back out.

House coins: unique picture every launch, unique district name.

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

### Netlify (server)

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
2. **GitHub Actions** — `managed-board-bot.yml` loops every 2 min for ~6h  
3. **Manual trigger** — `/api/cron-coin-bot` (optional, calls the same launch endpoint)  

```bash
# Manual loop against production
LIVE_BOARD_URL=https://nova-memecoin-launch.netlify.app node scripts/managed-board-bot.mjs
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local frontend |
| `npm run build` | Production build |
| `node scripts/managed-board-bot.mjs` | Continuous managed coin launches |
| `node scripts/bot-launch.mjs` | Real on-chain bot (needs `BOT_WALLET_SECRET`) |

## Trade flow

**House rooms (our coins)**  
1. Connect Phantom  
2. Buy → SOL to desk wallet → curve updates  
3. Sell → `/api/managed-sell` pays SOL back  
4. NOVA AI follows with boost clips on that room  

**Open-market Solana mints (DexScreener)**  
1. Approve SOL to the desk wallet (`VITE_BOT_WALLET_ADDRESS`)  
2. `/api/proxy-desk` verifies the deposit, Jupiter-buys the mint, books your bag  
3. Sell → desk Jupiter-sells the same bag in that request and pays you  

Server needs `BOT_WALLET_SECRET` (Phantom export, base58).  
