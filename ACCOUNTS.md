# GameGuide AI Assistant — Demo Accounts

These credentials are for local development and demonstrations only. Do not reuse them in a public deployment.

## Admin

The admin account is created automatically when the backend starts for the first time.

| Field | Value |
|---|---|
| Username | `Admin` |
| Email | `admin@gameguide.dev` |
| Password | `Admin@1234` |
| Role | `admin` |

Access includes the Admin Panel, Shop Owner Dashboard, user and content moderation, support tickets, escrow trades, analytics, notifications, Vision AI, cart, store, and community features.

## Demo shop owners

Created by running `node seed-demo.js` inside `server/`.

### S1zz

| Field | Value |
|---|---|
| Username | `S1zz` |
| Email | `shop@gmail.com` |
| Password | `Password123` |
| Role | `shop_owner` |
| Shop category | `FPS Skins` |

Seed data includes game accounts, CS2 skins, Valorant accounts, available stock, and sold listings.

### PixelTrader

| Field | Value |
|---|---|
| Username | `PixelTrader` |
| Email | `pixel@gmail.com` |
| Password | `Password123` |
| Role | `shop_owner` |
| Shop category | `MOBA Cosmetics` |

Seed data includes LoL and Valorant accounts plus CS2 skin listings.

Shop owners can post and manage listings, manage characters, use AI Vision to scan listing screenshots, access community features, buy products, create support tickets, and respond to trades involving their listings.

## Demo gamer

| Field | Value |
|---|---|
| Username | `DemoGamer` |
| Email | `gamer@gmail.com` |
| Password | `Password123` |
| Role | `gamer` |

Use this account to test cart checkout, purchase history, support tickets, CS2 escrow requests, notifications, community posts, AI chat, and screenshot analysis.

## Role permissions

| Feature | Gamer | Shop owner | Admin |
|---|:---:|:---:|:---:|
| Browse catalog and store | Yes | Yes | Yes |
| Cart and checkout | Yes | Yes | Yes |
| Purchase history | Yes | Yes | Yes |
| Community posts, replies, and likes | Yes | Yes | Yes |
| Support tickets | Yes | Yes | Yes |
| Vision AI and gaming chat | Yes | Yes | Yes |
| Create marketplace listings | No | Yes | Yes |
| Shop Owner Dashboard | No | Yes | Yes |
| Manage own characters and listings | No | Yes | Yes |
| Respond to seller trade requests | No | Yes | Yes |
| Manage users and all content | No | No | Yes |
| Review all trades and support tickets | No | No | Yes |

## Create another account

Open `/register`. The public registration flow accepts `gamer` and `shop_owner`; an admin account cannot be registered through the UI.

Valid shop categories:

- `FPS Skins`
- `RPG Items`
- `Strategy Gear`
- `MOBA Cosmetics`
- `Battle Royale Loot`

Admins can change roles and shop categories from `/admin`.

## Start and seed

```bash
# Install once
npm install
cd server
npm install
cd ..

# Start frontend and backend
npm run dev

# Optional demo data
cd server
node seed-demo.js
```

The seed is guarded by the `demo_seed_v2` row in `app_migrations`. To intentionally seed again, delete only that row from the local SQLite database and rerun the script.

## Production security checklist

- Replace all demo passwords.
- Set a strong `JWT_SECRET` in `server/.env`.
- Do not commit `server/.env` or `server/database.sqlite`.
- Restrict CORS to the deployed frontend origin.
- Remove or disable automatic demo/admin seeding for a public deployment.
