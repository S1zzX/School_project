# GameGuide AI Assistant - API Reference

This file documents the APIs used by the GameGuide AI Assistant project, what each route is for, and which external services power live game data, AI analysis, pricing, media, and reviews.

## Base URL and Auth

- Backend development URL: `http://localhost:3001/api`
- Frontend usage: call `/api/*`; Vite proxies requests to backend port `3001`
- Request/response format: JSON
- JSON body limit: `50mb`
- Auth header: `Authorization: Bearer <jwt>`
- JWT lifetime: `7d`

Access labels:

| Label | Meaning |
|---|---|
| Public | No token required |
| Optional | Works without token, but token adds user-specific data |
| User | Any logged-in user |
| Owner/Admin | The resource owner or an admin |
| Seller | Shop owner/admin flow, or the seller for a trade/listing |
| Admin | Admin role only |

## Internal Backend APIs

### Health

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/health` | Public | Check if the Express API server is running |

### Authentication and Profile

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a gamer or shop owner account |
| POST | `/api/auth/login` | Public | Sign in and receive JWT + user profile |
| GET | `/api/auth/me` | User | Load the current logged-in profile from the server |
| POST | `/api/auth/refresh` | Public, token in body | Replace older/oversized JWTs with slim tokens |
| PATCH | `/api/auth/profile` | User | Update username, email, password, and avatar |

Example register body:

```json
{
  "username": "PlayerOne",
  "email": "player@example.com",
  "password": "minimum-6-characters",
  "role": "gamer",
  "shop_category": null
}
```

Example login body:

```json
{
  "email": "gamer@gmail.com",
  "password": "Password123"
}
```

### Wallet and Top Up

These endpoints power the account balance feature, MoMo/MB Bank top-up UI, and wallet checkout.

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/wallet` | User | Load current wallet balance, VND conversion, exchange rate, and recent wallet transactions |
| POST | `/api/wallet/top-up` | User | Credit balance after the user confirms a MoMo or MB Bank transfer in the demo flow |
| POST | `/api/wallet/debit` | User | Deduct wallet balance when the cart checkout uses `GameGuide Wallet` |

Top-up body:

```json
{
  "method": "momo",
  "currency": "USD",
  "amount": 10
}
```

Supported top-up methods:

| Value | Purpose |
|---|---|
| `momo` | MoMo QR transfer |
| `mb_bank` | MB Bank / VietQR transfer |

Supported currencies:

| Value | Purpose |
|---|---|
| `USD` | Input amount as USD |
| `VND` | Input amount as VND, converted to USD balance |

Current exchange rate in code: `25,000 VND = 1 USD`.

Important: this is currently a demo/manual-credit flow. It does not verify real MoMo or bank transfer webhooks yet.

### Cart and Checkout

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/cart` | User | List the current user's cart items |
| POST | `/api/cart` | User | Add an item to the current user's cart |
| DELETE | `/api/cart/:id` | User | Remove one cart item |
| DELETE | `/api/cart` | User | Clear all cart items |
| POST | `/api/store/purchase` | User | Purchase store listings or create escrow trade requests for skins |

Checkout behavior:

- Instant games/accounts generate local product keys/credentials in the frontend after checkout.
- Store listings call `/api/store/purchase` so stock/order counts update.
- Skin items create trade/escrow requests instead of instant key delivery.
- Wallet payments call `/api/wallet/debit` before finalizing checkout.

### Marketplace Store

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/store` | Public | List marketplace listings |
| POST | `/api/store` | User | Create a new store listing |
| POST | `/api/store/:id/view` | Public | Increment listing views when a listing is opened |
| POST | `/api/store/purchase` | User | Buy listed items or start skin escrow trade flow |

### Shop Owner Dashboard

