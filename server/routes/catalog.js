// routes/catalog.js ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â Live catalog pricing + Steam stats
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

async function fetchSteamProfiles(steamIds = []) {
  const apiKey = process.env.STEAM_API_KEY;
  const ids = [...new Set(steamIds.filter(Boolean).map(String))].slice(0, 100);
  if (!apiKey || ids.length === 0) return new Map();

  const cacheKey = `steam-profiles:${ids.sort().join(',')}`;
  const hit = getCached(cacheKey);
  if (hit) return new Map(Object.entries(hit));

  try {
    const search = new URLSearchParams({
      key: apiKey,
      steamids: ids.join(','),
    });
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?${search.toString()}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return new Map();

    const json = await res.json();
    const players = Array.isArray(json?.response?.players) ? json.response.players : [];
    const entries = players.map(player => [String(player.steamid), {
      personaName: player.personaname ?? null,
      avatarUrl: player.avatarfull || player.avatarmedium || player.avatar || null,
      profileUrl: player.profileurl ?? null,
    }]);
    const data = Object.fromEntries(entries);
    setCache(cacheKey, data);
    return new Map(entries);
  } catch (err) {
    console.error('[catalog] Steam profile fetch failed:', err.message);
    return new Map();
  }
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
function compactText(value, max = 420) {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1)}...` : cleaned;
}

async function fetchSteamAppMedia(steamAppId) {
  const cacheKey = `media:${steamAppId}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=us&l=english&filters=basic,movies,screenshots`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const json = await res.json();
    const entry = json?.[String(steamAppId)];
    if (!entry?.success || !entry.data) return null;

    const data = {
      appid: steamAppId,
      name: entry.data.name ?? null,
      steamUrl: `https://store.steampowered.com/app/${steamAppId}`,
      trailers: Array.isArray(entry.data.movies)
        ? entry.data.movies.slice(0, 3).map(movie => ({
            id: movie.id,
            name: movie.name ?? 'Steam trailer',
            thumbnail: movie.thumbnail ?? null,
            webm: movie.webm?.max ?? movie.webm?.['480'] ?? null,
            mp4: movie.mp4?.max ?? movie.mp4?.['480'] ?? null,
            highlight: !!movie.highlight,
          })).filter(movie => movie.webm || movie.mp4)
        : [],
      screenshots: Array.isArray(entry.data.screenshots)
        ? entry.data.screenshots.slice(0, 8).map(ss => ({
            id: ss.id,
            thumbnail: ss.path_thumbnail,
            full: ss.path_full,
          })).filter(ss => ss.thumbnail || ss.full)
        : [],
    };

    setCache(cacheKey, data);
    return data;
  } catch (err) {
    console.error(`[catalog] Steam media fetch failed for ${steamAppId}:`, err.message);
    return null;
  }
}

function normalizeSteamReviewParams(query = {}) {
  const allowedFilters = new Set(['recent', 'updated', 'all']);
  const allowedReviewTypes = new Set(['all', 'positive', 'negative']);
  const allowedPurchaseTypes = new Set(['all', 'steam', 'non_steam_purchase']);

  const filter = allowedFilters.has(String(query.filter)) ? String(query.filter) : 'recent';
  const reviewType = allowedReviewTypes.has(String(query.review_type)) ? String(query.review_type) : 'all';
  const purchaseType = allowedPurchaseTypes.has(String(query.purchase_type)) ? String(query.purchase_type) : 'all';
  const language = typeof query.language === 'string' && query.language.trim() ? query.language.trim() : 'all';
  const cursor = typeof query.cursor === 'string' && query.cursor.length ? query.cursor : '*';
  const pageSizeRaw = parseInt(query.num_per_page ?? query.page_size ?? '20', 10);
  const pageSize = Math.max(1, Math.min(Number.isFinite(pageSizeRaw) ? pageSizeRaw : 20, 100));

  return { filter, reviewType, purchaseType, language, cursor, pageSize };
}

