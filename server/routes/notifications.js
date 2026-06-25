// routes/notifications.js — User notification inbox + preferences
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getPrefs, updatePrefs } = require('../lib/notifications');

const router = express.Router();

// GET /api/notifications — list current user's notifications
router.get('/', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT id, category, title, body, link, read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  return res.json(rows.map(r => ({ ...r, read: !!r.read })));
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read = 0
  `).get(req.user.id);
  return res.json({ count: row.count });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, (req, res) => {
  db.prepare(`UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0`).run(req.user.id);
  return res.json({ success: true });
});

// GET /api/notifications/prefs
router.get('/prefs', requireAuth, (req, res) => {
  return res.json(getPrefs(req.user.id));
});

// PATCH /api/notifications/prefs
router.patch('/prefs', requireAuth, (req, res) => {
  const allowed = ['notify_trades', 'notify_support', 'notify_orders', 'notify_promos', 'notify_email'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = !!req.body[key];
  }
  const prefs = updatePrefs(req.user.id, updates);
  return res.json(prefs);
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, (req, res) => {
  const result = db.prepare(`
    UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Notification not found.' });
  return res.json({ success: true });
});

module.exports = router;
