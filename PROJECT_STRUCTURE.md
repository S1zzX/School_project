# Project Structure

Reference for the **GameGuide AI Assistant** codebase — a Vite + React frontend and an Express + SQLite backend.

---

## Root directory

| File / folder | Purpose |
|---------------|---------|
| `index.html` | HTML shell; mounts React at `#root` |
| `package.json` | Frontend dependencies and scripts (`dev`, `build`) |
| `vite.config.ts` | Vite + React + Tailwind; proxies `/api` → `localhost:3001` |
| `README.md` | Project overview, setup, demo GIF placeholders |
| `ACCOUNTS.md` | Test account credentials and role permissions |
| `API.md` | Complete REST API and external integration reference |
| `PROJECT_STRUCTURE.md` | This file |
| `docs/demo/` | Drop GIF screen recordings referenced by `README.md` |

---

## `server/` — Backend (Express + SQLite, port 3001)

| File | Purpose |
|------|---------|
| `index.js` | Express entry — CORS, JSON body (50 MB limit), route mounting, health check |
| `db.js` | SQLite init (`database.sqlite`), schema, migrations (`app_migrations`), admin seed |
| `seed-demo.js` | Optional demo users, store listings, forum posts (`demo_seed_v2`) |
| `.env.example` | Template for `GROQ_API_KEY` and optional `PORT` |
| `package.json` | Backend-only deps (`express`, `better-sqlite3`, `bcryptjs`, `jsonwebtoken`) |

### `server/middleware/`

| File | Purpose |
|------|---------|
| `auth.js` | `requireAuth` (JWT verify) and `requireRole(...roles)` guards |

### `server/lib/`

| File | Purpose |
|------|---------|
| `notifications.js` | Create in-app notifications for users and admins |

### `server/routes/`

| File | Base path | Responsibility |
|------|-----------|----------------|
| `auth.js` | `/api/auth` | Register, login, `GET /me`, profile update, token refresh |
| `cart.js` | `/api/cart` | Cart CRUD for authenticated users |
| `store.js` | `/api/store` | Public listings, create listing, purchase, view counter |
| `forum.js` | `/api/forum` | Posts, replies, likes; admin can delete/edit any post |
| `admin.js` | `/api/admin` | User CRUD, forum/store moderation, tickets, trades (admin only) |
| `shop-owner.js` | `/api/shop-owner` | Seller dashboard stats and listing delete |
| `support.js` | `/api/support` | Support tickets (user + admin) |
| `trades.js` | `/api/trades` | Skin trade escrow requests |
| `notifications.js` | `/api/notifications` | Notification inbox and preferences |
| `chat.js` | `/api/chat` | AI chat proxy (Groq) |
| `vision.js` | `/api/vision` | Screenshot analysis (Groq vision) |
| `analytics.js` | `/api/analytics` | Market summary, charts, top listings, price prediction |

---

## `src/` — Frontend (React + Vite, port 5173)

| File | Purpose |
|------|---------|
| `main.tsx` | React DOM entry |
| `app/App.tsx` | Router provider wrapper |
| `app/routes.ts` | All route definitions |

### `src/app/pages/`

| File | Route | Access |
|------|-------|--------|
| `Dashboard.tsx` | `/` | Public home + catalog carousels |
| `Store.tsx` | `/store` | Player marketplace (skins + accounts) |
| `Community.tsx` | `/community` | Forum threads and replies |
| `VisionPage.tsx` | `/vision` | Vision AI upload + chat |
| `Analytics.tsx` | `/analytics` | Market analytics dashboard |
| `Cart.tsx` | `/cart` | Shopping cart and checkout |
| `ProductDetail.tsx` | `/product/:id` | Single product page |
| `PurchaseHistory.tsx` | `/purchase-history` | Order history |
| `Support.tsx` | `/support` | Tickets and trade requests |
| `ShopOwner.tsx` | `/shop-owner` | Seller dashboard |
| `Admin.tsx` | `/admin` | Admin panel |
| `Settings.tsx` | `/settings` | Theme, language, account, notifications |
| `Login.tsx` | `/login` | Sign in (no layout shell) |
| `Register.tsx` | `/register` | Sign up with role selection |

