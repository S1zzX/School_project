# GameGuide AI Assistant — Account Credentials

## Admin Account
> Auto-seeded on first server startup. Cannot be registered via UI.

| Field    | Value                 |
|----------|-----------------------|
| Username | `Admin`               |
| Email    | `admin@gameguide.dev` |
| Password | `Admin@1234`          |
| Role     | `admin`               |

**Access:** Admin Panel (`/admin`), Shop Dashboard (`/shop-owner`), all moderation tools, Support Ticket management, delete any forum thread or store listing.

---

## Demo Accounts (Shop Owners)
> Seeded by running `node seed-demo.js` from the `server/` folder.

### S1zz — FPS / CS2 seller

| Field         | Value            |
|---------------|------------------|
| Username      | `S1zz`           |
| Email         | `shop@gmail.com` |
| Password      | `Password123`    |
| Role          | `shop_owner`     |
| Shop Category | `FPS Skins`      |

**Listings:** RPG accounts, CS2 skins, LoL / Valorant accounts (includes available, multi-stock, and sold items for testing).

### PixelTrader — MOBA seller

| Field         | Value              |
|---------------|--------------------|
| Username      | `PixelTrader`      |
| Email         | `pixel@gmail.com`  |
| Password      | `Password123`      |
| Role          | `shop_owner`       |
| Shop Category | `MOBA Cosmetics`   |

**Listings:** LoL and Valorant ranked accounts, CS2 skins.

**Access (both shop owners):** Post store listings, Shop Dashboard (`/shop-owner`), character management, community forum.

---

## Demo Gamer Account
> Also seeded by `node seed-demo.js`. Use this to test buying, cart checkout, and forum replies.

| Field    | Value            |
|----------|------------------|
| Username | `DemoGamer`      |
| Email    | `gamer@gmail.com`|
| Password | `Password123`    |
| Role     | `gamer`          |

**Access:** Browse store, add to cart, buy accounts, request CS2 skin trades, community forum, purchase history, support tickets.

---

## Register Your Own
> Any additional account can be created at `/register`.

| Field    | Value               |
|----------|---------------------|
| Username | *(choose your own)* |
| Email    | *(choose your own)* |
| Password | *(choose your own)* |
| Role     | `gamer` *(default)* |

> **Tip:** An Admin can upgrade any gamer account to `shop_owner` or `admin` from the Admin Panel → Users tab.

---

## Role Permissions Summary

| Feature                  | Gamer | Shop Owner | Admin |
|--------------------------|:-----:|:----------:|:-----:|
| Browse Store             | ✅    | ✅         | ✅    |
| Add to Cart / Buy        | ✅    | ✅         | ✅    |
| Post Store Listings      | ❌    | ✅         | ✅    |
| Shop Dashboard           | ❌    | ✅         | ✅    |
| Character Management     | ❌    | ✅         | ✅    |
| Community Forum          | ✅    | ✅         | ✅    |
| Submit Support Ticket    | ✅    | ✅         | ✅    |
| Manage Support Tickets   | ❌    | ❌         | ✅    |
| Admin Panel              | ❌    | ❌         | ✅    |
| Delete Any Content       | ❌    | ❌         | ✅    |

---

## How to Start the App

```bash
# Terminal 1 — Backend
cd server
npm install
npm start        # runs on http://localhost:3001

# Terminal 2 — Frontend
npm install
npm run dev      # runs on http://localhost:5173
```

### Seed demo data (optional)

```bash
cd server
node seed-demo.js
```

**What gets seeded (v2):**
- 2 shop owners (`S1zz`, `PixelTrader`) + 1 gamer (`DemoGamer`)
- ~18 store listings (accounts, CS2 skins, sold + available items)
- 14 community forum threads with sample replies

The script runs once per database. To re-seed, remove the `demo_seed_v2` row from the `app_migrations` table in `server/database.sqlite`, then run `node seed-demo.js` again.
