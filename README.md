# Solana Pinball

A Web3 pinball game on Solana. Connect a wallet, play, and sync scores with the API.

## App (`pinball-app`)

Backend (Express + MongoDB + Solana) and frontend (static Construct export) live in one folder:

- **API** — `server.js`, `tokenDistributor.js`, etc.
- **UI** — `public/` (HTML, scripts, assets)

One install and one start command serves both on the same port.

## Setup

```bash
cd pinball-app
cp .env.example .env   # then fill in values
npm install
npm run dev            # or: npm start
```

Open:

- Game: http://localhost:5000
- Leaderboard: http://localhost:5000/leaderboard.html

## Environment

See `pinball-app/.env.example` for `MONGO_URI`, Solana RPC, program IDs, and `CRON_SECRET`.

## Contract

Solana program sources are in `pinball-contract/` (Anchor).

## Deploy

Vercel config is in `pinball-app/vercel.json`. Set the Vercel project root to `pinball-app`.
