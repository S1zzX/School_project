const db = require('./db');
const bcrypt = require('bcryptjs');

const SEED_KEY = 'demo_seed_v2';

function ensureUser({ username, email, password, role, shop_category = null }) {
  let row = db.prepare('SELECT id, username, role FROM users WHERE username = ?').get(username);
  if (!row) {
    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, shop_category)
      VALUES (?, ?, ?, ?, ?)
    `).run(username, email, passwordHash, role, shop_category);
    row = { id: result.lastInsertRowid, username, role };
    console.log(`  + Created ${role} "${username}" (id ${row.id})`);
  } else {
    console.log(`  · User "${username}" already exists (id ${row.id})`);
  }
  return row;
}

if (process.argv.includes('--clear')) {
  const info = db.prepare('DELETE FROM store_listings').run();
  console.log(`Cleared ${info.changes} store listings.`);
  process.exit(0);
}

function insertListing(userId, seller, listing) {
  const exists = db.prepare(
    'SELECT id FROM store_listings WHERE user_id = ? AND type = ? AND game = ? AND COALESCE(item, highlight) = ?'
  ).get(userId, listing.type, listing.game, listing.item || listing.highlight);
  if (exists) return null;

  const result = db.prepare(`
    INSERT INTO store_listings (
      user_id, type, game, item, category, wear, float, pattern, stattrak, nametag,
      stickers, charms, gloves_item, gloves_float, gloves_pattern,
      rank, hoursPlayed, skinsOwned, championsOwned, level, highlight, description,
      price, seller, sellerRating, image, views, stock, status, order_count
    ) VALUES (
      @user_id, @type, @game, @item, @category, @wear, @float, @pattern, @stattrak, @nametag,
      @stickers, @charms, @gloves_item, @gloves_float, @gloves_pattern,
      @rank, @hoursPlayed, @skinsOwned, @championsOwned, @level, @highlight, @description,
      @price, @seller, @sellerRating, @image, @views, @stock, @status, @order_count
    )
  `).run({
    user_id: userId,
    seller,
    item: listing.item ?? null,
    category: listing.category ?? null,
    wear: listing.wear ?? null,
    float: listing.float ?? null,
    pattern: listing.pattern != null ? String(listing.pattern) : null,
    stattrak: listing.stattrak ? 1 : 0,
    nametag: listing.nametag ?? null,
    stickers: listing.stickers
      ? (typeof listing.stickers === 'string' ? listing.stickers : JSON.stringify(listing.stickers))
      : null,
    charms: listing.charms
      ? (typeof listing.charms === 'string' ? listing.charms : JSON.stringify(listing.charms))
      : null,
    gloves_item: listing.gloves_item ?? null,
    gloves_float: listing.gloves_float ?? null,
    gloves_pattern: listing.gloves_pattern != null ? String(listing.gloves_pattern) : null,
    rank: listing.rank ?? null,
    hoursPlayed: listing.hoursPlayed ?? 0,
    skinsOwned: listing.skinsOwned ?? 0,
    championsOwned: listing.championsOwned ?? 0,
    level: listing.level ?? 0,
    highlight: listing.highlight ?? null,
    description: listing.description ?? null,
    sellerRating: listing.sellerRating ?? 4.8,
    views: listing.views ?? 0,
    stock: listing.stock ?? 1,
    status: listing.status ?? 'available',
    order_count: listing.order_count ?? 0,
    type: listing.type,
    game: listing.game,
    price: listing.price,
    image: listing.image ?? null,
  });
  return result.lastInsertRowid;
}

function insertPost(userId, author, post) {
  const exists = db.prepare(
    'SELECT id FROM forum_posts WHERE user_id = ? AND title = ?'
  ).get(userId, post.title);
  if (exists) return exists.id;

  const result = db.prepare(`
    INSERT INTO forum_posts (user_id, author, game, category, title, body, image, views, likes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    author,
    post.game,
    post.category,
    post.title,
    post.body,
    post.image ?? null,
    post.views ?? 0,
    post.likes ?? 0,
  );
  return result.lastInsertRowid;
}

