// routes/catalog.js — Live catalog pricing + Steam stats
const express = require('express');

const router = express.Router();
const CHEAPSHARK = 'https://www.cheapshark.com/api/1.0';
const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
const FETCH_TIMEOUT_MS = 12_000;

/** @type {Map<string, { data: object, expiresAt: number }>} */
const cache = new Map();

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GameGuide/1.0' },
    });
  } finally {
    clearTimeout(timer);
  }
}

function getCached(key) {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

function unixToIso(sec) {
  const n = parseInt(sec, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

async function fetchDealForSteamApp(steamAppId) {
  const cacheKey = `deal:${steamAppId}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const url = `${CHEAPSHARK}/deals?steamAppID=${steamAppId}&sortBy=Savings&pageSize=3`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const deals = await res.json();
    if (!Array.isArray(deals) || deals.length === 0) return null;

    const deal = deals[0];
    const salePrice = parseFloat(deal.salePrice);
    const normalPrice = parseFloat(deal.normalPrice);
    if (!Number.isFinite(salePrice) || salePrice <= 0) return null;

    const data = {
      salePrice: Math.round(salePrice * 100) / 100,
      normalPrice: Number.isFinite(normalPrice) ? Math.round(normalPrice * 100) / 100 : salePrice,
      discount: Math.round(parseFloat(deal.savings) || 0),
      storeId: deal.storeID,
      title: deal.title,
      isOnSale: deal.isOnSale === '1' || deal.isOnSale === 1,
      salePriceChangedAt: unixToIso(deal.lastChange),
      saleEndsAt: null,
    };

    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[catalog] CheapShark fetch failed for ${steamAppId}:`, err.message);
    return null;
  }
}

async function fetchCurrentPlayers(steamAppId) {
  const cacheKey = `players:${steamAppId}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const url = `https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${steamAppId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const json = await res.json();
    const count = json?.response?.result === 1 ? json.response.player_count : null;
    if (count == null) return null;

    const data = { currentPlayers: count };
    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[catalog] Steam players fetch failed for ${steamAppId}:`, err.message);
    return null;
  }
}

async function fetchSteamSpy(steamAppId) {
  const cacheKey = `spy:${steamAppId}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const url = `https://steamspy.com/api.php?request=appdetails&appid=${steamAppId}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (!json || json.appid == null) return null;

    const data = {
      ownersEstimate: json.owners || null,
      medianPlaytimeHours: json.median_forever > 0 ? Math.round(json.median_forever / 60) : null,
      steamSpyCcu: json.ccu > 0 ? json.ccu : null,
    };

    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[catalog] SteamSpy fetch failed for ${steamAppId}:`, err.message);
    return null;
  }
}

async function fetchSteamStoreSale(steamAppId) {
  const cacheKey = `store:${steamAppId}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=us&filters=price_overview`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const json = await res.json();
    const entry = json?.[String(steamAppId)];
    if (!entry?.success) return null;

    const po = entry.data?.price_overview;
    const data = {
      steamOnSale: po ? po.discount_percent > 0 : false,
      steamDiscountPercent: po?.discount_percent ?? 0,
    };

    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[catalog] Steam store fetch failed for ${steamAppId}:`, err.message);
    return null;
  }
}

async function fetchSteamStats(steamAppId) {
  const [players, spy, store] = await Promise.all([
    fetchCurrentPlayers(steamAppId),
    fetchSteamSpy(steamAppId),
    fetchSteamStoreSale(steamAppId),
  ]);

  return {
    ...(players ?? {}),
    ...(spy ?? {}),
    ...(store ?? {}),
  };
}

// GET /api/catalog/live-prices?ids=1091500,1245620
router.get('/live-prices', async (req, res) => {
  const raw = req.query.ids;
  if (!raw) {
    return res.status(400).json({ error: 'ids query param required (comma-separated Steam App IDs).' });
  }

  const ids = String(raw)
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !Number.isNaN(n) && n > 0);

  if (ids.length === 0) {
    return res.status(400).json({ error: 'No valid Steam App IDs provided.' });
  }
  if (ids.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 IDs per request.' });
  }

  const unique = [...new Set(ids)];
  const entries = await Promise.all(
    unique.map(async (id) => {
      const [deal, stats] = await Promise.all([
        fetchDealForSteamApp(id),
        fetchSteamStats(id),
      ]);
      return [String(id), deal, stats];
    })
  );

  const prices = {};
  const stats = {};

  for (const [key, deal, steamStats] of entries) {
    if (deal) {
      prices[key] = deal;
      stats[key] = {
        ...steamStats,
        isOnSale: deal.isOnSale || steamStats.steamOnSale || false,
        salePriceChangedAt: deal.salePriceChangedAt,
        saleEndsAt: deal.saleEndsAt,
      };
    } else if (Object.keys(steamStats).length > 0) {
      stats[key] = steamStats;
    }
  }

  res.json({
    prices,
    stats,
    fetchedAt: new Date().toISOString(),
    source: 'cheapshark+steam+steamspy',
    ttlSeconds: CACHE_TTL_MS / 1000,
    note: 'Steam does not publish exact sale end dates; salePriceChangedAt is when the deal price last changed.',
  });
});

module.exports = router;