async function fetchSteamReviews(steamAppId, options = {}) {
  const params = normalizeSteamReviewParams(options);

  try {
    const search = new URLSearchParams({
      json: '1',
      filter: params.filter,
      language: params.language,
      review_type: params.reviewType,
      purchase_type: params.purchaseType,
      num_per_page: String(params.pageSize),
      cursor: params.cursor,
    });

    if (params.filter === 'all') search.set('day_range', '365');

    const url = `https://store.steampowered.com/appreviews/${steamAppId}?${search.toString()}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const json = await res.json();
    if (!json || json.success === 0) return null;

    const summary = json.query_summary ?? {};
    const reviews = Array.isArray(json.reviews)
      ? json.reviews.map(review => ({
          id: review.recommendationid,
          votedUp: !!review.voted_up,
          language: review.language ?? null,
          review: compactText(review.review, 1200),
          votesUp: review.votes_up ?? 0,
          votesFunny: review.votes_funny ?? 0,
          weightedVoteScore: review.weighted_vote_score != null ? Number(review.weighted_vote_score) : null,
          createdAt: review.timestamp_created ? new Date(review.timestamp_created * 1000).toISOString() : null,
          updatedAt: review.timestamp_updated ? new Date(review.timestamp_updated * 1000).toISOString() : null,
          playtimeHours: review.author?.playtime_forever ? Math.round(review.author.playtime_forever / 60) : null,
          playtimeAtReviewHours: review.author?.playtime_at_review ? Math.round(review.author.playtime_at_review / 60) : null,
          authorSteamId: review.author?.steamid ?? null,
        })).filter(review => review.review)
      : [];
    const profiles = await fetchSteamProfiles(reviews.map(review => review.authorSteamId));
    const enrichedReviews = reviews.map(review => {
      const profile = review.authorSteamId ? profiles.get(String(review.authorSteamId)) : null;
      return {
        ...review,
        authorPersonaName: profile?.personaName ?? null,
        authorAvatarUrl: profile?.avatarUrl ?? null,
        authorProfileUrl: profile?.profileUrl ?? null,
      };
    });

    return {
      summary: {
        reviewScore: summary.review_score ?? null,
        reviewScoreDesc: summary.review_score_desc ?? null,
        totalPositive: summary.total_positive ?? 0,
        totalNegative: summary.total_negative ?? 0,
        totalReviews: summary.total_reviews ?? 0,
        returnedReviews: summary.num_reviews ?? reviews.length,
      },
      reviews: enrichedReviews,
      cursor: json.cursor ?? null,
      hasMore: reviews.length > 0 && !!json.cursor && json.cursor !== params.cursor,
      params,
    };
  } catch (err) {
    console.error(`[catalog] Steam reviews fetch failed for ${steamAppId}:`, err.message);
    return null;
  }
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

// GET /api/catalog/steam-reviews/:appid - live Steam reviews with cursor pagination
router.get('/steam-reviews/:appid', async (req, res) => {
  const steamAppId = parseInt(req.params.appid, 10);
  if (!Number.isFinite(steamAppId) || steamAppId <= 0) {
    return res.status(400).json({ error: 'Valid Steam App ID is required.' });
  }

  const reviews = await fetchSteamReviews(steamAppId, req.query);
  if (!reviews) {
    return res.status(404).json({ error: 'Steam reviews not available for this app.' });
  }

  return res.json({
    appid: steamAppId,
    steamUrl: `https://store.steampowered.com/app/${steamAppId}`,
    reviewSummary: reviews.summary,
    reviews: reviews.reviews,
    nextCursor: reviews.cursor,
    hasMore: reviews.hasMore,
    params: reviews.params,
    fetchedAt: new Date().toISOString(),
    source: 'steam-appreviews-live',
  });
});

// GET /api/catalog/steam-media/:appid - Steam trailer and screenshots
router.get('/steam-media/:appid', async (req, res) => {
  const steamAppId = parseInt(req.params.appid, 10);
  if (!Number.isFinite(steamAppId) || steamAppId <= 0) {
    return res.status(400).json({ error: 'Valid Steam App ID is required.' });
  }

  const media = await fetchSteamAppMedia(steamAppId);

  if (!media) {
    return res.status(404).json({ error: 'Steam media not available for this app.' });
  }

  return res.json({
    appid: steamAppId,
    steamUrl: media?.steamUrl ?? `https://store.steampowered.com/app/${steamAppId}`,
    trailers: media?.trailers ?? [],
    screenshots: media?.screenshots ?? [],
    reviewSummary: null,
    reviews: [],
    nextCursor: null,
    hasMoreReviews: false,
    fetchedAt: new Date().toISOString(),
    source: 'steam-store-appdetails',
  });
});

