// server/routes/analytics.js — Market analytics & data science endpoints
const express = require('express');
const db      = require('../db');

const router = express.Router();

// ── GET /api/analytics/summary ────────────────────────────────────────────────
// Public summary stats for the dashboard banner
router.get('/summary', (req, res) => {
  try {
    const listings   = db.prepare(`SELECT COUNT(*) AS total FROM store_listings WHERE status = 'available'`).get();
    const sellers    = db.prepare(`SELECT COUNT(DISTINCT user_id) AS total FROM store_listings`).get();
    const trades     = db.prepare(`SELECT COUNT(*) AS total FROM trade_requests WHERE status = 'completed'`).get();
    const avgPrice   = db.prepare(`SELECT ROUND(AVG(price),2) AS avg FROM store_listings WHERE status = 'available'`).get();

    res.json({
      activeListings:  listings.total,
      activeSellers:   sellers.total,
      completedTrades: trades.total,
      avgPrice:        avgPrice.avg ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/by-game ───────────────────────────────────────────────
// Listing count + avg price grouped by game
router.get('/by-game', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        game,
        COUNT(*)              AS listings,
        ROUND(AVG(price), 2)  AS avgPrice,
        ROUND(MIN(price), 2)  AS minPrice,
        ROUND(MAX(price), 2)  AS maxPrice,
        SUM(order_count)      AS totalSales,
        SUM(views)            AS totalViews
      FROM store_listings
      WHERE status = 'available'
      GROUP BY game
      ORDER BY listings DESC
      LIMIT 10
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/by-type ───────────────────────────────────────────────
// Listing count + avg price by type (skin/account/key etc)
router.get('/by-type', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        type,
        COUNT(*)              AS listings,
        ROUND(AVG(price), 2)  AS avgPrice,
        SUM(order_count)      AS totalSales
      FROM store_listings
      WHERE status = 'available'
      GROUP BY type
      ORDER BY listings DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/top-listings ─────────────────────────────────────────
// Top 8 most viewed listings (all statuses — views tracked live from store opens)
router.get('/top-listings', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        l.id, l.game, l.type, l.item, l.highlight, l.price, l.views, l.order_count,
        COALESCE(u.username, l.seller) AS seller,
        l.status, l.created_at
      FROM store_listings l
      LEFT JOIN users u ON u.id = l.user_id
      ORDER BY l.views DESC, l.order_count DESC, l.created_at DESC
      LIMIT 8
    `).all();
    res.json(rows.map(r => ({ ...r, price: parseFloat(r.price) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/price-ranges ─────────────────────────────────────────
// Price distribution buckets
router.get('/price-ranges', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        CASE
          WHEN price < 5    THEN 'Under $5'
          WHEN price < 20   THEN '$5 – $20'
          WHEN price < 50   THEN '$20 – $50'
          WHEN price < 100  THEN '$50 – $100'
          WHEN price < 500  THEN '$100 – $500'
          ELSE 'Over $500'
        END AS range,
        COUNT(*) AS count
      FROM store_listings
      WHERE status = 'available'
      GROUP BY range
      ORDER BY MIN(price)
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/analytics/recent-activity ──────────────────────────────────────
// Last 7 days: new listings count per day
router.get('/recent-activity', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT
        DATE(created_at) AS day,
        COUNT(*)         AS newListings
      FROM store_listings
      WHERE created_at >= DATE('now', '-7 days')
      GROUP BY day
      ORDER BY day ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/analytics/predict-price ────────────────────────────────────────
// Body: { game, type, item?, wear?, float?, rank?, level?, hoursPlayed?, skinsOwned? }
// Returns: { suggestedPrice, low, high, confidence, reasoning }
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key' });

router.post('/predict-price', async (req, res) => {
  const { game, type, item, wear, float: floatVal, rank, level, hoursPlayed, skinsOwned } = req.body;

  if (!game || !type) {
    return res.status(400).json({ error: 'game and type are required.' });
  }

  // Pull similar listings from DB for market context
  const similar = db.prepare(`
    SELECT price, item, wear, rank, level, hoursPlayed, skinsOwned, order_count
    FROM store_listings
    WHERE game = ? AND type = ? AND status = 'available'
    ORDER BY order_count DESC, created_at DESC
    LIMIT 8
  `).all(game, type);

  const marketStats = similar.length > 0 ? {
    count:    similar.length,
    avgPrice: (similar.reduce((s, r) => s + r.price, 0) / similar.length).toFixed(2),
    minPrice: Math.min(...similar.map(r => r.price)).toFixed(2),
    maxPrice: Math.max(...similar.map(r => r.price)).toFixed(2),
    samples:  similar.slice(0, 4).map(r =>
      `$${r.price}${r.item ? ' ('+r.item+')' : ''}${r.wear ? ' '+r.wear : ''}`
    ).join(', '),
  } : null;

  const itemDesc = [
    `Game: ${game}`,
    `Type: ${type}`,
    item        ? `Item/Skin: ${item}` : null,
    wear        ? `Wear: ${wear}` : null,
    floatVal    ? `Float: ${floatVal}` : null,
    rank        ? `Rank: ${rank}` : null,
    level       != null ? `Level: ${level}` : null,
    hoursPlayed != null ? `Hours played: ${hoursPlayed}` : null,
    skinsOwned  != null ? `Skins owned: ${skinsOwned}` : null,
  ].filter(Boolean).join('\n');

  const marketContext = marketStats
    ? `\nMarket data from our platform (${marketStats.count} similar listings):\n- Avg price: $${marketStats.avgPrice}\n- Range: $${marketStats.minPrice} – $${marketStats.maxPrice}\n- Recent: ${marketStats.samples}`
    : '\nNo similar listings on our platform yet — use general market knowledge.';

  const prompt = `You are a gaming marketplace pricing expert. Analyze the item details and suggest a fair market price.

Item details:
${itemDesc}
${marketContext}

Respond with ONLY a valid JSON object, no markdown:
{
  "suggestedPrice": <number, the recommended listing price in USD>,
  "low": <number, lower bound of fair price range>,
  "high": <number, upper bound of fair price range>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<2-3 sentences explaining the price suggestion, mentioning key factors>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    });

    const raw = completion.choices[0]?.message?.content ?? '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse AI response.' });

    const result = JSON.parse(jsonMatch[0]);
    return res.json({ ...result, marketStats });
  } catch (err) {
    console.error('[Price Predict Error]:', err);
    return res.status(500).json({ error: 'Price prediction failed. Please try again.' });
  }
});

module.exports = router;
