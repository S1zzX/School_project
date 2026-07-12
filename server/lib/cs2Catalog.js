// Validates CS2 skin names against the ByMykel/CSGO-API catalogue.
// The remote JSON is cached in memory; a small fallback keeps common M4A4
// corrections working when GitHub is temporarily unavailable.

const CATALOG_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 12_000;

let cache = { expiresAt: 0, skins: [] };

const FALLBACK_SKINS = [
  'M4A4 | Howl', 'M4A4 | Hellfire', 'M4A4 | Radiation Hazard',
  'M4A4 | The Emperor', 'M4A4 | Neo-Noir', 'M4A4 | Desolate Space',
  'M4A4 | Asiimov', 'M4A4 | Evil Daimyo', 'M4A4 | Bullet Rain',
  'M4A4 | Dragon King', 'M4A4 | Temukau', 'M4A4 | In Living Color',
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
    const skins = rows
      .map(row => typeof row === 'string' ? row : row?.name)
      .filter(name => typeof name === 'string' && name.includes('|'));
    if (!skins.length) throw new Error('catalogue contained no skins');
    cache = { skins: [...new Set(skins)], expiresAt: Date.now() + CACHE_TTL_MS };
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
  return skins.filter(name => weaponFromName(name).toLowerCase() === weapon).slice(0, limit);
}

async function canonicalSkinName(value) {
  const normalized = normalizeName(value);
  if (!normalized) return null;
  const skins = await fetchCatalogue();
  return skins.find(name => normalizeName(name) === normalized) || null;
}

module.exports = { getCandidates, canonicalSkinName, normalizeName };
