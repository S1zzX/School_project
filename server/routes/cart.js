// routes/cart.js — Cart CRUD (JWT protected)
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gameguide_super_secret_2024';

// ─── Middleware: require valid JWT ────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const items = db
    .prepare('SELECT * FROM cart_items WHERE user_id = ? ORDER BY added_at DESC')
    .all(req.user.id);
  return res.json(items);
});

// ─── POST /api/cart ───────────────────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { item_id, name, game, game_color, type, platform, price, original_price, image } = req.body;

  if (!item_id || !name || !game || !type || !platform || price == null || !image) {
    return res.status(400).json({ error: 'Missing required cart item fields.' });
  }

  try {
    const result = db
      .prepare(`
        INSERT INTO cart_items (user_id, item_id, name, game, game_color, type, platform, price, original_price, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        req.user.id,
        item_id,
        name,
        game,
        game_color || '#a78bfa',
        type,
        platform,
        price,
        original_price ?? null,
        image
      );

    const newItem = db
      .prepare('SELECT * FROM cart_items WHERE id = ?')
      .get(result.lastInsertRowid);

    return res.status(201).json(newItem);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Item already in cart.' });
    }
    throw err;
  }
});

// ─── DELETE /api/cart/:id ─────────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const result = db
    .prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Cart item not found.' });
  }
  return res.json({ success: true });
});

// ─── DELETE /api/cart (clear all) ────────────────────────────────────────────
router.delete('/', requireAuth, (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user.id);
  return res.json({ success: true });
});

module.exports = router;