All shop-owner routes require authentication. The route module also checks shop-owner/admin access for seller-specific workflows.

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/shop-owner/stats` | Seller | Seller dashboard totals |
| GET | `/api/shop-owner/listings` | Seller | Load current seller listings |
| PATCH | `/api/shop-owner/listings/:id` | Seller | Update seller listing price, stock, or status |
| DELETE | `/api/shop-owner/listings/:id` | Seller | Delete seller listing |
| GET | `/api/shop-owner/characters` | Seller | List game characters owned by seller |
| POST | `/api/shop-owner/characters` | Seller | Create a character record |
| PATCH | `/api/shop-owner/characters/:id` | Seller | Update a character record |
| DELETE | `/api/shop-owner/characters/:id` | Seller | Delete a character record |

### Forum and Community

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/forum` | Optional | List forum posts; token adds `liked_by_me` |
| GET | `/api/forum/:id` | Optional | Load one post and increment views |
| GET | `/api/forum/:id/replies` | Optional | Load replies for one post |
| POST | `/api/forum` | User | Create a forum post |
| PUT | `/api/forum/:id` | Owner/Admin | Edit a forum post |
| DELETE | `/api/forum/:id` | Owner/Admin | Delete a forum post |
| POST | `/api/forum/:id/like` | User | Toggle like/unlike |
| POST | `/api/forum/:id/replies` | User | Add a reply |
| DELETE | `/api/forum/:id/replies/:replyId` | Owner/Admin | Delete a reply |

### Support Tickets

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| POST | `/api/support` | Public/User | Submit a support ticket; token is optional |
| GET | `/api/support/mine` | User | Load current user's support tickets |
| GET | `/api/support` | Admin | Admin list of support tickets, with optional filters |
| GET | `/api/support/stats` | Admin | Ticket totals by status/priority |
| PATCH | `/api/support/:id` | Admin | Update status, priority, or admin response |
| DELETE | `/api/support/:id` | Admin | Delete a support ticket |

Valid ticket categories: `general`, `billing`, `account`, `technical`, `store`, `other`.

### Escrow Trades

These APIs support CS2/skin trade flows where the seller/admin must verify delivery.

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/trades/mine` | User | Load trades where current user is the buyer |
| GET | `/api/trades/for-seller` | Seller | Load trades for listings owned by the current seller |
| PATCH | `/api/trades/:id/respond` | Seller | Seller accepts/declines and can upload proof image |
| GET | `/api/trades` | Admin | Admin list of trades, optionally filtered by status |
| GET | `/api/trades/stats` | Admin | Admin trade totals by status |
| PATCH | `/api/trades/:id` | Admin | Verify, reject, or complete a trade |

Trade statuses include: `pending`, `seller_accepted`, `seller_declined`, `verified`, `rejected`, `completed`.

### Notifications

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/notifications` | User | Load notification inbox |
| GET | `/api/notifications/unread-count` | User | Load unread notification count for bell badge |
| PATCH | `/api/notifications/:id/read` | User | Mark one notification as read |
| PATCH | `/api/notifications/read-all` | User | Mark all notifications as read |
| GET | `/api/notifications/prefs` | User | Load notification settings |
| PATCH | `/api/notifications/prefs` | User | Save trade/support/order/promo/email notification preferences |

Email alerts are preference-only right now. No email sender is implemented yet.

### Vision AI and Image-Aware Chat

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/vision/status` | User | Show configured Vision providers and local runtime readiness |
| POST | `/api/vision/analyze` | User | Analyze a base64 game screenshot |
| POST | `/api/vision/chat` | User | Chat using the latest verified Vision result as context |

Analyze body:

```json
{
  "imageBase64": "<base64-without-data-url-prefix>",
  "mimeType": "image/png",
  "context": "optional hint",
  "provider": "groq"
}
```

Supported provider IDs: `groq`, `gemini`, `ollama`.

Special Vision behavior:

| Game/Item Type | Purpose |
|---|---|
| CS2 skins | Detect skin, verify against CS2 catalog, then fetch verified Steam Community Market price |
| Valorant inventory | Detect visible weapon skins, verify through Valorant catalog, estimate VP replacement cost |
| LoL/Valorant/Apex accounts | Treat cosmetics as account-bound; do not price as directly tradable skins |

### General AI Chat

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| POST | `/api/chat` | Public | General gaming assistant chat with marketplace/platform context |

Example body:

```json
{
  "messages": [
    { "sender": "user", "text": "What CS2 listings are available?" }
  ],
  "contextGame": "CS2"
}
```

### Analytics

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/analytics/summary` | Public | Marketplace summary: listings, sellers, trades, average price |
| GET | `/api/analytics/by-game` | Public | Listing statistics grouped by game |
| GET | `/api/analytics/by-type` | Public | Listing statistics grouped by listing type |
| GET | `/api/analytics/top-listings` | Public | Most viewed / most ordered listings |
| GET | `/api/analytics/price-ranges` | Public | Price range distribution |
| GET | `/api/analytics/recent-activity` | Public | Recent listing activity by date |
| POST | `/api/analytics/predict-price` | Public | Estimate a suggested listing price from attributes |