### `src/app/components/`

| File | Purpose |
|------|---------|
| `Layout.tsx` | Sticky header, inline nav (4 links), search, cart, user menu, footer |
| `HomeProductCarousel.tsx` | Horizontal product row with scroll arrows (home page) |
| `AvatarCropModal.tsx` | Circular profile photo crop (zoom + rotate) |
| `NotificationBell.tsx` | Header notification dropdown |
| `VisionAnalyzer.tsx` | Screenshot upload and AI analysis UI |
| `VisionChat.tsx` | Follow-up chat after vision analysis |
| `ChatBot.tsx` | General AI chat widget |
| `FloatingContact.tsx` | Floating support shortcut |
| `IntroSplash.tsx` | First-visit intro animation |
| `figma/ImageWithFallback.tsx` | Safe image loading with fallback |
| `ui/` | shadcn/ui primitives (Button, Dialog, Slider, etc.) |

### `src/app/lib/`

| File | Purpose |
|------|---------|
| `api.ts` | Fetch helper, JWT + avatar cache, all API functions |
| `AppContext.tsx` | Theme, accent color, language, motion preferences |
| `i18n.ts` | English / Vietnamese translation strings |
| `products.ts` | Static catalog products (keys, software, gift cards) |
| `catalog.ts` | Category definitions for header and home sections |
| `purchaseHistory.ts` | Client-side purchase history helpers |
| `cropImage.ts` | Canvas helper for avatar crop export |

### `src/assets/`

Game art, gift card images, subscription banners, `iconweb.png`.

### `src/styles/`

| File | Purpose |
|------|---------|
| `theme.css` | `gs-*` CSS variables (light + `.dark`) |
| `index.css` / `tailwind.css` | Tailwind entry and global resets |
| `fonts.css` | Font imports |

---

## Navigation map

**Header (always visible):** Home, Store, Community, Vision AI

**User dropdown:** Settings, Purchase History, Analytics, Support, Shop Dashboard (seller/admin), Admin Panel (admin), Sign Out

**Header icons:** Cart (badge), notifications bell, wishlist (UI), search

---

## User roles

| Role | Key capabilities |
|------|------------------|
| **Gamer** | Browse, buy, cart, forum, support, Vision AI |
| **Shop owner** | All gamer features + post listings, shop dashboard |
| **Admin** | Full moderation, user management, trades, tickets |

Shop owners pick one category at registration (changeable by admin). See [ACCOUNTS.md](ACCOUNTS.md).

---

## Data flow (simplified)

```
Browser (React)
    │  fetch /api/*  (JWT in Authorization header)
    ▼
Vite dev proxy → Express (server/index.js)
    │  requireAuth / requireRole
    ▼
SQLite (server/database.sqlite)
```

**Avatar note:** Profile images are stored in the database as data URLs. JWT tokens stay small (no embedded image) to avoid HTTP 431 header errors. Avatars are cached in `localStorage` under `gg_user_profile`.

---

## Key API groups (quick reference)

```
POST   /api/auth/register | /login | /refresh
PATCH  /api/auth/profile
GET    /api/auth/me

GET    /api/store
POST   /api/store | /store/purchase | /store/:id/view

GET    /api/forum
POST   /api/forum | /forum/:id/like | /forum/:id/replies
DELETE /api/forum/:id

GET    /api/analytics/summary | /by-game | /top-listings | ...

GET    /api/admin/users          [admin]
PATCH  /api/admin/users/:id      [admin]
DELETE /api/admin/forum/:id      [admin]
```

---

## Development commands

```bash
# Both services
npm run dev

# Seed demo marketplace + forum data
cd server && node seed-demo.js

# Production build (frontend)
npm run build
```

---

## Related docs

- [README.md](README.md) — setup, features, demo GIF placeholders
- [ACCOUNTS.md](ACCOUNTS.md) — credentials and permissions table
- [API.md](API.md) — endpoints, authentication, integrations, and environment variables
