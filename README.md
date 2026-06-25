# GameGuide AI Assistant

A gaming marketplace web app with AI-powered features — buy/sell game keys, accounts and skins, analyze screenshots with Computer Vision, and get market price predictions.

## Features

- 🛒 **Store** — Browse and purchase game keys, accounts, skins
- 👁️ **Vision AI** — Upload a game screenshot; AI identifies the item, rank, or account details and lets you chat about it
- 📊 **Analytics** — Live market stats: listings by game, price distribution, top items
- 💬 **Community** — Forum with posts and likes
- 🎫 **Support** — Ticket system + skin trade requests with admin review
- 🏪 **Shop Dashboard** — Sellers manage listings and use Vision AI to auto-fill details
- 🔔 **Notifications** — Real-time alerts for trades and tickets

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| AI | Groq Cloud (llama-4-scout-17b) |

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/your-username/gameguide-ai-assistant.git
cd gameguide-ai-assistant
```

### 2. Install dependencies

```bash
npm install        # frontend
cd server && npm install && cd ..
```

### 3. Set up environment

Create `server/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get a free API key at [console.groq.com](https://console.groq.com).

### 4. Run

```bash
npm run dev
```

This starts both the frontend (`localhost:5173`) and backend (`localhost:3001`) together.

### Default Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gameguide.com` | `admin123` |
| Shop Owner | `shop@gameguide.com` | `shop123` |
| Gamer | `gamer@gameguide.com` | `gamer123` |

## Project Structure

```
├── src/               # React frontend
│   └── app/
│       ├── pages/     # Route pages
│       ├── components/# Shared components
│       └── lib/       # API client, i18n, context
├── server/            # Express backend
│   ├── routes/        # API endpoints
│   ├── middleware/    # Auth guard
│   └── db.js          # SQLite schema + seed data
└── package.json       # Root — runs both with npm run dev
```
