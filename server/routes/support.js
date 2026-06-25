// routes/support.js — Customer support ticket system
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const notifications = require('../lib/notifications');

const router = express.Router();

const VALID_CATEGORIES = ['general', 'billing', 'account', 'technical', 'store', 'other'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_STATUSES   = ['open', 'in_progress', 'resolved', 'closed'];

// ─── POST /api/support — Create a ticket (any user, even guests) ──────────────
router.post('/', (req, res) => {
  const { subject, message, category = 'general', priority = 'normal', email, username } = req.body;

  if (!subject || !message || !email || !username) {
    return res.status(400).json({ error: 'subject, message, email and username are required.' });
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(', ')}.` });
  }

  // Try to resolve user_id from JWT if provided
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'devsecret');
      userId = payload.id;
    } catch { /* guest ticket */ }
  }

  const result = db.prepare(`
    INSERT INTO support_tickets (user_id, username, email, subject, message, category, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, username.trim(), email.trim(), subject.trim(), message.trim(), category, priority);

  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(result.lastInsertRowid);

  notifications.notifyAdmins({
    category: 'support',
    title: 'New support ticket',
    body: `${username.trim()}: ${subject.trim()}`,
    link: '/admin?tab=tickets',
  });

  return res.status(201).json(ticket);
});

// ─── GET /api/support/mine — Get current user's tickets ──────────────────────
router.get('/mine', requireAuth, (req, res) => {
  const tickets = db.prepare(`
    SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  return res.json(tickets);
});

// ─── GET /api/support — Admin: get all tickets ───────────────────────────────
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  const { status, priority, category } = req.query;
  let query = `SELECT t.*, u.username as admin_username 
               FROM support_tickets t 
               LEFT JOIN users u ON t.admin_id = u.id`;
  const conditions = [];
  const params = [];

  if (status) { conditions.push(`t.status = ?`); params.push(status); }
  if (priority) { conditions.push(`t.priority = ?`); params.push(priority); }
  if (category) { conditions.push(`t.category = ?`); params.push(category); }

  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY t.created_at DESC`;

  const tickets = db.prepare(query).all(...params);
  return res.json(tickets);
});

// ─── GET /api/support/stats — Admin: ticket statistics ───────────────────────
router.get('/stats', requireAuth, requireRole('admin'), (req, res) => {
  const total     = db.prepare(`SELECT COUNT(*) as count FROM support_tickets`).get().count;
  const open      = db.prepare(`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'`).get().count;
  const inProg    = db.prepare(`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'in_progress'`).get().count;
  const resolved  = db.prepare(`SELECT COUNT(*) as count FROM support_tickets WHERE status = 'resolved'`).get().count;
  const urgent    = db.prepare(`SELECT COUNT(*) as count FROM support_tickets WHERE priority = 'urgent' AND status NOT IN ('resolved','closed')`).get().count;

  return res.json({ total, open, in_progress: inProg, resolved, urgent });
});

// ─── PATCH /api/support/:id — Admin: update ticket status/response ────────────
router.patch('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const ticketId = Number(req.params.id);
  const { status, admin_response, priority } = req.body;

  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const newStatus   = status        ?? ticket.status;
  const newPriority = priority      ?? ticket.priority;
  const newResponse = admin_response !== undefined ? admin_response : ticket.admin_response;

  if (!VALID_STATUSES.includes(newStatus)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}.` });
  }

  db.prepare(`
    UPDATE support_tickets 
    SET status = ?, admin_response = ?, priority = ?, admin_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newStatus, newResponse, newPriority, req.user.id, ticketId);

  if (admin_response !== undefined && admin_response && ticket.user_id) {
    notifications.createNotification(ticket.user_id, {
      category: 'support',
      title: 'Support replied to your ticket',
      body: ticket.subject,
      link: '/support?tab=tickets',
    });
  }

  const updated = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId);
  return res.json(updated);
});

// ─── DELETE /api/support/:id — Admin: delete a ticket ────────────────────────
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const result = db.prepare('DELETE FROM support_tickets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ticket not found.' });
  return res.json({ success: true });
});

module.exports = router;
