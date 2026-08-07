const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const notifications = require('../lib/notifications');
const { lookupSkinVisual, weaponFromName } = require('../lib/cs2Catalog');

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

function parseJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeJsonArray(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Comma-separated names → [{ name }]
      return JSON.stringify(
        trimmed.split(',').map(s => s.trim()).filter(Boolean).map(name => ({ name }))
      );
    }
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  return null;
}

function mapListing(row) {
  return {
    ...row,
    seller: row.seller_username || row.seller,
    price: parseFloat(row.price),
    float: row.float ?? null,
    pattern: row.pattern ?? null,
    stattrak: Boolean(row.stattrak),
    nametag: row.nametag || null,
    stickers: parseJsonArray(row.stickers),
    charms: parseJsonArray(row.charms),
    gloves_item: row.gloves_item || null,
    gloves_float: row.gloves_float || null,
    gloves_pattern: row.gloves_pattern || null,
  };
}

// GET /api/store
router.get('/', (req, res) => {
  const listings = db.prepare(`
    SELECT l.*, u.role AS seller_role, u.username AS seller_username
    FROM store_listings l
    LEFT JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC
  `).all();
  res.json(listings.map(mapListing));
});

// GET /api/store/:id/inspect — listing-accurate Test Mode payload (+ Steam catalogue image)
router.get('/:id/inspect', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid listing id.' });
  }

  const row = db.prepare(`
    SELECT l.*, u.role AS seller_role, u.username AS seller_username
    FROM store_listings l
    LEFT JOIN users u ON u.id = l.user_id
    WHERE l.id = ?
  `).get(id);

  if (!row) return res.status(404).json({ error: 'Listing not found.' });

  const listing = mapListing(row);
  const isSkin = (listing.type || '').toLowerCase().includes('skin');
  if (!isSkin || !listing.float) {
    return res.status(400).json({ error: 'This listing cannot be inspected in Test Mode.' });
  }

  let catalogue = null;
  try {
    catalogue = await lookupSkinVisual(listing.item);
  } catch (err) {
    console.warn('[store/inspect] catalogue lookup failed:', err.message);
  }

  const weapon = catalogue?.weapon || weaponFromName(listing.item || '');
  const inspectImage = catalogue?.image || listing.image || null;

  return res.json({
    listing,
    inspect: {
      mode: 'test',
      weapon,
      skin: listing.item,
      float: listing.float,
      pattern: listing.pattern || '0',
      wear: listing.wear || null,
      stattrak: listing.stattrak,
      nametag: listing.nametag,
      stickers: listing.stickers,
      charms: listing.charms,
      gloves: listing.gloves_item
        ? {
            item: listing.gloves_item,
            float: listing.gloves_float || '0.0000',
            pattern: listing.gloves_pattern || '1',
          }
        : null,
      image: inspectImage,
      catalogueImage: catalogue?.image || null,
      rarity: catalogue?.rarity || null,
      paint_index: catalogue?.paint_index ?? null,
      readonly: { float: true, pattern: true, weapon: true, skin: true },
    },
  });
});

// POST /api/store/:id/view — increment listing view count (real-time analytics)
router.post('/:id/view', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid listing id.' });
  }
  const existing = db.prepare('SELECT id FROM store_listings WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Listing not found.' });

  db.prepare('UPDATE store_listings SET views = COALESCE(views, 0) + 1 WHERE id = ?').run(id);
  const row = db.prepare('SELECT views FROM store_listings WHERE id = ?').get(id);
  return res.json({ id, views: row.views });
});

// POST /api/store
router.post('/', authMiddleware, (req, res) => {
  const {
    type, game, item, category, wear, float, rank, hoursPlayed, skinsOwned, highlight, price, image,
    pattern, stattrak, nametag, stickers, charms, gloves_item, gloves_float, gloves_pattern,
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO store_listings (
      user_id, type, game, item, category, wear, float, pattern, stattrak, nametag,
      stickers, charms, gloves_item, gloves_float, gloves_pattern,
      rank, hoursPlayed, skinsOwned, highlight, price, seller, sellerRating, image, views
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    req.user.id,
    type,
    game,
    item || null,
    category || null,
    wear || null,
    float || null,
    pattern != null && String(pattern).trim() !== '' ? String(pattern).trim() : null,
    stattrak ? 1 : 0,
    nametag || null,
    serializeJsonArray(stickers),
    serializeJsonArray(charms),
    gloves_item || null,
    gloves_float || null,
    gloves_pattern || null,
    rank || null,
    hoursPlayed || 0,
    skinsOwned || 0,
    highlight || null,
    price || 0,
    req.user.username,
    5.0,
    image || null,
    0
  );

  const newListing = db.prepare('SELECT * FROM store_listings WHERE id = ?').get(info.lastInsertRowid);
  res.json(mapListing(newListing));
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
