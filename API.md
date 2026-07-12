# GameGuide AI Assistant — API Reference

## Base URL and authentication

- Development API: `http://localhost:3001/api`
- Vite frontend: requests `/api/*`, proxied to port `3001`
- JSON body limit: 50 MB
- Auth header: `Authorization: Bearer <jwt>`
- JWT lifetime: 7 days

Access labels used below:

- **Public** — no token required
- **User** — any authenticated user
- **Seller** — `shop_owner` or `admin`
- **Admin** — `admin` only
- **Optional** — public, but a token adds user-specific information

## Health

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Server status and current timestamp |

## Authentication and profile

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a gamer or shop owner |
| POST | `/api/auth/login` | Public | Sign in and receive JWT plus user data |
| GET | `/api/auth/me` | User | Load the current profile |
| POST | `/api/auth/refresh` | Token in body | Exchange a legacy token for a slim token |
| PATCH | `/api/auth/profile` | User | Update username, email, avatar, or password |

Register body:

```json
{
  "username": "PlayerOne",
  "email": "player@example.com",
  "password": "minimum-6-characters",
  "role": "gamer",
  "shop_category": null
}
```

Login body:

```json
{ "email": "gamer@gmail.com", "password": "Password123" }
```

Successful login/register response:

```json
{ "token": "<jwt>", "user": { "id": 1, "username": "DemoGamer", "role": "gamer" } }
```

## Cart and checkout

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/cart` | User | List current cart items |
| POST | `/api/cart` | User | Add or update a cart item |
| DELETE | `/api/cart/:id` | User | Remove one cart item |
| DELETE | `/api/cart` | User | Clear the cart |
| POST | `/api/store/purchase` | User | Purchase listings or create a CS2 escrow trade |

## Marketplace store

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/store` | Public | List marketplace listings; supports query filters |
| POST | `/api/store` | User | Create a listing; backend validates seller role/category |
| POST | `/api/store/:id/view` | Public | Increment listing views |
| POST | `/api/store/purchase` | User | Buy non-skin items or start a skin trade |

## Shop owner

All endpoints require authentication and enforce `shop_owner` or `admin` access.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/shop-owner/stats` | Dashboard totals |
| GET | `/api/shop-owner/listings` | Current seller listings |
| PATCH | `/api/shop-owner/listings/:id` | Update own price, stock, or status |
| DELETE | `/api/shop-owner/listings/:id` | Delete own listing |
| GET | `/api/shop-owner/characters` | List own game characters |
| POST | `/api/shop-owner/characters` | Create character |
| PATCH | `/api/shop-owner/characters/:id` | Update own character |
| DELETE | `/api/shop-owner/characters/:id` | Delete own character |

## Forum

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/forum` | Optional | List posts |
| GET | `/api/forum/:id` | Optional | Load one post and increment views |
| GET | `/api/forum/:id/replies` | Optional | List replies |
| POST | `/api/forum` | User | Create post |
| PUT | `/api/forum/:id` | Owner/Admin | Edit post |
| DELETE | `/api/forum/:id` | Owner/Admin | Delete post |
| POST | `/api/forum/:id/like` | User | Toggle like |
| POST | `/api/forum/:id/replies` | User | Add reply |
| DELETE | `/api/forum/:id/replies/:replyId` | Owner/Admin | Delete reply |

## Support tickets

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/support` | Public/User | Submit ticket; token is optional |
| GET | `/api/support/mine` | User | Current user's tickets |
| GET | `/api/support` | Admin | All tickets |
| GET | `/api/support/stats` | Admin | Ticket counts |
| PATCH | `/api/support/:id` | Admin | Update status, priority, and response |
| DELETE | `/api/support/:id` | Admin | Delete ticket |

## Escrow trades

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/trades/mine` | User | Trades where current user is buyer |
| GET | `/api/trades/for-seller` | User | Trades for current seller's listings |
| PATCH | `/api/trades/:id/respond` | Seller | Accept/decline and optionally upload proof |
| GET | `/api/trades` | Admin | All trades, optionally filtered by status |
| GET | `/api/trades/stats` | Admin | Trade totals by status |
| PATCH | `/api/trades/:id` | Admin | Verify, reject, or complete trade |

## Notifications

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/notifications` | User | Notification inbox |
| GET | `/api/notifications/unread-count` | User | Unread count |
| PATCH | `/api/notifications/:id/read` | User | Mark one notification read |
| PATCH | `/api/notifications/read-all` | User | Mark all read |
| GET | `/api/notifications/prefs` | User | Load notification settings |
| PATCH | `/api/notifications/prefs` | User | Save trade/support/order/promo/email preferences |

Email alerts and automatic promo notifications are currently preference-only; no email sender or promo campaign service is implemented.

## Vision AI and image-aware chat

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/vision/status` | User | Available providers and runtime readiness |
| POST | `/api/vision/analyze` | User | Analyze a base64 screenshot |
| POST | `/api/vision/chat` | User | Chat using the verified Vision result |

Analyze body:

