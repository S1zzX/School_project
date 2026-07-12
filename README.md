# GameGuide AI Assistant

GameGuide is a full-stack gaming marketplace and AI assistant. Users can browse game keys and digital products, buy or sell community listings, analyze game screenshots, discuss results with an image-aware assistant, and monitor marketplace activity.

## Highlights

- Responsive storefront for Steam keys, software, subscriptions, and gift cards
- Community marketplace for game accounts and CS2 skins
- Cart, checkout, purchase history, and instant product-key delivery
- Shop Owner Dashboard for listings, stock, orders, and AI-assisted listing scans
- Community forum with posts, replies, likes, views, and moderation
- Support tickets and CS2 escrow trade workflow
- Admin tools for users, listings, posts, trades, and tickets
- In-app notifications with per-user preferences
- English and Vietnamese UI
- Per-account Light, Dark, and Auto themes
- Guest sessions always start in Light Mode

## Vision AI

Upload a gaming screenshot and select an available Vision provider. The assistant returns structured information and supports follow-up questions about the image.

Supported providers:

- Groq Cloud with Llama Vision
- Google Gemini
- Local Ollama Vision models

### CS2 verification pipeline

CS2 skin recognition uses two stages:

1. Vision AI produces an initial weapon and skin guess.
2. The backend loads valid skin names for that weapon from the CS2 catalog.
3. Vision AI receives the screenshot again with only valid candidates.
4. The selected name must match the catalog exactly.
5. Steam Community Market pricing is requested only for the verified market hash name.

Wear and float remain empty unless they are explicitly visible in the screenshot. The chat assistant cannot invent a CS2 price when Steam has not verified one.

### Valorant inventory pipeline

Valorant collection screenshots use a separate multi-item workflow:

1. Vision AI identifies the visible weapon slots and initial skin guesses.
2. The backend groups valid Valorant-API candidates by weapon.
3. A second Vision pass selects exact catalog names.
4. Results include weapon, skin, content tier, confidence, CDN artwork, and estimated VP.
5. The UI calculates a replacement-cost range in VP and USD.

Valorant cosmetics are account-bound. The displayed amount is an estimated replacement cost, not a resale or marketplace value. Battle Pass and unclassified skins are excluded from reliable VP totals.

## Main areas

| Area | Description |
|---|---|
| Home | Hero carousel and digital-product categories |
| Store | Player listings for skins and game accounts |
| Vision AI | Screenshot analysis, catalog verification, and image-aware chat |
| Community | Forum posts, replies, likes, and moderation |
| Analytics | Listing summaries, game/type charts, price ranges, and activity |
| Shop Dashboard | Seller inventory, listing editing, orders, and Vision scan |
| Support | Tickets and escrow trade requests |
| Admin | User, content, ticket, and trade management |
| Settings | Profile, avatar crop, language, theme, accent, and notifications |

## Technology

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 and `gs-*` design tokens |
| Components | Radix UI, shadcn/ui, Lucide, Material UI |
| Charts | Recharts |
| Backend | Node.js and Express 4 |
| Database | SQLite with `better-sqlite3` |
| Authentication | JWT and bcrypt |
| Cloud AI | Groq and Google Gemini |
| Local AI | Ollama |

## External data

- Steam Community Market for verified CS2 prices
- ByMykel CSGO-API for valid CS2 skin names
- Valorant-API for weapon skins, icons, and content tiers
- CheapShark for Steam deal prices
- Steam Web API for current player counts
- SteamSpy for ownership and playtime estimates
- Steam, Unsplash, Simple Icons, jsDelivr, and Icon Horse CDNs for remote artwork

See [API.md](API.md) for endpoints, request examples, cache behavior, and service details.

## Getting started

### Requirements

- Node.js 18 or later
- npm
- At least one Vision provider:
  - Groq API key
  - Gemini API key
  - Ollama running locally

### Install

```bash
git clone <your-repository-url>
cd "GameGuide AI Assistant"

npm install
cd server
npm install
cd ..
```

### Configure the backend

Copy the example environment file:

```powershell
Copy-Item server\.env.example server\.env
```

Cloud example:

```env
JWT_SECRET=replace_with_a_long_random_secret
VISION_PROVIDER=auto
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

Local Ollama example:

```env
VISION_PROVIDER=ollama
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_VISION_MODEL=gemma4:26b
```

Only one working Vision provider is required. When `VISION_PROVIDER=auto`, the backend selects an available provider using its configured priority.

### Run

```bash
npm run dev
```

| Service | Address |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend | `http://localhost:3001` |
| Health check | `http://localhost:3001/api/health` |

### Seed demo data

```bash
cd server
node seed-demo.js
```

The seed creates two shop owners, one gamer, marketplace listings, and community content. The admin is created automatically on the first backend start.

See [ACCOUNTS.md](ACCOUNTS.md) for credentials, permissions, and re-seed instructions.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gameguide.dev` | `Admin@1234` |
| Shop owner — S1zz | `shop@gmail.com` | `Password123` |
| Shop owner — PixelTrader | `pixel@gmail.com` | `Password123` |
| Gamer — DemoGamer | `gamer@gmail.com` | `Password123` |

These credentials are for local demonstrations only. Replace them before deploying publicly.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start frontend and backend together |
| `npm run dev:client` | Start Vite only |
| `npm run dev:server` | Start Express in watch mode |
| `npm run build` | Create the production frontend build in `dist/` |

## Project layout

```text
GameGuide AI Assistant/
├── src/
│   ├── app/
│   │   ├── components/       Shared UI, auth, chat, and Vision components
│   │   ├── lib/              API client, catalog data, settings, and helpers
│   │   └── pages/            Route-level screens
│   ├── assets/               Remaining local game/subscription artwork and icon
│   └── styles/               Theme tokens, Tailwind entry, fonts, animations
├── server/
│   ├── lib/                  Notifications, market data, AI providers, catalogs
│   ├── middleware/           JWT authentication and role guards
│   ├── routes/               Express REST endpoints
│   ├── db.js                 SQLite schema, migrations, and admin seed
│   └── seed-demo.js          Optional demonstration data
├── ACCOUNTS.md               Demo credentials and role permissions
├── API.md                    Internal and external API reference
├── PROJECT_STRUCTURE.md      Detailed file and route guide
└── package.json              Workspace scripts and frontend dependencies
```

## Theme behavior

- Guests always use Light Mode.
- Signed-in users can select Light, Dark, or Auto.
- Auto follows `prefers-color-scheme` from the browser/operating system.
- Theme, accent color, and language are stored separately for each account.
- Login and registration use a dedicated calm light theme.

## Notes and limitations

- Vision catalog verification uses two AI calls and may consume more quota than a single analysis.
- Remote catalogs are cached in memory for 12 hours.
- Steam and other external services may rate-limit or temporarily reject requests.
- Purchase history is currently stored by client-side helpers.
- Email notifications and promotional campaigns are not yet implemented.
- Social login buttons are currently visual placeholders.
- Large production bundles should be split with route-level lazy loading before deployment.

## Documentation

- [API.md](API.md) — REST endpoints, auth, integrations, and environment variables
- [ACCOUNTS.md](ACCOUNTS.md) — demo credentials and role permissions
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — folders, files, routes, and data flow

## Production checklist

- Replace demo passwords.
- Set a strong `JWT_SECRET`.
- Keep `server/.env` and `server/database.sqlite` out of source control.
- Restrict CORS to the deployed frontend origin.
- Disable demo data seeding.
- Use HTTPS.
- Add persistent production storage and backups.
