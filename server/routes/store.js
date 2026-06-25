const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const notifications = require('../lib/notifications');

const router = express.Router();

// Legacy middleware kept for the existing POST / route
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/store
router.get('/', (req, res) => {
  const listings = db.prepare(`SELECT * FROM store_listings ORDER BY id DESC`).all();
  // Map rows back to the frontend's expected format
  const mapped = listings.map(l => ({
    ...l,
    price: parseFloat(l.price)
  }));
  res.json(mapped);
});

// POST /api/store
router.post('/', authMiddleware, (req, res) => {
  const { type, game, item, category, wear, float, rank, hoursPlayed, skinsOwned, highlight, price, image } = req.body;
  
  const stmt = db.prepare(`
    INSERT INTO store_listings (
      user_id, type, game, item, category, wear, float, rank, hoursPlayed, skinsOwned, highlight, price, seller, sellerRating, image, views
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    req.user.id,
    type,
    game,
    item || null,
    category || null,
    wear || null,
    float || null,
    rank || null,
    hoursPlayed || 0,
    skinsOwned || 0,
    highlight || null,
    price || 0,
    req.user.username,
    5.0, // Default seller rating
    image || null,
    0    // Default views
  );

  const newListing = db.prepare('SELECT * FROM store_listings WHERE id = ?').get(info.lastInsertRowid);
  res.json(newListing);
});

// POST /api/store/purchase — Decrement stock & increment order_count for store listings.
// Items with type 'Skin' or 'CS2 Skin' / 'Valorant Skin' create a trade_request instead.
router.post('/purchase', requireAuth, (req, res) => {
  const { items } = req.body; // [{ listing_id, name, game, category, price, type }]
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items provided.' });
  }

  const buyer = req.user;
  const results = [];

  const purchaseTx = db.transaction(() => {
    for (const item of items) {
      const lid = parseInt(item.listing_id, 10);
      if (!lid || isNaN(lid)) continue; // Skip static products (rk-*, hd-*)

      const listing = db.prepare('SELECT * FROM store_listings WHERE id = ?').get(lid);
      if (!listing) { results.push({ listing_id: lid, result: 'not_found' }); continue; }
      if (listing.status === 'sold') { results.push({ listing_id: lid, result: 'already_sold' }); continue; }

      const isSkin = (listing.type || '').toLowerCase().includes('skin');

      if (isSkin) {
        // Create trade request — admin must approve before delivery
        const tradeResult = db.prepare(`
          INSERT INTO trade_requests
            (listing_id, buyer_id, buyer_username, seller_id, seller_username, item_name, game, category, price)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          lid,
          buyer.id,
          buyer.username,
          listing.user_id,
          listing.seller,
          listing.item || listing.highlight || 'Skin',
          listing.game,
          listing.category || listing.type,
          listing.price
        );
        const itemLabel = listing.item || listing.highlight || 'Skin';
        notifications.createNotification(listing.user_id, {
          category: 'trades',
          title: 'New skin trade request',
          body: `${buyer.username} wants to buy ${itemLabel}. Accept or decline in Support → My Trades.`,
          link: '/support?tab=trades',
        });
        notifications.notifyAdmins({
          category: 'trades',
          title: 'New escrow trade',
          body: `${buyer.username} requested ${itemLabel} — awaiting seller response.`,
          link: '/admin?tab=trades',
        });
        results.push({ listing_id: lid, result: 'trade_pending', item_name: itemLabel, trade_id: tradeResult.lastInsertRowid });
      } else {
        // Instant purchase — decrement stock, increment order_count
        const newStock = Math.max(0, (listing.stock ?? 1) - 1);
        const newStatus = newStock === 0 ? 'sold' : listing.status;
        db.prepare(`
          UPDATE store_listings
          SET stock = ?, order_count = order_count + 1, status = ?
          WHERE id = ?
        `).run(newStock, newStatus, lid);
        const itemLabel = listing.item || listing.highlight || 'Item';
        notifications.createNotification(buyer.id, {
          category: 'orders',
          title: 'Purchase confirmed',
          body: `Your order for ${itemLabel} was successful.`,
          link: '/purchase-history',
        });
        results.push({ listing_id: lid, result: 'purchased' });
      }
    }
  });

  purchaseTx();
  return res.json({ results });
});

module.exports = router;
