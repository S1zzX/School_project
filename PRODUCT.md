# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

GameGuide serves three confirmed user roles:

- Gamers browse and buy digital products, marketplace listings, game accounts, subscriptions, and software; use cart, checkout, purchase history, support, community, notifications, Vision AI, and screenshot-aware chat.
- Shop owners can use gamer features plus create and manage listings, inventory, stock, orders, characters, seller trade requests, and AI-assisted listing scans.
- Admins manage users, listings, forum content, tickets, trades, notifications, analytics, and moderation workflows.

Local demo and school-project evaluators are also an important operating audience because the repository includes seeded demo accounts, setup docs, and demo-only payment behavior.

## Product Purpose

GameGuide is a full-stack gaming marketplace and AI assistant. It lets users discover and buy game-related digital products, trade or sell community marketplace items, analyze gaming screenshots, discuss results with an image-aware assistant, and monitor marketplace activity.

Success means users can complete commerce and support workflows end to end while using AI analysis to improve listing quality, catalog verification, pricing context, and game-item understanding.

## Positioning

GameGuide combines digital storefront, player marketplace, community forum, support/escrow workflow, wallet top-up, seller tools, admin moderation, and multi-provider Vision AI in one gaming-focused web app.

Its distinguishing mechanism is catalog-grounded AI verification for gaming screenshots: CS2 recognition is checked against valid skin names before Steam Market pricing, and Valorant inventory analysis is checked against Valorant catalog candidates before replacement-cost estimates.

## Operating Context

The app runs as a Vite React frontend on port 5173 with an Express API on port 3001. Vite proxies `/api/*` to the backend. Data is stored in SQLite for local development and demonstrations.

Primary workflows include storefront browsing, cart checkout, wallet top-up, purchase history, marketplace listing creation, CS2 escrow trade requests, support tickets, forum posts and replies, Vision AI screenshot analysis, seller dashboard operations, analytics review, settings management, and admin moderation.

The UI supports English and Vietnamese, per-account light/dark/auto themes, accent color settings, profile/avatar management, notification preferences, and guest sessions that always start in light mode.

## Capabilities and Constraints

Confirmed capabilities include:

- Static product catalog for game keys, software, subscriptions, and gift cards.
- Community marketplace for game accounts, CS2 skins, Valorant accounts, and similar gaming listings.
- Cart, checkout, wallet payment, purchase history, and instant local product-key or credential delivery for non-escrow items.
- MoMo and MB Bank top-up demo flow with USD/VND conversion at `25,000 VND = 1 USD`.
- CS2 skin purchases that create escrow trade requests instead of instant delivery.
- Shop owner listing, stock, character, order, and Vision-assisted listing workflows.
- Community forum with posts, replies, likes, views, and moderation.
- Support tickets and admin responses.
- Analytics for market summary, charts, top listings, price ranges, predictions, and activity.
- JWT authentication, bcrypt password hashing, role guards, profile updates, and slim token refresh.
- In-app notifications and per-user notification preferences.
- Vision AI providers through Groq Cloud, Google Gemini, and local Ollama vision models.
- External data from Steam Community Market, CSGO-API, Valorant-API, CheapShark, Steam Web API, SteamSpy, and remote artwork CDNs.

Confirmed constraints and limitations:

- The current payment top-up flow is demo/manual credit and does not verify real MoMo or bank transfer webhooks.
- Demo credentials and seeded data are for local demonstrations only.
- `server/.env` and `server/database.sqlite` must stay out of source control.
- Vision analysis can consume multiple provider calls because catalog verification uses staged passes.
- Remote catalogs are cached in memory for 12 hours.
- External services can rate-limit or reject requests.
- Purchase history currently uses client-side helpers.
- Email notifications and promotional campaigns are not implemented.
- Social login buttons are visual placeholders.
- Production deployment requires stronger secrets, restricted CORS, HTTPS, persistent storage, backups, disabled demo seeding, and bundle splitting.

## Brand Commitments

The product name is GameGuide AI Assistant. Existing docs and UI copy position it as a gaming commerce and assistant product, with practical marketplace language, role-based operational screens, and AI analysis language that must avoid inventing prices or item facts not verified by catalogs or external market data.

Existing visual implementation and assets are incumbent design evidence, but visual-system documentation belongs in `DESIGN.md`, not this product record.

## Evidence on Hand

Repository evidence includes:

- `README.md`: product overview, feature list, Vision AI workflows, technology stack, setup, scripts, demo accounts, theme behavior, limitations, and production checklist.
- `API.md`: backend routes, authentication, wallet/top-up behavior, checkout, marketplace, shop owner, forum, support, trades, analytics, Vision AI, external integrations, cache behavior, and service constraints.
- `ACCOUNTS.md`: confirmed demo users, roles, credentials, shop categories, and permissions.
- `PROJECT_STRUCTURE.md`: route map, app folders, backend modules, data flow, user roles, and development commands.
- `src/app/routes.ts`: current web routes including home, store, cart, product detail, purchase history, support, shop owner, Vision AI, analytics, admin, settings, and top-up.
- `src/styles/theme.css`: incumbent theme tokens for light and dark modes.
- `src/assets/`: local product, subscription, icon, and payment QR assets.

No real customer testimonials, production payment verification, production deployment claims, press, licensing details, or production reliability guarantees are confirmed in the repository.

## Product Principles

1. Keep commerce workflows explicit: users should understand whether an item is instant delivery, wallet checkout, or escrow trade.
2. Ground AI output in catalogs and verified data: do not fabricate CS2 prices, Valorant values, wear, float, or market facts when source evidence is absent.
3. Preserve role clarity: gamer, shop owner, and admin capabilities should stay separated and predictable.
4. Treat demo behavior honestly: demo payments, seeded users, and local credentials must not appear as production guarantees.
5. Support bilingual and theme-aware use without breaking common marketplace and support tasks.

## Accessibility & Inclusion

The product currently supports English and Vietnamese UI, per-account light/dark/auto theme settings, accent color selection, and guest light-mode defaults. No formal accessibility standard is confirmed in the repository.