### Live Catalog, Steam Media, and Steam Reviews

These APIs power the product catalog, live game stats, trailer/screenshot section, and Steam review widgets.

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/catalog/live-prices?ids=1091500,1245620` | Public | CheapShark price data + Steam current players + SteamSpy ownership/playtime stats |
| GET | `/api/catalog/steam-media/:appid` | Public | Steam trailer videos, screenshots, Steam review summary, and recent public reviews |

`/api/catalog/live-prices` limits:

- Max `50` Steam App IDs per request
- In-memory server cache TTL: `45 minutes`

`/api/catalog/steam-media/:appid` response includes:

```json
{
  "appid": 1091500,
  "steamUrl": "https://store.steampowered.com/app/1091500",
  "trailers": [
    { "name": "Trailer", "webm": "...", "mp4": "...", "thumbnail": "..." }
  ],
  "screenshots": [
    { "thumbnail": "...", "full": "..." }
  ],
  "reviewSummary": {
    "reviewScoreDesc": "Very Positive",
    "totalPositive": 123,
    "totalNegative": 10,
    "totalReviews": 133
  },
  "reviews": [
    { "votedUp": true, "review": "...", "playtimeHours": 42 }
  ]
}
```

### Admin

All admin endpoints require `admin` role.

| Method | Endpoint | Access | Used For |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | List all users |
| PATCH | `/api/admin/users/:id` | Admin | Change user role or shop category |
| DELETE | `/api/admin/users/:id` | Admin | Delete a user |
| GET | `/api/admin/users/:id/content` | Admin | Load a user's forum posts and store listings |
| PUT | `/api/admin/forum/:id` | Admin | Moderate/edit a forum post |
| DELETE | `/api/admin/forum/:id` | Admin | Delete a forum post |
| PUT | `/api/admin/store/:id` | Admin | Moderate/edit a store listing |
| DELETE | `/api/admin/store/:id` | Admin | Delete a store listing |

## External APIs, CDNs, and What They Are Used For

| Service | URL / API | Used For | Auth Required | Cache / Fallback |
|---|---|---|---|---|
| Groq Cloud | Groq API | Cloud Vision model + chat responses | `GROQ_API_KEY` | Provider selectable |
| Google Gemini | Gemini API | Cloud Vision model + chat responses | `GEMINI_API_KEY` | Provider selectable |
| Ollama | Local `OLLAMA_BASE_URL` | Local Vision/chat model | Local runtime | Optional provider |
| Steam Store AppDetails | `https://store.steampowered.com/api/appdetails` | Game trailer movies, screenshots, Steam store sale metadata | None | 45-minute memory cache through backend |
| Steam App Reviews | `https://store.steampowered.com/appreviews/:appid` | Steam review summary and recent public reviews | None | 45-minute memory cache through backend |
| Steam Web API | `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/` | Current player count | None for this endpoint | 45-minute memory cache |
| SteamSpy | `https://steamspy.com/api.php` | Owners estimate, median playtime, CCU estimate | None | 45-minute memory cache |
| CheapShark | `https://www.cheapshark.com/api/1.0` | Discounted Steam deal prices | None | 45-minute memory cache |
| Steam Community Market | `https://steamcommunity.com/market/priceoverview` | Verified CS2 market price lookup | None | 30-minute memory cache in CS2 market helper |
| ByMykel CSGO-API | GitHub raw skins JSON | Authoritative CS2 skin catalog | None | 12-hour memory cache + local fallback |
| Valorant-API | `https://valorant-api.com/v1/*` | Valorant weapons, skins, icons, tiers | None | 12-hour memory cache |
| Steam CDN | `https://cdn.akamai.steamstatic.com/steam/apps/:appid/...` | Cover art, hero images, fallback screenshots | None | Browser/CDN cache |
| Unsplash CDN | Unsplash image URLs | Generic fallback product/editorial images | None | Browser/CDN cache |
| Simple Icons / jsDelivr / Icon Horse | Brand icon URLs | Software/gift-card brand logos | None | Image fallback component |

