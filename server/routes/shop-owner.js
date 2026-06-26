// routes/shop-owner.js — Shop owner specific services (character management + account selling)
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require auth + shop_owner or admin role
router.use(requireAuth);

// ─── GET /api/shop-owner/characters — Get own characters ──────────────────────
router.get('/characters', (req, res) => {
  const user = req.user;
  if (user.role !== 'shop_owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Shop owner access required.' });
  }

  const characters = db.prepare(
    'SELECT * FROM characters WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id);

  return res.json(characters);
});

// ─── POST /api/shop-owner/characters — Add a character ────────────────────────
router.post('/characters', (req, res) => {
  const user = req.user;
  if (user.role !== 'shop_owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Shop owner access required.' });
  }

  const { game, character_name, level, rank, role, items_count, skins_count, description, image, is_for_sale, sale_price } = req.body;

  if (!game || !character_name) {
    return res.status(400).json({ error: 'game and character_name are required.' });
  }

  const result = db.prepare(`
    INSERT INTO characters (user_id, game, character_name, level, rank, role, items_count, skins_count, description, image, is_for_sale, sale_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id, game, character_name.trim(), level || 1, rank || null, role || null,
    items_count || 0, skins_count || 0, description || null,
    image || null, is_for_sale ? 1 : 0, sale_price || null
  );

  const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(character);
});

// ─── PATCH /api/shop-owner/characters/:id — Update a character ───────────────
router.patch('/characters/:id', (req, res) => {
  const user = req.user;
  if (user.role !== 'shop_owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Shop owner access required.' });
  }

  const charId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
  if (!existing) return res.status(404).json({ error: 'Character not found.' });
  if (existing.user_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your character.' });
  }

  const { game, character_name, level, rank, role, items_count, skins_count, description, image, is_for_sale, sale_price } = req.body;

  db.prepare(`
    UPDATE characters SET
      game = ?, character_name = ?, level = ?, rank = ?, role = ?,
      items_count = ?, skins_count = ?, description = ?, image = ?,
      is_for_sale = ?, sale_price = ?
    WHERE id = ?
  `).run(
    game ?? existing.game,
    character_name ?? existing.character_name,
    level ?? existing.level,
    rank ?? existing.rank,
    role ?? existing.role,
    items_count ?? existing.items_count,
    skins_count ?? existing.skins_count,
    description ?? existing.description,
    image ?? existing.image,
    is_for_sale !== undefined ? (is_for_sale ? 1 : 0) : existing.is_for_sale,
    sale_price ?? existing.sale_price,
    charId
  );

  const updated = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
  return res.json(updated);
});

// ─── DELETE /api/shop-owner/characters/:id — Delete a character ───────────────
router.delete('/characters/:id', (req, res) => {
  const user = req.user;
  const charId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM characters WHERE id = ?').get(charId);
  if (!existing) return res.status(404).json({ error: 'Character not found.' });
  if (existing.user_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your character.' });
  }

  db.prepare('DELETE FROM characters WHERE id = ?').run(charId);
  return res.json({ success: true });
});

// ─── GET /api/shop-owner/stats — Get shop owner's sales statistics ─────────────
router.get('/stats', (req, res) => {
  const user = req.user;
  if (user.role !== 'shop_owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Shop owner access required.' });
  }

  const totalListings    = db.prepare(`SELECT COUNT(*) as count FROM store_listings WHERE user_id = ?`).get(user.id).count;
  const activeListings   = db.prepare(`SELECT COUNT(*) as count FROM store_listings WHERE user_id = ? AND status = 'available'`).get(user.id).count;
  const soldListings     = db.prepare(`SELECT COUNT(*) as count FROM store_listings WHERE user_id = ? AND status = 'sold'`).get(user.id).count;
  const totalOrders      = db.prepare(`SELECT COALESCE(SUM(order_count), 0) as total FROM store_listings WHERE user_id = ?`).get(user.id).total;
  const totalCharacters  = db.prepare(`SELECT COUNT(*) as count FROM characters WHERE user_id = ?`).get(user.id).count;
  const forSaleChars     = db.prepare(`SELECT COUNT(*) as count FROM characters WHERE user_id = ? AND is_for_sale = 1`).get(user.id).count;
  const revenue          = db.prepare(`
    SELECT COALESCE(SUM(price * order_count), 0) as total 
    FROM store_listings WHERE user_id = ?
  `).get(user.id).total;

  return res.json({
    totalListings, activeListings, soldListings, totalOrders,
    totalCharacters, forSaleChars, estimatedRevenue: revenue
  });
});

// ─── GET /api/shop-owner/listings — Get own store listings ─────────────────────
router.get('/listings', (req, res) => {
  const user = req.user;
  if (user.role !== 'shop_owner' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Shop owner access required.' });
  }

  const listings = db.prepare(
    'SELECT * FROM store_listings WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id);

  return res.json(listings);
});

// ─── PATCH /api/shop-owner/listings/:id — Update own listing ─────────────────
router.patch('/listings/:id', (req, res) => {
  const user = req.user;
  const listingId = Number(req.params.id);
  const listing = db.prepare('SELECT * FROM store_listings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.user_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your listing.' });
  }

  const { price, stock, status, highlight, description, rank, hoursPlayed, skinsOwned, championsOwned, level, image } = req.body;

  db.prepare(`
    UPDATE store_listings SET
      price = ?, stock = ?, status = ?, highlight = ?, description = ?,
      rank = ?, hoursPlayed = ?, skinsOwned = ?, championsOwned = ?, level = ?, image = ?
    WHERE id = ?
  `).run(
    price ?? listing.price,
    stock ?? listing.stock,
    status ?? listing.status,
    highlight ?? listing.highlight,
    description ?? listing.description,
    rank ?? listing.rank,
    hoursPlayed ?? listing.hoursPlayed,
    skinsOwned ?? listing.skinsOwned,
    championsOwned ?? listing.championsOwned,
    level ?? listing.level,
    image ?? listing.image,
    listingId
  );

  const updated = db.prepare('SELECT * FROM store_listings WHERE id = ?').get(listingId);
  return res.json(updated);
});

// ─── DELETE /api/shop-owner/listings/:id — Remove own listing (incl. sold) ─
router.delete('/listings/:id', (req, res) => {
  const user = req.user;
  const listingId = Number(req.params.id);
  const listing = db.prepare('SELECT * FROM store_listings WHERE id = ?').get(listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.user_id !== user.id && user.role !== 'admin') {
    return res.status(403).json({ error: 'Not your listing.' });
  }

  db.prepare('DELETE FROM store_listings WHERE id = ?').run(listingId);
  return res.json({ ok: true });
});

module.exports = router;