function insertReply(postId, userId, author, authorRole, body) {
  const exists = db.prepare(
    'SELECT id FROM forum_replies WHERE post_id = ? AND user_id = ? AND body = ?'
  ).get(postId, userId, body);
  if (exists) return;

  db.prepare(`
    INSERT INTO forum_replies (post_id, user_id, author, author_role, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(postId, userId, author, authorRole, body);
}

const seedDemo = () => {
  console.log('Seeding demo data (v2)...');

  const alreadyDone = db.prepare('SELECT 1 AS ok FROM app_migrations WHERE key = ?').get(SEED_KEY);
  if (alreadyDone) {
    console.log('Demo seed v2 already applied — skipping. Delete app_migrations row to re-run.');
    return;
  }

  // ─── Users ───────────────────────────────────────────────────────────────
  console.log('\nUsers:');
  const s1zz = ensureUser({
    username: 'S1zz',
    email: 'shop@gmail.com',
    password: 'Password123',
    role: 'shop_owner',
    shop_category: 'FPS Skins',
  });
  const pixelTrader = ensureUser({
    username: 'PixelTrader',
    email: 'pixel@gmail.com',
    password: 'Password123',
    role: 'shop_owner',
    shop_category: 'MOBA Cosmetics',
  });
  const demoGamer = ensureUser({
    username: 'DemoGamer',
    email: 'gamer@gmail.com',
    password: 'Password123',
    role: 'gamer',
  });

  const steamHeader = (id) => `https://cdn.akamai.steamstatic.com/steam/apps/${id}/header.jpg`;

  const img = {
    cyberpunk: steamHeader(1091500),
    elden: steamHeader(1245620),
    gta: steamHeader(271590),
    rdr2: steamHeader(1174180),
    witcher: steamHeader(292030),
    bg3: steamHeader(1086940),
    destiny: steamHeader(1085660),
    forza: steamHeader(2483190),
    gothic: steamHeader(1297900),
  };

  // ─── Store listings (S1zz — FPS / accounts) ────────────────────────────────
  console.log('\nStore listings (S1zz):');
  const s1zzListings = [
    { type: 'account', game: 'Cyberpunk 2077', hoursPlayed: 150, skinsOwned: 10, highlight: 'Max Level V', price: 55, image: img.cyberpunk, stock: 2, views: 12 },
    { type: 'account', game: 'Elden Ring', hoursPlayed: 300, skinsOwned: 5, rank: 'Elden Lord', highlight: 'All Bosses Defeated', price: 70, image: img.elden, stock: 1, views: 28 },
    { type: 'account', game: 'GTA V', hoursPlayed: 2000, skinsOwned: 50, highlight: 'Billionaire Account', price: 150, image: img.gta, stock: 1, views: 45 },
    { type: 'account', game: 'Red Dead Redemption 2', hoursPlayed: 500, skinsOwned: 20, highlight: '100% Completion', price: 80, image: img.rdr2, stock: 3, views: 8 },
    { type: 'account', game: 'The Witcher 3', hoursPlayed: 400, skinsOwned: 15, highlight: 'GotY Edition', price: 40, image: img.witcher, stock: 2, views: 19 },
    { type: 'account', game: 'Baldurs Gate 3', hoursPlayed: 250, highlight: 'Tactician Beaten', price: 65, image: img.bg3, stock: 1, views: 33 },
    { type: 'skin', game: 'CS2', item: 'AK-47 | Redline', category: 'Skin', wear: 'Field-Tested', float: '0.2145', pattern: '661', stickers: [{ name: 'Team Liquid (Holo) | Katowice 2019' }, { name: 'Navi (Holo) | Stockholm 2021' }], gloves_item: 'Hand Wraps | Arboreal', gloves_float: '0.0821', gloves_pattern: '214', price: 42.5, image: img.destiny, stock: 1, views: 61 },
    { type: 'skin', game: 'CS2', item: 'AWP | Dragon Lore', category: 'Skin', wear: 'Factory New', float: '0.0082', pattern: '17', nametag: 'SOUVENIR', price: 2899, image: img.destiny, stock: 1, views: 142 },
    { type: 'skin', game: 'CS2', item: 'Karambit | Fade', category: 'Skin', wear: 'Factory New', float: '0.0198', pattern: '412', charms: [{ name: 'Charm | Hot Howl' }], price: 1850, image: img.destiny, stock: 1, views: 97 },
    { type: 'skin', game: 'CS2', item: 'M4A4 | Howl', category: 'Skin', wear: 'Minimal Wear', float: '0.0871', pattern: '88', stattrak: true, stickers: [{ name: 'Howl' }], price: 4200, image: img.destiny, stock: 1, views: 203 },
    { type: 'account', game: 'Valorant', rank: 'Immortal 2', hoursPlayed: 890, skinsOwned: 45, level: 156, highlight: 'Immortal Smurf — 45 Skins', price: 120, image: img.forza, stock: 1, views: 54 },
    { type: 'account', game: 'LoL', rank: 'Diamond II', hoursPlayed: 1200, skinsOwned: 120, championsOwned: 165, level: 312, highlight: 'Diamond ADC Main', price: 95, image: img.gothic, stock: 2, views: 37 },
    { type: 'account', game: 'Elden Ring', hoursPlayed: 80, highlight: 'Fresh NG+ Run', price: 35, image: img.elden, stock: 0, status: 'sold', order_count: 1, views: 22 },
    { type: 'skin', game: 'CS2', item: 'USP-S | Kill Confirmed', category: 'Skin', wear: 'Factory New', float: '0.0312', pattern: '255', price: 88, image: img.destiny, stock: 0, status: 'sold', order_count: 1, views: 15 },
  ];

  let listingCount = 0;
  for (const listing of s1zzListings) {
    if (insertListing(s1zz.id, 'S1zz', listing)) listingCount++;
  }
  console.log(`  + ${listingCount} new listings for S1zz`);

  // ─── Store listings (PixelTrader — MOBA) ───────────────────────────────────
  console.log('\nStore listings (PixelTrader):');
  const pixelListings = [
    { type: 'account', game: 'LoL', rank: 'Master', hoursPlayed: 2400, skinsOwned: 280, championsOwned: 168, level: 450, highlight: 'Master Mid — 280 Skins', price: 210, image: img.gothic, stock: 1, views: 71 },
    { type: 'account', game: 'Valorant', rank: 'Radiant', hoursPlayed: 1500, skinsOwned: 62, level: 198, highlight: 'Radiant Account (EU)', price: 350, image: img.forza, stock: 1, views: 118 },
    { type: 'account', game: 'LoL', rank: 'Platinum IV', hoursPlayed: 600, skinsOwned: 45, championsOwned: 140, level: 180, highlight: 'Starter Ranked Account', price: 55, image: img.gothic, stock: 3, views: 26 },
    { type: 'skin', game: 'CS2', item: 'Glock-18 | Fade', category: 'Skin', wear: 'Factory New', float: '0.0044', pattern: '763', gloves_item: 'Sport Gloves | Pandora\'s Box', gloves_float: '0.0612', gloves_pattern: '91', price: 520, image: img.destiny, stock: 1, views: 44 },
  ];

  let pixelCount = 0;
  for (const listing of pixelListings) {
    if (insertListing(pixelTrader.id, 'PixelTrader', listing)) pixelCount++;
  }
  console.log(`  + ${pixelCount} new listings for PixelTrader`);

  // ─── Community forum ─────────────────────────────────────────────────────
  console.log('\nForum threads:');
  const forumPosts = [
  // S1zz threads
    { user: s1zz, author: 'S1zz', game: 'Cyberpunk 2077', category: 'Discussion', title: 'Best Builds in Patch 2.0?', body: 'I have been experimenting with Netrunner builds but they feel weak now. Any suggestions for a strong late-game setup?', views: 34, likes: 5 },
    { user: s1zz, author: 'S1zz', game: 'Elden Ring', category: 'Tips & Tricks', title: 'Where to find Rivers of Blood?', body: 'Hey everyone, I missed the invasion in Mountaintops of the Giants. Is it still possible to get the katana after burning the tree?', views: 89, likes: 12 },
    { user: s1zz, author: 'S1zz', game: 'GTA V', category: 'Tips & Tricks', title: 'Heist Tips for Beginners', body: 'Always stock up on snacks and armor before starting any heist. Assign roles before you queue — it saves so much time on voice chat.', views: 41, likes: 8 },
    { user: s1zz, author: 'S1zz', game: 'Red Dead Redemption 2', category: 'Discussion', title: 'The legendary bear pelt', body: 'I accidentally dropped the legendary bear pelt on the way to the trapper. Will it respawn or am I locked out of that gear?', views: 22, likes: 3 },
    { user: s1zz, author: 'S1zz', game: 'CS2', category: 'Loadouts', title: 'Budget rifle loadout under $50', body: 'Looking for a clean rifle + pistol combo for matchmaking. What skins hold value but still look good in-game?', views: 56, likes: 7 },
    { user: s1zz, author: 'S1zz', game: 'Valorant', category: 'Loadouts', title: 'Best crosshair settings for headshots?', body: 'Switched from 0.35 to 0.27 sensitivity last week. Crosshair still feels too busy — share your minimalist setups please.', views: 67, likes: 4 },
    { user: s1zz, author: 'S1zz', game: 'CS2', category: 'Clips', title: '1v5 clutch on Mirage — luck or skill?', body: 'Finally hit a site retake ace after 400 hours. Smoke lineup was wrong but somehow worked. Post your craziest clutches below!', views: 128, likes: 19 },
  // PixelTrader threads
    { user: pixelTrader, author: 'PixelTrader', game: 'LoL', category: 'Tips & Tricks', title: 'Climbing from Gold to Plat as Support', body: 'Vision score above 25/min and roaming after level 6 made the biggest difference for me. Stop chasing kills — take objectives.', views: 73, likes: 11 },
    { user: pixelTrader, author: 'PixelTrader', game: 'LoL', category: 'Loadouts', title: 'AP Mage rune page for Season 2026', body: 'Arcane Comet feels better than First Strike on control mages after the latest patch. Here is my full rune + shard breakdown.', views: 45, likes: 6 },
    { user: pixelTrader, author: 'PixelTrader', game: 'Valorant', category: 'Discussion', title: 'Is ranked harder this act?', body: 'Dropped two ranks despite positive KD. Matchmaking feels punishing for solo queue. Anyone else seeing this on EU servers?', views: 91, likes: 14 },
    { user: pixelTrader, author: 'PixelTrader', game: 'Valorant', category: 'Clips', title: 'Operator flick on Ascent B main', body: 'Hit this shot in a scrim yesterday. One-tap through smoke — still not sure how I pulled it off. Clip link in replies if interested.', views: 156, likes: 22 },
  // DemoGamer threads
    { user: demoGamer, author: 'DemoGamer', game: 'Elden Ring', category: 'Discussion', title: 'Co-op boss order for new players?', body: 'Friend just started and I want to guide them without spoiling everything. What is a good co-op progression route for the first 20 hours?', views: 38, likes: 5 },
    { user: demoGamer, author: 'DemoGamer', game: 'GTA V', category: 'Clips', title: 'Stunt race fail compilation', body: 'Spent an hour recording stunt races with friends. 90% fails, 10% accidental wins. Worth a watch if you need a laugh.', views: 62, likes: 9 },
    { user: demoGamer, author: 'DemoGamer', game: 'CS2', category: 'Tips & Tricks', title: 'How to read economy rounds quickly?', body: 'Still struggle to call force buys vs saves in time. What cues do you use to read enemy economy in the first 10 seconds of freeze time?', views: 48, likes: 6 },
  ];

  const postIds = {};
  let postCount = 0;
  for (const entry of forumPosts) {
    const id = insertPost(entry.user.id, entry.author, entry);
    if (!postIds[entry.title]) {
      postIds[entry.title] = id;
      postCount++;
    }
  }
  console.log(`  + ${postCount} forum threads`);

  // ─── Forum replies ─────────────────────────────────────────────────────────
  console.log('\nForum replies:');
  const riversPostId = postIds['Where to find Rivers of Blood?'];
  if (riversPostId) {
    insertReply(riversPostId, demoGamer.id, 'DemoGamer', 'gamer', 'You need to complete Varre\'s questline and invade three times. The NPC spawns at the Mausoleum after that.');
    insertReply(riversPostId, pixelTrader.id, 'PixelTrader', 'shop_owner', 'If you already burned the tree, you can still get it in NG+ — the invasion is repeatable there.');
  }

  const heistPostId = postIds['Heist Tips for Beginners'];
  if (heistPostId) {
    insertReply(heistPostId, demoGamer.id, 'DemoGamer', 'gamer', 'Buy the Kuruma armored car before Prison Break. Makes getaway missions trivial.');
  }

  const clutchPostId = postIds['1v5 clutch on Mirage — luck or skill?'];
  if (clutchPostId) {
    insertReply(clutchPostId, pixelTrader.id, 'PixelTrader', 'shop_owner', 'That last kill through smoke was 100% luck. Still counts on the highlight reel though!');
    insertReply(clutchPostId, demoGamer.id, 'DemoGamer', 'gamer', 'Post the demo file — I want to see the crosshair placement on the retake.');
  }

  const rankedPostId = postIds['Is ranked harder this act?'];
  if (rankedPostId) {
    insertReply(rankedPostId, s1zz.id, 'S1zz', 'shop_owner', 'Solo queue MMR got adjusted last patch. Duo with a consistent partner helped me stabilize.');
  }

  const economyPostId = postIds['How to read economy rounds quickly?'];
  if (economyPostId) {
    insertReply(economyPostId, s1zz.id, 'S1zz', 'shop_owner', 'Tab during freeze and check who has rifles vs pistols. If 3+ enemies saved last round, expect a force or half-buy.');
  }

  console.log('  + Sample replies seeded');

  db.prepare('INSERT INTO app_migrations (key) VALUES (?)').run(SEED_KEY);

  console.log('\nDone! Demo accounts:');
  console.log('  Shop:  S1zz / shop@gmail.com / Password123');
  console.log('  Shop:  PixelTrader / pixel@gmail.com / Password123');
  console.log('  Gamer: DemoGamer / gamer@gmail.com / Password123');
  console.log('  Admin: admin@gameguide.dev / Admin@1234 (auto-seeded on server start)');
};

seedDemo();
