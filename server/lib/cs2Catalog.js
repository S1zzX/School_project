// Validates CS2 skin names against the ByMykel/CSGO-API catalogue.
// The remote JSON is cached in memory; a small fallback keeps common M4A4
// corrections working when GitHub is temporarily unavailable.

const CATALOG_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const KEYCHAINS_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/keychains.json';
const STICKERS_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/stickers.json';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;

/** @type {{ expiresAt: number, skins: object[] }} */
let cache = { expiresAt: 0, skins: [] };
/** @type {{ expiresAt: number, items: object[] }} */
let keychainCache = { expiresAt: 0, items: [] };
/** @type {{ expiresAt: number, items: object[] }} */
let stickerCache = { expiresAt: 0, items: [] };

const FALLBACK_SKINS = [
  { name: 'M4A4 | Howl', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Hellfire', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Radiation Hazard', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | The Emperor', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Neo-Noir', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Desolate Space', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Asiimov', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Evil Daimyo', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Bullet Rain', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Dragon King', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | Temukau', image: null, weapon: { name: 'M4A4' } },
  { name: 'M4A4 | In Living Color', image: null, weapon: { name: 'M4A4' } },
];

function normalizeName(value) {
  return String(value || '')
    .replace(/\((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)\s*$/i, '')
    .replace(/StatTrak™|StatTrak|Souvenir|★/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function weaponFromName(value) {
  const base = String(value || '').replace(/StatTrak™|StatTrak|Souvenir|★/gi, '').trim();
  return base.includes('|') ? base.split('|')[0].trim() : base.split(/[-–—]/)[0].trim();
}

function toSkinRow(row) {
  if (typeof row === 'string') return { name: row, image: null, weapon: { name: weaponFromName(row) } };
  if (!row || typeof row !== 'object' || typeof row.name !== 'string') return null;
  return {
    name: row.name,
    image: row.image || row.image_url || null,
    weapon: row.weapon || { name: weaponFromName(row.name) },
    rarity: row.rarity || null,
    paint_index: row.paint_index ?? row.paintIndex ?? null,
  };
}

async function fetchCatalogue() {
  if (cache.skins.length && cache.expiresAt > Date.now()) return cache.skins;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(CATALOG_URL, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GameGuide/1.0 (CS2 catalogue validation)' },
    });
    if (!response.ok) throw new Error(`catalogue HTTP ${response.status}`);
    const json = await response.json();
    const rows = Array.isArray(json) ? json : Object.values(json || {}).flatMap(v => Object.values(v || {}));
    const skins = rows.map(toSkinRow).filter(s => s && s.name.includes('|'));
    if (!skins.length) throw new Error('catalogue contained no skins');
    cache = { skins, expiresAt: Date.now() + CACHE_TTL_MS };
    return cache.skins;
  } catch (error) {
    console.error('[cs2Catalog] Remote catalogue unavailable:', error.message);
    return cache.skins.length ? cache.skins : FALLBACK_SKINS;
  } finally {
    clearTimeout(timer);
  }
}

async function getCandidates(itemName, limit = 80) {
  const skins = await fetchCatalogue();
  const weapon = weaponFromName(itemName).toLowerCase();
  if (!weapon) return [];
  return skins
    .filter(s => weaponFromName(s.name).toLowerCase() === weapon)
    .map(s => s.name)
    .slice(0, limit);
}

async function canonicalSkinName(value) {
  const normalized = normalizeName(value);
  if (!normalized) return null;
  const skins = await fetchCatalogue();
  const hit = skins.find(s => normalizeName(s.name) === normalized);
  return hit?.name || null;
}

/** Resolve catalogue visual metadata for a market-style skin name. */
async function lookupSkinVisual(itemName) {
  const normalized = normalizeName(itemName);
  if (!normalized) return null;
  const skins = await fetchCatalogue();
  const hit = skins.find(s => normalizeName(s.name) === normalized);
  if (!hit) return null;
  return {
    name: hit.name,
    image: hit.image || null,
    weapon: hit.weapon?.name || weaponFromName(hit.name),
    rarity: hit.rarity?.name || hit.rarity || null,
    paint_index: hit.paint_index ?? null,
  };
}

async function listWeapons() {
  const skins = await fetchCatalogue();
  const set = new Set();
  for (const s of skins) {
    const w = s.weapon?.name || weaponFromName(s.name);
    if (w) set.add(w);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Search CS2 skins for the Skin Tester sandbox.
 * @param {{ q?: string, weapon?: string, limit?: number }} opts
 */
async function searchSkins(opts = {}) {
  const q = normalizeName(opts.q || '');
  const weaponFilter = String(opts.weapon || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(opts.limit) || 48, 1), 120);
  const skins = await fetchCatalogue();

  const scored = [];
  for (const s of skins) {
    const weapon = s.weapon?.name || weaponFromName(s.name);
    if (weaponFilter && weapon.toLowerCase() !== weaponFilter) continue;
    const n = normalizeName(s.name);
    if (q && !n.includes(q) && !weapon.toLowerCase().includes(q)) continue;
    scored.push({
      name: s.name,
      image: s.image || null,
      weapon,
      rarity: s.rarity?.name || s.rarity || null,
      paint_index: s.paint_index ?? null,
    });
    if (scored.length >= limit) break;
  }
  return scored;
}

async function searchGloves(opts = {}) {
  const q = normalizeName(opts.q || '');
  const limit = Math.min(Math.max(Number(opts.limit) || 48, 1), 80);
  const skins = await fetchCatalogue();
  const gloveWords = /glove|wrap|hand wrap/i;
  const out = [];
  for (const s of skins) {
    const weapon = s.weapon?.name || weaponFromName(s.name);
    if (!gloveWords.test(weapon) && !gloveWords.test(s.name)) continue;
    const n = normalizeName(s.name);
    if (q && !n.includes(q)) continue;
    out.push({
      name: s.name,
      image: s.image || null,
      weapon,
      rarity: s.rarity?.name || s.rarity || null,
    });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchJsonCatalogue(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GameGuide/1.0 (CS2 catalogue)' },
    });
    if (!response.ok) throw new Error(`catalogue HTTP ${response.status}`);
    const json = await response.json();
    return Array.isArray(json) ? json : Object.values(json || {}).flatMap(v => (Array.isArray(v) ? v : Object.values(v || {})));
  } finally {
    clearTimeout(timer);
  }
}

function charmCategory(row) {
  const coll = Array.isArray(row.collections) && row.collections[0]?.name
    ? row.collections[0].name
    : null;
  if (!coll) return 'Other';
  return coll
    .replace(/\s*Charm Collection\s*/i, '')
    .replace(/\s*Collection\s*/i, '')
    .trim() || 'Other';
}

async function fetchKeychains() {
  if (keychainCache.items.length && keychainCache.expiresAt > Date.now()) return keychainCache.items;
  try {
    const rows = await fetchJsonCatalogue(KEYCHAINS_URL);
    const items = rows
      .filter(r => r && typeof r.name === 'string')
      .map(r => ({
        name: r.name,
        image: r.image || null,
        category: charmCategory(r),
        rarity: r.rarity?.name || null,
      }));
    keychainCache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
    return items;
  } catch (error) {
    console.error('[cs2Catalog] keychains unavailable:', error.message);
    return keychainCache.items;
  }
}

async function fetchStickers() {
  if (stickerCache.items.length && stickerCache.expiresAt > Date.now()) return stickerCache.items;
  try {
    const rows = await fetchJsonCatalogue(STICKERS_URL);
    const items = rows
      .filter(r => r && typeof r.name === 'string')
      .map(r => ({
        name: r.name,
        image: r.image || null,
        category: r.type || r.tournament_event || 'Other',
        rarity: r.rarity?.name || null,
      }));
    stickerCache = { items, expiresAt: Date.now() + CACHE_TTL_MS };
    return items;
  } catch (error) {
    console.error('[cs2Catalog] stickers unavailable:', error.message);
    return stickerCache.items;
  }
}

async function searchCharms(opts = {}) {
  const q = normalizeName(opts.q || '');
  const category = String(opts.category || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(opts.limit) || 60, 1), 120);
  const items = await fetchKeychains();
  const out = [];
  for (const item of items) {
    if (category && category !== 'all' && item.category.toLowerCase() !== category) continue;
    if (q && !normalizeName(item.name).includes(q)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

async function listCharmCategories() {
  const items = await fetchKeychains();
  const set = new Set(items.map(i => i.category).filter(Boolean));
  return ['All Charms', ...[...set].sort((a, b) => a.localeCompare(b))];
}

async function searchStickersCatalog(opts = {}) {
  const q = normalizeName(opts.q || '');
  const category = String(opts.category || '').trim().toLowerCase();
  const limit = Math.min(Math.max(Number(opts.limit) || 60, 1), 120);
  const items = await fetchStickers();
  const out = [];
  for (const item of items) {
    if (category && category !== 'all' && String(item.category || '').toLowerCase() !== category) continue;
    if (q && !normalizeName(item.name).includes(q)) continue;
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

async function listStickerCategories() {
  const items = await fetchStickers();
  const set = new Set(items.map(i => i.category).filter(Boolean));
  return ['All Stickers', ...[...set].sort((a, b) => a.localeCompare(b)).slice(0, 40)];
}

module.exports = {
  getCandidates,
  canonicalSkinName,
  normalizeName,
  lookupSkinVisual,
  weaponFromName,
  listWeapons,
  searchSkins,
  searchGloves,
  searchCharms,
  listCharmCategories,
  searchStickersCatalog,
  listStickerCategories,
};
