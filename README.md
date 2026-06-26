# GameGuide AI Assistant

A full-stack gaming marketplace with AI-powered tools — browse and buy game keys, accounts, and skins; sell through a shop dashboard; analyze screenshots with Vision AI; and explore live market analytics.

---

## Demo

Drop your screen recordings into `docs/demo/` and replace the filenames below. Recommended size: 1280×720, under 5 MB per GIF.

### Home & catalog

![Home page — catalog sections and hero](docs/demo/home.gif)

### Player store

![Player store — browse listings, cart, and purchase](docs/demo/store.gif)

### Vision AI

![Vision AI — screenshot analysis and chat](docs/demo/vision-ai.gif)

### Market analytics

![Market analytics — live charts and top listings](docs/demo/analytics.gif)

### Community forum

![Community — threads, replies, and moderation](docs/demo/community.gif)

### Shop owner dashboard

![Shop dashboard — manage listings and sales](docs/demo/shop-owner.gif)

---

## Features

| Area | Description |
|------|-------------|
| **Home** | Catalog sections (Steam keys, software, subscriptions, gift cards, outlet) with horizontal carousels |
| **Store** | Community marketplace for CS2 skins, LoL/Valorant accounts, and seller listings |
| **Vision AI** | Upload a game screenshot; AI identifies items and supports follow-up chat |
| **Analytics** | Live market stats — listings by game, price ranges, top viewed items (30s refresh) |
| **Community** | Forum with categories, likes, replies; admins can moderate any thread |
| **Support** | Support tickets and skin trade escrow with admin review |
| **Shop Dashboard** | Sellers post listings, track orders, and manage inventory |
| **Admin Panel** | User management, content moderation, trades, and tickets |
| **Notifications** | In-app bell for trades, orders, support replies, and promos |
| **Settings** | Theme, language (EN/VI), profile editor with circular avatar crop |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite 6 |
| Routing | React Router 7 |
| Styling | Tailwind CSS v4 (`gs-*` design tokens, light/dark) |
| UI | Radix UI + shadcn/ui components |
| Backend | Node.js + Express |
| Database | SQLite (`better-sqlite3`) |
| Auth | JWT (slim tokens; avatars stored in DB + local cache) |
| AI | Groq Cloud (Vision + chat) |

---

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd "GameGuide AI Assistant"
npm install
cd server && npm install && cd ..
```

### 2. Environment

Copy `server/.env.example` to `server/.env` and set your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get a free key at [console.groq.com](https://console.groq.com).

### 3. Run (frontend + backend)

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |

### 4. Seed demo data (optional)

```bash
cd server
node seed-demo.js
```

Adds shop owners, a demo gamer, store listings, and forum threads. See [ACCOUNTS.md](ACCOUNTS.md) for credentials.

---

## Default accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@gameguide.dev` | `Admin@1234` |
| Shop owner (S1zz) | `shop@gmail.com` | `Password123` |
| Shop owner (PixelTrader) | `pixel@gmail.com` | `Password123` |
| Gamer (demo) | `gamer@gmail.com` | `Password123` |

Admin is auto-seeded on first server start. Demo shop/gamer accounts require `seed-demo.js`.

Full role permissions and re-seed instructions: [ACCOUNTS.md](ACCOUNTS.md).

---

## Project layout

High-level structure only — see [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the full file-by-file guide.

```
GameGuide AI Assistant/
├── src/                    # React frontend
│   ├── app/
│   │   ├── pages/          # Route screens
│   │   ├── components/     # Layout, Vision, notifications, UI
│   │   └── lib/            # API client, i18n, products, catalog
│   ├── assets/             # Images (games, gift cards, icons)
│   └── styles/             # theme.css, Tailwind entry
├── server/                 # Express API
│   ├── routes/             # REST endpoints
│   ├── middleware/         # JWT auth + role guards
│   ├── lib/                # Shared helpers (notifications)
│   ├── db.js               # SQLite schema + migrations
│   └── seed-demo.js        # Demo data seeder
├── docs/demo/              # Placeholder folder for README GIFs
├── ACCOUNTS.md             # Test account credentials
├── PROJECT_STRUCTURE.md    # Detailed structure reference
└── package.json            # `npm run dev` runs client + server
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite (5173) and Express (3001) together |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | Backend only (with `--watch`) |
| `npm run build` | Production build to `dist/` |

---

## Documentation

- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) — folders, routes, and API map
- [ACCOUNTS.md](ACCOUNTS.md) — login credentials and role permissions
