// index.js — Express server entry point (port 3001)
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

// Initialize DB (creates file + tables if not exist)
require('./db');

const authRoutes       = require('./routes/auth');
const cartRoutes       = require('./routes/cart');
const forumRoutes      = require('./routes/forum');
const adminRoutes      = require('./routes/admin');
const storeRoutes      = require('./routes/store');
const chatRoutes       = require('./routes/chat');
const supportRoutes    = require('./routes/support');
const shopOwnerRoutes  = require('./routes/shop-owner');
const tradesRoutes     = require('./routes/trades');
const notificationsRoutes = require('./routes/notifications');
const visionRoutes         = require('./routes/vision');
const analyticsRoutes      = require('./routes/analytics');
const catalogRoutes        = require('./routes/catalog');
const walletRoutes         = require('./routes/wallet');
const steamRoutes          = require('./routes/steam');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/forum',      forumRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/store',      storeRoutes);
app.use('/api/chat',       chatRoutes);
app.use('/api/support',    supportRoutes);
app.use('/api/shop-owner', shopOwnerRoutes);
app.use('/api/trades',     tradesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/vision',        visionRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/catalog',       catalogRoutes);
app.use('/api/wallet',        walletRoutes);
app.use('/api/steam',         steamRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  const { getAvailableProviders } = require('./lib/visionProviders');
  const visionProviders = getAvailableProviders().map((p) => p.shortLabel);
  console.log(`[server] GameGuide API running on http://localhost:${PORT}`);
  console.log(`[server] Vision AI: ${visionProviders.length ? visionProviders.join(' · ') : 'offline (add API keys to server/.env)'}`);
  console.log(`[server] Auth:  POST /api/auth/register | POST /api/auth/login | GET /api/auth/me`);
  console.log(`[server] Cart:  GET/POST /api/cart | DELETE /api/cart/:id`);
  console.log(`[server] Forum: GET/POST /api/forum | POST /api/forum/:id/like | DELETE /api/forum/:id`);
  console.log(`[server] Admin: GET/PATCH/DELETE /api/admin/users  [admin only]`);
});