```json
{
  "imageBase64": "<base64-without-data-url-prefix>",
  "mimeType": "image/png",
  "context": "optional hint",
  "provider": "groq"
}
```

Supported provider IDs: `groq`, `gemini`, and `ollama` when configured.

Special verification pipelines:

- **CS2:** first Vision guess → CS2 catalog candidates → second Vision verification → exact Steam market hash lookup.
- **Valorant inventory:** first multi-item guess → candidates grouped by weapon → second Vision verification → content tier and VP replacement estimate.
- Valorant values are replacement-cost estimates, not resale values.
- CS2 prices are returned only when Steam Community Market verifies the exact item.

## General AI chat

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/chat` | Public | General gaming assistant with platform database context |

Body:

```json
{
  "messages": [{ "sender": "user", "text": "What CS2 listings are available?" }],
  "contextGame": "CS2"
}
```

## Analytics

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/analytics/summary` | Public | Marketplace summary |
| GET | `/api/analytics/by-game` | Public | Listings grouped by game |
| GET | `/api/analytics/by-type` | Public | Listings grouped by type |
| GET | `/api/analytics/top-listings` | Public | Most viewed listings |
| GET | `/api/analytics/price-ranges` | Public | Price distribution |
| GET | `/api/analytics/recent-activity` | Public | Recent listing activity |
| POST | `/api/analytics/predict-price` | Public | Estimate price from listing attributes |

## Live catalog data

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/catalog/live-prices?ids=1091500,1245620` | Public | CheapShark prices plus Steam/SteamSpy statistics |

Maximum 50 Steam App IDs per request. Server cache TTL is 45 minutes.

## Admin

Every endpoint below requires the `admin` role.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/users` | List users |
| PATCH | `/api/admin/users/:id` | Change role or shop category |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/users/:id/content` | User's posts/listings/content summary |
| PUT | `/api/admin/forum/:id` | Moderate/edit forum post |
| DELETE | `/api/admin/forum/:id` | Remove forum post |
| PUT | `/api/admin/store/:id` | Moderate/edit listing |
| DELETE | `/api/admin/store/:id` | Remove listing |

## External APIs and CDNs

| Service | Used for | Authentication | Cache/fallback |
|---|---|---|---|
| Groq Cloud | Llama Vision and chat | `GROQ_API_KEY` | Provider selectable |
| Google Gemini | Vision and chat | `GEMINI_API_KEY` | Provider selectable |
| Ollama | Local Gemma Vision/chat | Local runtime | Optional |
| Steam Community Market | Verified CS2 prices | None | 30-minute memory cache |
| ByMykel CSGO-API | Valid CS2 skin catalog | None | 12-hour cache + M4A4 fallback |
| Valorant-API | Valorant weapons, skins, icons, tiers | None | 12-hour memory cache |
| CheapShark | Steam deals | None | 45-minute memory cache |
| Steam Web API | Current player counts | None for used endpoint | 45-minute memory cache |
| SteamSpy | Owners and playtime estimates | None | 45-minute memory cache |
| Steam CDN | Game cover art | None | Browser/CDN cache |
| Unsplash CDN | Remote editorial/product backgrounds | None | Image fallback component |
| Simple Icons / jsDelivr / Icon Horse | Remote brand logos | None | Image fallback component |

Runtime catalog URLs used directly by the backend:

```text
https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json
https://valorant-api.com/v1/weapons
https://valorant-api.com/v1/contenttiers
https://steamcommunity.com/market/priceoverview
https://www.cheapshark.com/api/1.0
https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/
https://steamspy.com/api.php
```

## Environment variables

Create `server/.env` from `server/.env.example`.

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No | Backend port; default `3001` |
| `JWT_SECRET` | Strongly recommended | JWT signing key |
| `GROQ_API_KEY` | One cloud/local provider required | Groq Vision/chat |
| `GEMINI_API_KEY` | One cloud/local provider required | Gemini Vision/chat |
| `VISION_PROVIDER` | No | `auto`, `ollama`, `gemini`, or `groq` |
| `GROQ_VISION_MODEL` | No | Override Groq model |
| `GEMINI_VISION_MODEL` | No | Override Gemini Vision model |
| `GEMINI_CHAT_MODEL` | No | Override Gemini chat model |
| `OLLAMA_ENABLED` | No | Enable local provider |
| `OLLAMA_BASE_URL` | No | Default `http://127.0.0.1:11434` |
| `OLLAMA_VISION_MODEL` | No | Local Vision model |
| `OLLAMA_CHAT_MODEL` | No | Local chat model |

Recommended additions to `server/.env`:

```env
JWT_SECRET=replace_with_a_long_random_secret
PORT=3001
```

## Common status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Invalid request or unavailable selected provider |
| `401` | Missing, invalid, or expired token |
| `403` | Role/ownership denied |
| `404` | Resource not found |
| `409` | Duplicate user/cart conflict |
| `429` | AI provider rate limit |
| `500` | Internal error |
| `503` | AI provider offline or misconfigured |
