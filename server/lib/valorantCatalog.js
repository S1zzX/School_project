// Valorant weapon-skin catalogue and conservative replacement-value estimates.
const WEAPONS_URL = 'https://valorant-api.com/v1/weapons';
const TIERS_URL = 'https://valorant-api.com/v1/contenttiers';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

let cache = { expiresAt: 0, weapons: new Map(), tiers: new Map() };

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'GameGuide/1.0' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadCatalog() {
  if (cache.weapons.size && cache.expiresAt > Date.now()) return cache;
  const [weaponJson, tierJson] = await Promise.all([fetchJson(WEAPONS_URL), fetchJson(TIERS_URL)]);
  const tiers = new Map((tierJson.data || []).map(t => [t.uuid, t.displayName]));
  const weapons = new Map();
  for (const weapon of weaponJson.data || []) {
    const skins = (weapon.skins || [])
      .filter(s => s.displayName && !/^standard /i.test(s.displayName))
      .map(s => ({
        name: s.displayName,
        weapon: weapon.displayName,
        tier: tiers.get(s.contentTierUuid) || 'Battle Pass / Unknown',
        icon: s.displayIcon || s.chromas?.[0]?.displayIcon || null,
      }));
    weapons.set(normalize(weapon.displayName), { name: weapon.displayName, skins });
  }
  cache = { weapons, tiers, expiresAt: Date.now() + CACHE_TTL_MS };
  return cache;
}

async function candidatesForWeapons(names) {
  const { weapons } = await loadCatalog();
  const result = {};
  for (const requested of [...new Set(names.filter(Boolean))]) {
    const entry = weapons.get(normalize(requested));
    if (entry) result[entry.name] = entry.skins.map(s => s.name);
  }
  return result;
}

async function findSkin(weaponName, skinName) {
  const { weapons } = await loadCatalog();
  const weapon = weapons.get(normalize(weaponName));
  if (!weapon) return null;
  return weapon.skins.find(s => normalize(s.name) === normalize(skinName)) || null;
}

function estimateVp(skin) {
  const tier = skin.tier.toLowerCase();
  const melee = normalize(skin.weapon) === 'melee';
  if (tier.includes('select')) return melee ? { min: 1750, max: 2550 } : { min: 875, max: 875 };
  if (tier.includes('deluxe')) return melee ? { min: 2550, max: 3550 } : { min: 1275, max: 1275 };
  if (tier.includes('premium')) return melee ? { min: 3550, max: 4350 } : { min: 1775, max: 1775 };
  if (tier.includes('ultra')) return melee ? { min: 4950, max: 5950 } : { min: 2475, max: 2975 };
  if (tier.includes('exclusive')) return melee ? { min: 4350, max: 5950 } : { min: 2175, max: 2675 };
  // Battle-pass and unclassified skins have no reliable individual VP price.
  return { min: 0, max: 0 };
}

function valueInventory(skins) {
  const valued = skins.map(skin => ({ ...skin, estimatedVp: estimateVp(skin) }));
  const totalVpMin = valued.reduce((sum, s) => sum + s.estimatedVp.min, 0);
  const totalVpMax = valued.reduce((sum, s) => sum + s.estimatedVp.max, 0);
  // VP package value varies by country and package size. This is deliberately a range.
  const usdMin = Math.round(totalVpMin / 115);
  const usdMax = Math.round(totalVpMax / 90);
  return { skins: valued, totalVpMin, totalVpMax, replacementValueUsd: { min: usdMin, max: usdMax } };
}

module.exports = { candidatesForWeapons, findSkin, valueInventory };
