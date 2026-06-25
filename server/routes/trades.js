// routes/trades.js — Skin trade escrow system
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const notifications = require('../lib/notifications');

const router = express.Router();

// GET /api/trades/for-seller — shop owner sees incoming trades on their listings
router.get('/for-seller', requireAuth, (req, res) => {
  if (req.user.role !== 'shop_owner' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Shop owner access required.' });
  }
  const trades = db.prepare(`
    SELECT t.*, sl.image, sl.wear, sl.float
    FROM trade_requests t
    LEFT JOIN store_listings sl ON sl.id = t.listing_id
    WHERE t.seller_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);
  res.json(trades);
});

// PATCH /api/trades/:id/respond — seller accepts/declines + uploads proof image
router.patch('/:id/respond', requireAuth, (req, res) => {
  const { seller_status, seller_note, proof_image } = req.body;
  if (!['accepted', 'declined'].includes(seller_status)) {
    return res.status(400).json({ error: 'seller_status must be accepted or declined.' });
  }

  const trade = db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Trade not found.' });

  // Only the listing seller or an admin may respond
  if (trade.seller_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your trade to respond to.' });
  }

  const newStatus = seller_status === 'accepted' ? 'seller_accepted' : 'seller_declined';

  db.prepare(`
    UPDATE trade_requests
    SET seller_status = ?, seller_note = ?, proof_image = ?,
        seller_responded_at = datetime('now'),
        status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(seller_status, seller_note ?? null, proof_image ?? null, newStatus, req.params.id);

  if (seller_status === 'accepted') {
    notifications.createNotification(trade.buyer_id, {
      category: 'trades',
      title: 'Seller accepted your trade',
      body: `${trade.seller_username || 'The seller'} accepted ${trade.item_name}. Admin review is next.`,
      link: '/support?tab=trades',
    });
    notifications.notifyAdmins({
      category: 'trades',
      title: 'Trade proof uploaded',
      body: `Seller submitted proof for ${trade.item_name}. Review in Skin Trades.`,
      link: '/admin?tab=trades',
    });
  } else {
    notifications.createNotification(trade.buyer_id, {
      category: 'trades',
      title: 'Seller declined your trade',
      body: `Your request for ${trade.item_name} was declined by the seller.`,
      link: '/support?tab=trades',
    });
  }

  const updated = db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// GET /api/trades/mine — buyer sees their own trade requests
router.get('/mine', requireAuth, (req, res) => {
  const trades = db.prepare(`
    SELECT t.*, sl.image, sl.wear, sl.float
    FROM trade_requests t
    LEFT JOIN store_listings sl ON sl.id = t.listing_id
    WHERE t.buyer_id = ?
    ORDER BY t.created_at DESC
  `).all(req.user.id);
  res.json(trades);
});

// GET /api/trades — admin sees all trade requests
router.get('/', requireAuth, requireRole('admin'), (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT t.*, sl.image, sl.wear, sl.float
    FROM trade_requests t
    LEFT JOIN store_listings sl ON sl.id = t.listing_id
  `;
  const params = [];
  if (status) { query += ` WHERE t.status = ?`; params.push(status); }
  query += ` ORDER BY t.created_at DESC`;
  const trades = db.prepare(query).all(...params);
  res.json(trades);
});

// GET /api/trades/stats — admin stats
router.get('/stats', requireAuth, requireRole('admin'), (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'verified'  THEN 1 ELSE 0 END) AS verified,
      SUM(CASE WHEN status = 'rejected'  THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
    FROM trade_requests
  `).get();
  res.json(stats);
});

// PATCH /api/trades/:id — admin approves / rejects / completes a trade
router.patch('/:id', requireAuth, requireRole('admin'), (req, res) => {
  const { status, admin_note } = req.body;
  const allowed = ['pending', 'verified', 'rejected', 'completed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  const trade = db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(req.params.id);
  if (!trade) return res.status(404).json({ error: 'Trade request not found.' });

  db.prepare(`
    UPDATE trade_requests
    SET status = ?, admin_id = ?, admin_note = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(status, req.user.id, admin_note ?? null, req.params.id);

  // If admin marks as completed, decrement stock and increment order_count on the listing
  if (status === 'completed' && trade.listing_id) {
    const listing = db.prepare('SELECT stock FROM store_listings WHERE id = ?').get(trade.listing_id);
    if (listing) {
      const newStock = Math.max(0, (listing.stock ?? 1) - 1);
      db.prepare(`
        UPDATE store_listings
        SET stock = ?, order_count = order_count + 1, status = ?
        WHERE id = ?
      `).run(newStock, newStock === 0 ? 'sold' : 'available', trade.listing_id);
    }
  }

  const buyerMessages = {
    verified: {
      title: 'Trade verified by admin',
      body: `Your trade for ${trade.item_name} was verified. It is safe to proceed.`,
    },
    rejected: {
      title: 'Trade rejected',
      body: `Your trade for ${trade.item_name} was rejected by an admin.`,
    },
    completed: {
      title: 'Trade completed',
      body: `Your purchase of ${trade.item_name} is complete.`,
    },
  };
  if (buyerMessages[status]) {
    notifications.createNotification(trade.buyer_id, {
      category: 'trades',
      ...buyerMessages[status],
      link: '/support?tab=trades',
    });
  }
  if (trade.seller_id && (status === 'verified' || status === 'rejected' || status === 'completed')) {
    notifications.createNotification(trade.seller_id, {
      category: 'trades',
      title: `Trade ${status}`,
      body: `Admin marked the ${trade.item_name} trade as ${status}.`,
      link: '/support?tab=trades',
    });
  }

  const updated = db.prepare('SELECT * FROM trade_requests WHERE id = ?').get(req.params.id);
  res.json(updated);
});

module.exports = router;
