// routes/auth.js — Register & Login
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gameguide_super_secret_2024';
const JWT_EXPIRES = '7d';

const VALID_ROLES      = ['gamer', 'shop_owner'];
const SHOP_CATEGORIES  = ['FPS Skins', 'RPG Items', 'Strategy Gear', 'MOBA Cosmetics', 'Battle Royale Loot'];
const MAX_AVATAR_LEN   = 600_000;

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    shop_category: row.shop_category ?? null,
    avatar_url: row.avatar_url ?? null,
  };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', (req, res) => {
  const { username, email, password, role = 'gamer', shop_category } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}.` });
  }
  if (role === 'shop_owner') {
    if (!shop_category || !SHOP_CATEGORIES.includes(shop_category)) {
      return res.status(400).json({ error: `shop_category must be one of: ${SHOP_CATEGORIES.join(', ')}.` });
    }
  }

  // Check duplicates
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
  if (existing) {
    return res.status(409).json({ error: 'Email or username already in use.' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (username, email, password_hash, role, shop_category) VALUES (?, ?, ?, ?, ?)')
    .run(username, email, password_hash, role, role === 'shop_owner' ? shop_category : null);

  const user = {
    id: result.lastInsertRowid,
    username,
    email,
    role,
    shop_category: role === 'shop_owner' ? shop_category : null,
    avatar_url: null,
  };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return res.status(201).json({ token, user });
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!row) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const valid = bcrypt.compareSync(password, row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const user = toPublicUser(row);
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return res.json({ token, user });
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const row = db.prepare('SELECT id, username, email, role, shop_category, avatar_url, created_at FROM users WHERE id = ?').get(payload.id);
    if (!row) return res.status(404).json({ error: 'User not found.' });
    return res.json({ ...toPublicUser(row), created_at: row.created_at });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
router.patch('/profile', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }

  let payload;
  try {
    payload = jwt.verify(auth.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const { username, email, currentPassword, newPassword, avatar_url } = req.body;
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.id);
  if (!row) return res.status(404).json({ error: 'User not found.' });

  if (avatar_url !== undefined) {
    if (avatar_url !== null && typeof avatar_url !== 'string') {
      return res.status(400).json({ error: 'avatar_url must be a string or null.' });
    }
    if (avatar_url && !avatar_url.startsWith('data:image/')) {
      return res.status(400).json({ error: 'avatar_url must be a valid image data URL.' });
    }
    if (avatar_url && avatar_url.length > MAX_AVATAR_LEN) {
      return res.status(400).json({ error: 'Profile image is too large. Use an image under 2 MB.' });
    }
  }

  // Validate current password when changing password
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required to set a new password.' });
    }
    const valid = bcrypt.compareSync(currentPassword, row.password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }
  }

  // Check username/email uniqueness (skip own record)
  if (username && username !== row.username) {
    const clash = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, row.id);
    if (clash) return res.status(409).json({ error: 'Username already taken.' });
  }
  if (email && email !== row.email) {
    const clash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, row.id);
    if (clash) return res.status(409).json({ error: 'Email already in use.' });
  }

  const newUsername  = username || row.username;
  const newEmail     = email    || row.email;
  const newHash      = newPassword ? bcrypt.hashSync(newPassword, 10) : row.password_hash;
  const newAvatarUrl = avatar_url !== undefined ? avatar_url : (row.avatar_url ?? null);

  db.prepare('UPDATE users SET username = ?, email = ?, password_hash = ?, avatar_url = ? WHERE id = ?')
    .run(newUsername, newEmail, newHash, newAvatarUrl, row.id);

  const updatedUser = {
    id: row.id,
    username: newUsername,
    email: newEmail,
    role: row.role,
    shop_category: row.shop_category ?? null,
    avatar_url: newAvatarUrl,
  };
  const token = jwt.sign(updatedUser, JWT_SECRET, { expiresIn: JWT_EXPIRES });

  return res.json({ token, user: updatedUser });
});

module.exports = router;

