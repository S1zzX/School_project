const db = require('./db');
const bcrypt = require('bcryptjs');

const seedDemo = () => {
  console.log('Seeding demo data...');

  // 1. Create a dummy shop owner user "S1zz"
  let demoUser = db.prepare(`SELECT id FROM users WHERE username = 'S1zz'`).get();
  
  if (!demoUser) {
    const passwordHash = bcrypt.hashSync('Password123', 10);
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, shop_category) 
      VALUES (?, ?, ?, 'shop_owner', 'FPS Skins')
    `).run('S1zz', 'shop@gmail.com', passwordHash);
    demoUser = { id: result.lastInsertRowid };
    console.log(`Created shop_owner S1zz with ID ${demoUser.id}`);
  } else {
    console.log(`User S1zz already exists with ID ${demoUser.id}`);
  }

  // 2. Create more store listings for the user
  const listingsCount = db.prepare(`SELECT COUNT(*) as count FROM store_listings WHERE user_id = ?`).get(demoUser.id).count;
  if (listingsCount <= 2) {
    const insertListing = db.prepare(`
      INSERT INTO store_listings (
        user_id, type, game, item, category, wear, float, rank, hoursPlayed, skinsOwned, highlight, price, seller, sellerRating, image, views
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertListing.run(demoUser.id, 'account', 'Cyberpunk 2077', null, null, null, null, null, 150, 10, 'Max Level V', 55.00, 'S1zz', 4.9, '/src/assets/cyberpunk2077.jpg', 850);
    insertListing.run(demoUser.id, 'account', 'Elden Ring', null, null, null, null, 'Elden Lord', 300, 5, 'All Bosses Defeated', 70.00, 'S1zz', 4.8, '/src/assets/elden_ring.jpg', 1200);
    insertListing.run(demoUser.id, 'account', 'GTA V', null, null, null, null, null, 2000, 50, 'Billionaire Account', 150.00, 'S1zz', 4.7, '/src/assets/gta_v.jpg', 2300);
    insertListing.run(demoUser.id, 'account', 'Red Dead Redemption 2', null, null, null, null, null, 500, 20, '100% Completion', 80.00, 'S1zz', 4.9, '/src/assets/red_dead_redemption_2.jpg', 560);
    insertListing.run(demoUser.id, 'account', 'The Witcher 3', null, null, null, null, null, 400, 15, 'GotY Edition', 40.00, 'S1zz', 5.0, '/src/assets/the_witcher_3.jpg', 420);
    insertListing.run(demoUser.id, 'account', 'Baldurs Gate 3', null, null, null, null, null, 250, 0, 'Tactician Beaten', 65.00, 'S1zz', 4.8, '/src/assets/baldurs_gate_3.jpg', 980);
    
    // Fix the broken CS2 image if it exists by just replacing the url or deleting it
    console.log('Seeded more store listings.');
  }

  // 3. Create some community posts for the user
  const postsCount = db.prepare(`SELECT COUNT(*) as count FROM forum_posts WHERE user_id = ?`).get(demoUser.id).count;
  if (postsCount <= 2) {
    const insertPost = db.prepare(`
      INSERT INTO forum_posts (user_id, author, game, category, title, body, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertPost.run(demoUser.id, 'S1zz', 'Cyberpunk 2077', 'Discussion', 'Best Builds in Patch 2.0?', 'I have been experimenting with Netrunner builds but they feel weak now. Any suggestions?', null);
    insertPost.run(demoUser.id, 'S1zz', 'Elden Ring', 'Tips & Tricks', 'Where to find Rivers of Blood?', 'Hey everyone, I missed the invasion in Mountaintops of the Giants. Is it still possible to get the katana?', null);
    insertPost.run(demoUser.id, 'S1zz', 'GTA V', 'Tips & Tricks', 'Heist Tips for Beginners', 'Always stock up on snacks and armor before starting any heist. It will save your life!', null);
    insertPost.run(demoUser.id, 'S1zz', 'Red Dead Redemption 2', 'Discussion', 'The legendary bear pelt', 'I accidentally dropped the legendary bear pelt. Will it respawn at the trapper?', null);
    
    console.log('Seeded more forum posts.');
  }

  console.log('Done!');
};

seedDemo();
