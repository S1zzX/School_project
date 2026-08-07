# GameGuide AI Assistant

GameGuide AI Assistant is a full-stack gaming marketplace built with React, Express, and SQLite. It includes a game storefront, wallet checkout, seller tools, community features, support tickets, and Vision AI screenshot analysis.

## Features

- Storefront for game keys, digital products, and community listings
- Live Steam Top Sellers chart (`IStoreTopSellers/GetWeeklyTopSellers`) with real-time price & image synchronization
- Dynamic product detail pages for any Steam App ID (`/product/steam-top-[appid]`) with live Steam trailers, screenshots, prices, player counts, and reviews
- Real Steam reviewer names & avatars fetched via official Steam Web API (`ISteamUser/GetPlayerSummaries`)
- Cart, checkout, purchase history, and product-key delivery
- Wallet top-up by MoMo or MB Bank with USD/VND conversion
- Shop owner dashboard for listings, stock, orders, and AI-assisted scans
- Vision AI for CS2 skins, Valorant collections, and general game screenshots
- Forum, support tickets, escrow trades, notifications, admin tools, settings, and EN/VI UI

## Tech Stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, React Router 7 |
| Styling | Tailwind CSS 4, Radix UI, Lucide icons |
| Backend | Node.js, Express 4 |
| Database | SQLite with `better-sqlite3` |
| Auth | JWT, bcrypt |
| AI | Groq Vision, Google Gemini, local Ollama |
| External data | Steam, CheapShark, SteamSpy, CSGO-API, Valorant-API |

## Quick Start

### 1. Install

```bash
npm install
cd server
npm install
cd ..
```

### 2. Configure Backend

Create `server/.env`:

```powershell
Copy-Item server\.env.example server\.env
```

Minimum values:

```env
JWT_SECRET=replace_with_a_long_random_secret
VISION_PROVIDER=auto
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
STEAM_API_KEY=your_steam_web_api_key_here # Optional: enables real Steam reviewer persona names and weekly top sellers chart
```

For local Ollama, use:

```env
VISION_PROVIDER=ollama
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_VISION_MODEL=gemma4:26b
```

Only one Vision provider is required.

### 3. Run

```bash
npm run dev
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:3001` |
| Health check | `http://localhost:3001/api/health` |

### 4. Optional Demo Data

```bash
cd server
node seed-demo.js
```

Demo accounts are listed in [ACCOUNTS.md](ACCOUNTS.md). The default admin account is `admin@gameguide.dev` / `Admin@1234`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend and backend together |
| `npm run dev:client` | Start Vite only |
| `npm run dev:server` | Start Express backend only |
| `npm run build` | Build frontend into `dist/` |
| `cd server && npm run start` | Start backend without watch mode |

## Project Map

```text
src/app/components/   Shared UI and layout
src/app/lib/          API client, products, settings, helpers
src/app/pages/        Route screens
src/assets/           Product and payment assets
src/styles/           Tailwind entry and theme tokens
server/routes/        Express API routes
server/lib/           AI, catalog, and market helpers
server/db.js          SQLite schema and migrations
```

## More Documentation

- [API.md](API.md) - endpoints, integrations, and environment details
- [ACCOUNTS.md](ACCOUNTS.md) - demo users and roles
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - detailed folders and data flow

## Notes

- Keep `server/.env`, `server/database.sqlite`, and local database WAL/SHM files out of source control.
- External APIs can be rate-limited or temporarily unavailable.
- Steam reviews use live Steam pagination with cursor-based `Load more`.
- Wallet top-up records submitted transfer details; real payment confirmation still needs production integration.
- Before deployment, replace demo passwords, set a strong `JWT_SECRET`, restrict CORS, use HTTPS, and add backups.