// ─── Steam Top Games ─────────────────────────────────────────────────────────

/** Fetch top ~50 app IDs from Steam's weekly top sellers chart */
async function fetchTopSellerAppIds(limit = 50) {
  const apiKey = process.env.STEAM_API_KEY;
  const cacheKey = 'steam-top-appids';
  const hit = getCached(cacheKey);
  if (hit) return hit;

  // Try Steam API weekly top sellers (requires key)
  if (apiKey) {
    try {
      const url = `https://api.steampowered.com/IStoreTopSellers/GetWeeklyTopSellers/v1/?key=${apiKey}&country=US&count=${limit}`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const json = await res.json();
        const ranks = json?.response?.ranks ?? [];
        const ids = ranks.map(r => r.appid).filter(Boolean).slice(0, limit);
        if (ids.length > 0) {
          setCache(cacheKey, ids);
          return ids;
        }
      }
    } catch (err) {
      console.warn('[catalog] Steam top sellers fetch failed:', err.message);
    }
  }

  // Fallback: popular app IDs (hand-picked evergreen bestsellers)
  const fallback = [
    1091500, 1245620, 2767030, 1086940, 271590, 1172620, 2050650, 1203220,
    252490, 578080, 1174180, 377160, 1551360, 2358720, 2322010, 367520,
    814380, 1085660, 1091500, 413150, 892970, 1097150, 1250410, 1966720,
    2072450, 1238840, 570, 304930, 218620, 444090,
  ];
  setCache(cacheKey, fallback);
  return fallback;
}

/** Fetch name + price + image for one Steam appid from the store API (no key needed) */
async function fetchSteamAppBasic(appid) {
  const cacheKey = `basic:${appid}`;
  const hit = getCached(cacheKey);
  if (hit) return hit;

  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=english&filters=basic,price_overview`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;

    const json = await res.json();
    const entry = json?.[String(appid)];
    if (!entry?.success || !entry.data) return null;

    const d = entry.data;
    const po = d.price_overview;

    const game = {
      appid,
      name: d.name ?? null,
      headerImage: d.header_image ?? `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
      price: po ? po.final / 100 : null,
      origPrice: po && po.discount_percent > 0 ? po.initial / 100 : null,
      discount: po?.discount_percent ?? 0,
      isFree: d.is_free ?? false,
      type: d.type ?? 'game',
    };

    setCache(cacheKey, game);
    return game;
  } catch (err) {
    console.warn(`[catalog] appdetails failed for ${appid}:`, err.message);
    return null;
  }
}

