// CS2 live price lookup via Steam Community Market (appid 730, no API key)

const STEAM_MARKET = 'https://steamcommunity.com/market/priceoverview';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_TIMEOUT_MS = 10_000;

/** @type {Map<string, { data: object, expiresAt: number }>} */
const cache = new Map();

const WEAR_ALIASES = {
  'factory new': 'Factory New',
  fn: 'Factory New',
  'minimal wear': 'Minimal Wear',
  mw: 'Minimal Wear',
  'field-tested': 'Field-Tested',
  'field tested': 'Field-Tested',
  ft: 'Field-Tested',
  'well-worn': 'Well-Worn',
  'well worn': 'Well-Worn',
  ww: 'Well-Worn',
  'battle-scarred': 'Battle-Scarred',
  'battle scarred': 'Battle-Scarred',
  bs: 'Battle-Scarred',
};

function normalizeWear(wear) {
  if (!wear) return null;
  const key = String(wear).trim().toLowerCase();
  return WEAR_ALIASES[key] || wear.trim();
}

function hasWearSuffix(name) {
  return /\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i.test(name);
}

/** Build Steam market_hash_name candidates from vision AI fields */
function buildMarketHashCandidates(item, wear) {
  const base = String(item || '').trim();
  if (!base) return [];

  const candidates = [];
  const normalizedWear = normalizeWear(wear);

  if (hasWearSuffix(base)) {
    candidates.push(base);
  } else if (normalizedWear) {
    candidates.push(`${base} (${normalizedWear})`);
  }

  candidates.push(base);

  // Deduplicate while preserving order
  return [...new Set(candidates)];
}

function parseUsdPrice(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GameGuide/1.0 (CS2 price lookup)',
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSteamMarketPrice(marketHashName) {
  const cacheKey = `steam:${marketHashName}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  const url = new URL(STEAM_MARKET);
  url.searchParams.set('appid', '730');
  url.searchParams.set('currency', '1');
  url.searchParams.set('country', 'US');
  url.searchParams.set('market_hash_name', marketHashName);

  try {
    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success) return null;

    const data = {
      marketHashName,
      lowestPrice: parseUsdPrice(json.lowest_price),
      medianPrice: parseUsdPrice(json.median_price),
      volume: json.volume != null ? parseInt(String(json.volume).replace(/,/g, ''), 10) : null,
      priceSource: 'steam_community_market',
      currency: 'USD',
      fetchedAt: new Date().toISOString(),
    };

    if (data.lowestPrice == null && data.medianPrice == null) return null;

    cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  } catch (err) {
    console.error(`[cs2Market] Steam fetch failed for "${marketHashName}":`, err.message);
    return null;
  }
}

/**
 * Look up live CS2 item price on Steam Community Market.
 * @param {string | null} item - e.g. "AK-47 | Red Laminate"
 * @param {string | null} wear - e.g. "Factory New"
 */
async function lookupCs2MarketPrice(item, wear) {
  const candidates = buildMarketHashCandidates(item, wear);

  for (const name of candidates) {
    const result = await fetchSteamMarketPrice(name);
    if (result) return result;
  }

  return null;
}

module.exports = {
  lookupCs2MarketPrice,
  buildMarketHashCandidates,
};
