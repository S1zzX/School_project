# GameGuide AI Assistant — Account Credentials

## Admin Account
> Auto-seeded on first server startup. Cannot be registered via UI.

| Field    | Value                  |
|----------|------------------------|
| Username | `c`                |
| Email    | `admin@gameguide.dev`  |
| Password | `Admin@1234`           |
| Role     | `admin`                |

**Access:** Admin Panel (`/admin`), Shop Dashboard (`/shop-owner`), all moderation tools, Support Ticket management.

---

## Shop Owner Account (Demo)
> Seeded by running `node server/seed-demo.js` from the `server/` folder.

| Field         | Value            |
|---------------|------------------|
| Username      | `S1zz`           |
| Email         | `shop@gmail.com` |
| Password      | `Password123`    |
| Role          | `shop_owner`     |
| Shop Category | `FPS Skins`      |

**Access:** Post store listings, Shop Dashboard (`/shop-owner`), character management, account selling.

---

## Gamer Account
> Register a new account via the UI at `/register`.

| Field    | Value                        |
|----------|------------------------------|
| Username | *(choose your own)*          |
| Email    | *(choose your own)*          |
| Password | *(choose your own)*          |
| Role     | `gamer` *(default)*          |

**Access:** Browse store, add to cart, community forum, purchase history, support tickets.

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
