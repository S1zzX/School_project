// routes/admin.js — Admin-only CRUD for user management
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require a valid token + admin role
router.use(requireAuth, requireRole('admin'));

const VALID_ROLES     = ['gamer', 'shop_owner', 'admin'];
const SHOP_CATEGORIES = ['FPS Skins', 'RPG Items', 'Strategy Gear', 'MOBA Cosmetics', 'Battle Royale Loot'];

// ─── GET /api/admin/users ────────────────────────────────────────────────────
// List all users (id, username, email, role, shop_category, created_at)
router.get('/users', (req, res) => {
  const users = db.prepare(
    'SELECT id, username, email, role, shop_category, created_at FROM users ORDER BY id ASC'
  ).all();
  return res.json(users);
});

// ─── PATCH /api/admin/users/:id ──────────────────────────────────────────────
// Update a user's role and/or shop_category
router.patch('/users/:id', (req, res) => {
  const userId = Number(req.params.id);
  const { role, shop_category } = req.body;

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) return res.status(404).json({ error: 'User not found.' });

  const newRole     = role          ?? row.role;
  const newCategory = shop_category ?? row.shop_category;

  if (!VALID_ROLES.includes(newRole)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}.` });
  }
  if (newRole === 'shop_owner' && (!newCategory || !SHOP_CATEGORIES.includes(newCategory))) {
    return res.status(400).json({ error: `shop_category required for shop_owner. Options: ${SHOP_CATEGORIES.join(', ')}.` });
  }

  db.prepare('UPDATE users SET role = ?, shop_category = ? WHERE id = ?')
    .run(newRole, newRole === 'shop_owner' ? newCategory : null, userId);

  const updated = db.prepare('SELECT id, username, email, role, shop_category, created_at FROM users WHERE id = ?').get(userId);
  return res.json(updated);
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────────────────────
// Delete a user (cascades cart + forum posts via FK)
router.delete('/users/:id', (req, res) => {
  const userId = Number(req.params.id);

  // Prevent admin from deleting themselves
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  const row = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!row) return res.status(404).json({ error: 'User not found.' });

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return res.json({ message: 'User deleted.' });
});
// ─── GET /api/admin/users/:id/content ────────────────────────────────────────
// Get all store listings and forum posts for a user
router.get('/users/:id/content', (req, res) => {
  const userId = Number(req.params.id);
  
  const storeListings = db.prepare('SELECT * FROM store_listings WHERE user_id = ? ORDER BY id DESC').all(userId);
  const forumPosts = db.prepare('SELECT * FROM forum_posts WHERE user_id = ? ORDER BY id DESC').all(userId);
  
  return res.json({ storeListings, forumPosts });
});

// ─── FORUM MODERATION ────────────────────────────────────────────────────────

router.delete('/forum/:id', (req, res) => {
  const result = db.prepare('DELETE FROM forum_posts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Post not found.' });
  return res.json({ success: true });
});

router.put('/forum/:id', (req, res) => {
  const { game, category, title, body, image } = req.body;
  if (!game || !category || !title || !body) return res.status(400).json({ error: 'Missing fields' });
  
  db.prepare(`
    UPDATE forum_posts SET game = ?, category = ?, title = ?, body = ?, image = ? WHERE id = ?
  `).run(game, category, title.trim(), body.trim(), image || null, req.params.id);
  
  return res.json({ success: true });
});

// ─── STORE MODERATION ────────────────────────────────────────────────────────

router.delete('/store/:id', (req, res) => {
  const result = db.prepare('DELETE FROM store_listings WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Listing not found.' });
  return res.json({ success: true });
});

router.put('/store/:id', (req, res) => {
  const { type, game, item, category, wear, float, rank, highlight, price, image } = req.body;
  
  db.prepare(`
    UPDATE store_listings 
    SET type = ?, game = ?, item = ?, category = ?, wear = ?, float = ?, rank = ?, highlight = ?, price = ?, image = ?
    WHERE id = ?
  `).run(
    type, game, item || null, category || null, wear || null, float || null, rank || null, highlight || null, price, image || null, req.params.id
  );
  
  return res.json({ success: true });
});

module.exports = router;