Runtime external URLs used by backend:

```text
https://store.steampowered.com/api/appdetails
https://store.steampowered.com/appreviews/:appid
https://www.cheapshark.com/api/1.0
https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/
https://steamspy.com/api.php
https://steamcommunity.com/market/priceoverview
https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
https://valorant-api.com/v1/weapons
https://valorant-api.com/v1/contenttiers
```

## Database Tables Used By APIs

| Table | Used By | Purpose |
|---|---|---|
| `users` | Auth, wallet, admin | Accounts, roles, avatar, wallet balance |
| `cart_items` | Cart | Per-user cart storage |
| `wallet_transactions` | Wallet/top-up/checkout | Balance top-ups and wallet debits |
| `store_listings` | Store, shop owner, analytics, trades | Marketplace listings and stock |
| `trade_requests` | Store purchase, trades, support/admin | Escrow trade workflow |
| `forum_posts` | Forum/admin | Community posts |
| `forum_replies` | Forum | Replies under forum posts |
| `post_likes` | Forum | Per-user likes |
| `support_tickets` | Support/admin | Ticket workflow |
| `notifications` | Notifications/trades/support | User notification inbox |
| `notification_prefs` | Notifications/settings | Per-user notification preferences |
| `characters` | Shop owner | Seller character/account records |
| `app_migrations` | DB init | Tracks one-time local migrations |

## Environment Variables

Create `server/.env` from `server/.env.example`.

| Variable | Required | Used For |
|---|---|---|
| `PORT` | No | Backend port; default `3001` |
| `JWT_SECRET` | Strongly recommended | JWT signing key |
| `GROQ_API_KEY` | If using Groq | Groq Vision/chat provider |
| `GEMINI_API_KEY` | If using Gemini | Gemini Vision/chat provider |
| `VISION_PROVIDER` | No | `auto`, `ollama`, `gemini`, or `groq` |
| `GROQ_VISION_MODEL` | No | Override Groq Vision model |
| `GEMINI_VISION_MODEL` | No | Override Gemini Vision model |
| `GEMINI_CHAT_MODEL` | No | Override Gemini chat model |
| `OLLAMA_ENABLED` | No | Enable local Ollama provider |
| `OLLAMA_BASE_URL` | No | Default `http://127.0.0.1:11434` |
| `OLLAMA_VISION_MODEL` | No | Local Vision model |
| `OLLAMA_CHAT_MODEL` | No | Local chat model |

Recommended local values:

```env
PORT=3001
JWT_SECRET=replace_with_a_long_random_secret
VISION_PROVIDER=auto
```

## Common Status Codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Invalid request body, invalid query, or unavailable selected provider |
| `401` | Missing, invalid, or expired JWT |
| `403` | Role or ownership denied |
| `404` | Resource not found |
| `409` | Duplicate user/cart conflict |
| `429` | AI provider rate limit |
| `500` | Internal server error |
| `503` | AI provider offline or misconfigured |

## Notes and Current Limitations

- MoMo/MB Bank top-up is a manual/demo confirmation flow. Real payment verification would need webhooks or a payment gateway integration.
- Steam reviews/media are public Steam endpoints. If Steam rate-limits or a game has no media/reviews, the frontend falls back gracefully.
- Steam sale end dates are usually not exposed by the public APIs used here.
- Purchase history for instant keys is currently stored client-side through local storage helpers, while marketplace listing stock/trades are server-side.
- Some product images are external CDN URLs, so image availability depends on those providers.