// GET /api/catalog/steam-top — top Steam games with live prices and images
router.get('/steam-top', async (req, res) => {
  const cacheKey = 'steam-top-full';
  const hit = getCached(cacheKey);
  if (hit) return res.json(hit);

  try {
    const limit = Math.min(parseInt(req.query.limit ?? '40', 10), 80);
    const appIds = await fetchTopSellerAppIds(limit);

    // Fetch in parallel batches of 8 to avoid rate limiting
    const results = [];
    const batchSize = 8;
    for (let i = 0; i < appIds.length; i += batchSize) {
      const batch = appIds.slice(i, i + batchSize);
      const settled = await Promise.all(batch.map(id => fetchSteamAppBasic(id)));
      results.push(...settled);
      if (i + batchSize < appIds.length) {
        // Small pause between batches to avoid hammering Steam
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const games = results
      .filter(g => g && g.name && !g.isFree && g.price !== null && g.price > 0)
      .map(g => ({
        appid: g.appid,
        name: g.name,
        headerImage: g.headerImage,
        price: g.price,
        origPrice: g.origPrice,
        discount: g.discount,
        isFree: false,
      }));

    const payload = {
      games,
      fetchedAt: new Date().toISOString(),
      source: appIds === getCached('steam-top-appids') ? 'steam-top-sellers-api' : 'fallback-list',
      ttlSeconds: CACHE_TTL_MS / 1000,
    };

    setCache(cacheKey, payload);
    res.json(payload);
  } catch (err) {
    console.error('[catalog] steam-top failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch top Steam games.' });
  }
});

// GET /api/catalog/steam-app/:appid — single game basic info (name, price, image)
router.get('/steam-app/:appid', async (req, res) => {
  const appid = parseInt(req.params.appid, 10);
  if (!Number.isFinite(appid) || appid <= 0) {
    return res.status(400).json({ error: 'Valid Steam App ID required.' });
  }

  const game = await fetchSteamAppBasic(appid);
  if (!game) {
    return res.status(404).json({ error: 'Game not found on Steam.' });
  }

  return res.json({
    appid: game.appid,
    name: game.name,
    headerImage: game.headerImage,
    price: game.isFree ? 0 : game.price,
    origPrice: game.origPrice,
    discount: game.discount,
    isFree: game.isFree,
    fetchedAt: new Date().toISOString(),
  });
});

// ─── CS2 Skin Tester catalogue (ByMykel / Steam CDN images) ──────────────────
const {
  searchSkins,
  searchGloves,
  listWeapons,
  lookupSkinVisual,
  searchCharms,
  listCharmCategories,
  searchStickersCatalog,
  listStickerCategories,
} = require('../lib/cs2Catalog');

// GET /api/catalog/cs2-weapons
router.get('/cs2-weapons', async (_req, res) => {
  try {
    const weapons = await listWeapons();
    return res.json({ weapons });
  } catch (err) {
    console.error('[catalog/cs2-weapons]', err.message);
    return res.status(502).json({ error: 'CS2 catalogue unavailable.' });
  }
});

// GET /api/catalog/cs2-skins?q=&weapon=&limit=
router.get('/cs2-skins', async (req, res) => {
  try {
    const skins = await searchSkins({
      q: req.query.q,
      weapon: req.query.weapon,
      limit: req.query.limit,
    });
    return res.json({ skins });
  } catch (err) {
    console.error('[catalog/cs2-skins]', err.message);
    return res.status(502).json({ error: 'CS2 catalogue unavailable.' });
  }
});

// GET /api/catalog/cs2-gloves?q=&limit=
router.get('/cs2-gloves', async (req, res) => {
  try {
    const gloves = await searchGloves({
      q: req.query.q,
      limit: req.query.limit,
    });
    return res.json({ gloves });
  } catch (err) {
    console.error('[catalog/cs2-gloves]', err.message);
    return res.status(502).json({ error: 'CS2 catalogue unavailable.' });
  }
});

// GET /api/catalog/cs2-charms?q=&category=&limit=
router.get('/cs2-charms', async (req, res) => {
  try {
    const [charms, categories] = await Promise.all([
      searchCharms({
        q: req.query.q,
        category: req.query.category === 'All Charms' ? '' : req.query.category,
        limit: req.query.limit,
      }),
      listCharmCategories(),
    ]);
    return res.json({ charms, categories });
  } catch (err) {
    console.error('[catalog/cs2-charms]', err.message);
    return res.status(502).json({ error: 'CS2 catalogue unavailable.' });
  }
});

// GET /api/catalog/cs2-stickers?q=&category=&limit=
router.get('/cs2-stickers', async (req, res) => {
  try {
    const [stickers, categories] = await Promise.all([
      searchStickersCatalog({
        q: req.query.q,
        category: req.query.category === 'All Stickers' ? '' : req.query.category,
        limit: req.query.limit,
      }),
      listStickerCategories(),
    ]);
    return res.json({ stickers, categories });
  } catch (err) {
    console.error('[catalog/cs2-stickers]', err.message);
    return res.status(502).json({ error: 'CS2 catalogue unavailable.' });
  }
});

// GET /api/catalog/cs2-skin-visual?name=
router.get('/cs2-skin-visual', async (req, res) => {
  const name = String(req.query.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name is required.' });
  try {
    const visual = await lookupSkinVisual(name);
    if (!visual) return res.status(404).json({ error: 'Skin not found in catalogue.' });
    return res.json(visual);
  } catch (err) {
    console.error('[catalog/cs2-skin-visual]', err.message);
    return res.status(502).json({ error: 'CS2 catalogue unavailable.' });
  }
});

module.exports = router;
