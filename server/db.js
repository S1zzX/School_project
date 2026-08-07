// db.js — SQLite database initialization
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.sqlite'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    username       TEXT    UNIQUE NOT NULL,
    email          TEXT    UNIQUE NOT NULL,
    password_hash  TEXT    NOT NULL,
    role           TEXT    NOT NULL DEFAULT 'gamer',
    shop_category  TEXT,
    balance_usd    REAL    NOT NULL DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id        TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    game           TEXT    NOT NULL,
    game_color     TEXT    NOT NULL DEFAULT '#a78bfa',
    type           TEXT    NOT NULL,
    platform       TEXT    NOT NULL,
    price          REAL    NOT NULL,
    original_price REAL,
    image          TEXT    NOT NULL,
    added_at       TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS forum_posts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author     TEXT    NOT NULL,
    game       TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    image      TEXT,
    likes      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS post_likes (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
  );

  CREATE TABLE IF NOT EXISTS store_listings (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type           TEXT    NOT NULL,
    game           TEXT    NOT NULL,
    item           TEXT,
    category       TEXT,
    wear           TEXT,
    float          TEXT,
    pattern        TEXT,
    stattrak       INTEGER DEFAULT 0,
    nametag        TEXT,
    stickers       TEXT,
    charms         TEXT,
    gloves_item    TEXT,
    gloves_float   TEXT,
    gloves_pattern TEXT,
    rank           TEXT,
    hoursPlayed    INTEGER,
    skinsOwned     INTEGER,
    championsOwned INTEGER,
    level          INTEGER,
    highlight      TEXT,
    description    TEXT,
    price          REAL    NOT NULL,
    seller         TEXT    NOT NULL,
    sellerRating   REAL,
    image          TEXT,
    views          INTEGER DEFAULT 0,
    stock          INTEGER DEFAULT 1,
    status         TEXT    DEFAULT 'available',
    order_count    INTEGER DEFAULT 0,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS support_tickets (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username       TEXT    NOT NULL,
    email          TEXT    NOT NULL,
    subject        TEXT    NOT NULL,
    message        TEXT    NOT NULL,
    category       TEXT    NOT NULL DEFAULT 'general',
    priority       TEXT    NOT NULL DEFAULT 'normal',
    status         TEXT    NOT NULL DEFAULT 'open',
    admin_response TEXT,
    admin_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trade_requests (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id          INTEGER REFERENCES store_listings(id) ON DELETE SET NULL,
    buyer_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_username      TEXT    NOT NULL,
    seller_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
    seller_username     TEXT,
    item_name           TEXT    NOT NULL,
    game                TEXT    NOT NULL,
    category            TEXT,
    price               REAL    NOT NULL,
    status              TEXT    NOT NULL DEFAULT 'pending',
    seller_status       TEXT    NOT NULL DEFAULT 'pending',
    seller_note         TEXT,
    proof_image         TEXT,
    seller_responded_at TEXT,
    admin_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_note          TEXT,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS characters (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game           TEXT    NOT NULL,
    character_name TEXT    NOT NULL,
    level          INTEGER DEFAULT 1,
    rank           TEXT,
    role           TEXT,
    items_count    INTEGER DEFAULT 0,
    skins_count    INTEGER DEFAULT 0,
    description    TEXT,
    image          TEXT,
    is_for_sale    INTEGER DEFAULT 0,
    sale_price     REAL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notification_prefs (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notify_trades   INTEGER NOT NULL DEFAULT 1,
    notify_support  INTEGER NOT NULL DEFAULT 1,
    notify_orders   INTEGER NOT NULL DEFAULT 1,
    notify_promos   INTEGER NOT NULL DEFAULT 0,
    notify_email    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category   TEXT    NOT NULL,
    title      TEXT    NOT NULL,
    body       TEXT    NOT NULL,
    link       TEXT,
    read       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at);
  CREATE TABLE IF NOT EXISTS wallet_transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL,
    method      TEXT,
    currency    TEXT    NOT NULL DEFAULT 'USD',
    amount_usd  REAL    NOT NULL,
    amount_vnd  REAL    NOT NULL DEFAULT 0,
    rate        REAL    NOT NULL DEFAULT 25000,
    status      TEXT    NOT NULL DEFAULT 'credited',
    reference   TEXT    NOT NULL,
    note        TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id, created_at);

  CREATE TABLE IF NOT EXISTS forum_replies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author      TEXT    NOT NULL,
    author_role TEXT    NOT NULL DEFAULT 'gamer',
    body        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_forum_replies_post ON forum_replies(post_id, created_at);
`);

// ─── Migrations (safe for existing DBs) ──────────────────────────────────────
// Add columns if they don't exist yet (ALTER TABLE ignores error if already present)
const existingCols = db.pragma('table_info(users)').map((c) => c.name);
if (!existingCols.includes('role')) {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'gamer'`);
  console.log('[db] Migration: added role column');
}
if (!existingCols.includes('shop_category')) {
  db.exec(`ALTER TABLE users ADD COLUMN shop_category TEXT`);
  console.log('[db] Migration: added shop_category column');
}

const existingForumCols = db.pragma('table_info(forum_posts)').map((c) => c.name);
if (!existingForumCols.includes('image')) {
  db.exec(`ALTER TABLE forum_posts ADD COLUMN image TEXT`);
  console.log('[db] Migration: added image column to forum_posts');
}
if (!existingForumCols.includes('views')) {
  db.exec(`ALTER TABLE forum_posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0`);
  console.log('[db] Migration: added views column to forum_posts');
}

const existingStoreCols = db.pragma('table_info(store_listings)').map((c) => c.name);
if (!existingStoreCols.includes('stock')) {
  db.exec(`ALTER TABLE store_listings ADD COLUMN stock INTEGER DEFAULT 1`);
  console.log('[db] Migration: added stock column to store_listings');
}
if (!existingStoreCols.includes('status')) {
  db.exec(`ALTER TABLE store_listings ADD COLUMN status TEXT DEFAULT 'available'`);
  console.log('[db] Migration: added status column to store_listings');
}
if (!existingStoreCols.includes('order_count')) {
  db.exec(`ALTER TABLE store_listings ADD COLUMN order_count INTEGER DEFAULT 0`);
  console.log('[db] Migration: added order_count column to store_listings');
}
if (!existingStoreCols.includes('championsOwned')) {
  db.exec(`ALTER TABLE store_listings ADD COLUMN championsOwned INTEGER`);
  console.log('[db] Migration: added championsOwned column to store_listings');
}
if (!existingStoreCols.includes('level')) {
  db.exec(`ALTER TABLE store_listings ADD COLUMN level INTEGER`);
  console.log('[db] Migration: added level column to store_listings');
}
if (!existingStoreCols.includes('description')) {
  db.exec(`ALTER TABLE store_listings ADD COLUMN description TEXT`);
  console.log('[db] Migration: added description column to store_listings');
}
const inspectCols = [
  ['pattern', 'TEXT'],
  ['stattrak', 'INTEGER DEFAULT 0'],
  ['nametag', 'TEXT'],
  ['stickers', 'TEXT'],
  ['charms', 'TEXT'],
  ['gloves_item', 'TEXT'],
  ['gloves_float', 'TEXT'],
  ['gloves_pattern', 'TEXT'],
];
for (const [col, def] of inspectCols) {
  if (!existingStoreCols.includes(col)) {
    db.exec(`ALTER TABLE store_listings ADD COLUMN ${col} ${def}`);
    console.log(`[db] Migration: added ${col} column to store_listings`);
  }
}

// ─── Trade requests migrations ───────────────────────────────────────────────
try {
  const tradeCols = db.pragma('table_info(trade_requests)').map(c => c.name);
  if (!tradeCols.includes('seller_status')) {
    db.exec(`ALTER TABLE trade_requests ADD COLUMN seller_status TEXT NOT NULL DEFAULT 'pending'`);
    console.log('[db] Migration: added seller_status to trade_requests');
  }
  if (!tradeCols.includes('seller_note')) {
    db.exec(`ALTER TABLE trade_requests ADD COLUMN seller_note TEXT`);
    console.log('[db] Migration: added seller_note to trade_requests');
  }
  if (!tradeCols.includes('proof_image')) {
    db.exec(`ALTER TABLE trade_requests ADD COLUMN proof_image TEXT`);
    console.log('[db] Migration: added proof_image to trade_requests');
  }
  if (!tradeCols.includes('seller_responded_at')) {
    db.exec(`ALTER TABLE trade_requests ADD COLUMN seller_responded_at TEXT`);
    console.log('[db] Migration: added seller_responded_at to trade_requests');
  }
} catch { /* table may not exist yet on fresh DB */ }

// ─── One-time: reset seeded fake view counts so analytics track real opens ───
db.exec(`CREATE TABLE IF NOT EXISTS app_migrations (key TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
const viewsMigration = db.prepare(`SELECT 1 AS ok FROM app_migrations WHERE key = 'listing_views_live_v1'`).get();
if (!viewsMigration) {
  db.exec(`UPDATE store_listings SET views = 0`);
  db.prepare(`INSERT INTO app_migrations (key) VALUES ('listing_views_live_v1')`).run();
  console.log('[db] Migration: reset listing views — now tracked live when users open listings');
}

const patternBackfill = db.prepare(`SELECT 1 AS ok FROM app_migrations WHERE key = 'skin_pattern_backfill_v1'`).get();
if (!patternBackfill) {
  try {
    const skins = db.prepare(`
      SELECT id, float FROM store_listings
      WHERE LOWER(type) LIKE '%skin%' AND float IS NOT NULL AND float != ''
        AND (pattern IS NULL OR pattern = '')
    `).all();
    const upd = db.prepare(`UPDATE store_listings SET pattern = ? WHERE id = ?`);
    for (const row of skins) {
      const seed = String(((Number(row.id) * 7919) + Math.floor(parseFloat(row.float) * 1e6 || 0)) % 1000);
      upd.run(seed, row.id);
    }
    db.prepare(`INSERT INTO app_migrations (key) VALUES ('skin_pattern_backfill_v1')`).run();
    console.log(`[db] Migration: backfilled pattern for ${skins.length} skin listings`);
  } catch (err) {
    console.warn('[db] pattern backfill skipped:', err.message);
  }
}

// Enrich known demo skins with inspect extras (idempotent by migration key)
const inspectDemo = db.prepare(`SELECT 1 AS ok FROM app_migrations WHERE key = 'skin_inspect_demo_v1'`).get();
if (!inspectDemo) {
  try {
    const demos = [
      {
        item: 'AK-47 | Redline',
        pattern: '661',
        stickers: JSON.stringify([{ name: 'Team Liquid (Holo) | Katowice 2019' }, { name: 'Navi (Holo) | Stockholm 2021' }]),
        gloves_item: 'Hand Wraps | Arboreal',
        gloves_float: '0.0821',
        gloves_pattern: '214',
      },
      { item: 'AWP | Dragon Lore', pattern: '17', nametag: 'SOUVENIR' },
      { item: 'Karambit | Fade', pattern: '412', charms: JSON.stringify([{ name: 'Charm | Hot Howl' }]) },
      { item: 'M4A4 | Howl', pattern: '88', stattrak: 1, stickers: JSON.stringify([{ name: 'Howl' }]) },
      { item: 'Glock-18 | Fade', pattern: '763', gloves_item: "Sport Gloves | Pandora's Box", gloves_float: '0.0612', gloves_pattern: '91' },
      { item: 'USP-S | Kill Confirmed', pattern: '255' },
    ];
    for (const d of demos) {
      db.prepare(`
        UPDATE store_listings SET
          pattern = COALESCE(NULLIF(pattern, ''), @pattern),
          stattrak = COALESCE(@stattrak, stattrak),
          nametag = COALESCE(@nametag, nametag),
          stickers = COALESCE(@stickers, stickers),
          charms = COALESCE(@charms, charms),
          gloves_item = COALESCE(@gloves_item, gloves_item),
          gloves_float = COALESCE(@gloves_float, gloves_float),
          gloves_pattern = COALESCE(@gloves_pattern, gloves_pattern)
        WHERE type = 'skin' AND item = @item
      `).run({
        item: d.item,
        pattern: d.pattern,
        stattrak: d.stattrak ?? null,
        nametag: d.nametag ?? null,
        stickers: d.stickers ?? null,
        charms: d.charms ?? null,
        gloves_item: d.gloves_item ?? null,
        gloves_float: d.gloves_float ?? null,
        gloves_pattern: d.gloves_pattern ?? null,
      });
    }
    db.prepare(`INSERT INTO app_migrations (key) VALUES ('skin_inspect_demo_v1')`).run();
    console.log('[db] Migration: enriched demo skins for Test Mode');
  } catch (err) {
    console.warn('[db] inspect demo enrich skipped:', err.message);
  }
}

// ─── Users migrations ────────────────────────────────────────────────────────
const userCols = db.pragma('table_info(users)').map(c => c.name);
if (!userCols.includes('avatar_url')) {
  db.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  console.log('[db] Migration: added avatar_url to users');
}
if (!userCols.includes('balance_usd')) {
  db.exec(`ALTER TABLE users ADD COLUMN balance_usd REAL NOT NULL DEFAULT 0`);
  console.log('[db] Migration: added balance_usd to users');
}

// ─── Seed admin ───────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@gameguide.dev';
const ADMIN_PASSWORD = 'Admin@1234';

const existingAdmin = db.prepare(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`).get();
if (!existingAdmin) {
  db.prepare(`INSERT OR IGNORE INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
    .run('Admin', ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASSWORD, 10));
  console.log(`[db] Seeded admin account: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

console.log('[db] SQLite database ready at', path.join(__dirname, 'database.sqlite'));

module.exports = db;
