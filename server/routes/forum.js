// routes/forum.js — Forum posts (GET public, POST/like requires JWT)
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gameguide_super_secret_2024';

// ─── Middleware: require valid JWT ────────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// ─── Optional auth (attaches user if token present, but doesn't block) ────────
function optionalAuth(req, _res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); } catch {}
  }
  next();
}

// ─── GET /api/forum ───────────────────────────────────────────────────────────
// Returns all posts newest first; if authenticated, also returns liked_by_me flag
router.get('/', optionalAuth, (req, res) => {
  const posts = db
    .prepare(`
      SELECT p.*,
        u.role AS author_role,
        (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) AS reply_count,
        (SELECT COUNT(*) FROM forum_posts fp WHERE fp.user_id = p.user_id) AS author_post_count
      FROM forum_posts p
      LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `)
    .all();

  if (req.user) {
    const likedSet = new Set(
      db
        .prepare('SELECT post_id FROM post_likes WHERE user_id = ?')
        .all(req.user.id)
        .map((r) => r.post_id)
    );
    return res.json(posts.map((p) => ({ ...p, liked_by_me: likedSet.has(p.id) })));
  }

  return res.json(posts.map((p) => ({ ...p, liked_by_me: false })));
});

// ─── GET /api/forum/:id/replies ───────────────────────────────────────────────
router.get('/:id/replies', optionalAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT id FROM forum_posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const replies = db.prepare(`
    SELECT id, post_id, user_id, author, author_role, body, created_at
    FROM forum_replies
    WHERE post_id = ?
    ORDER BY created_at ASC
  `).all(postId);

  return res.json(replies);
});

// ─── GET /api/forum/:id — single thread (increments view count) ───────────────
router.get('/:id', optionalAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare(`
    SELECT p.*,
      u.role AS author_role,
      (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) AS reply_count,
      (SELECT COUNT(*) FROM forum_posts fp WHERE fp.user_id = p.user_id) AS author_post_count
    FROM forum_posts p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(postId);

  if (!post) return res.status(404).json({ error: 'Post not found.' });

  db.prepare('UPDATE forum_posts SET views = views + 1 WHERE id = ?').run(postId);
  post.views = (post.views ?? 0) + 1;

  let liked_by_me = false;
  if (req.user) {
    liked_by_me = !!db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?')
      .get(req.user.id, postId);
  }

  return res.json({ ...post, liked_by_me });
});

// ─── POST /api/forum/:id/replies ──────────────────────────────────────────────
router.post('/:id/replies', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const { body } = req.body;

  const post = db.prepare('SELECT id FROM forum_posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });

  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'Reply body is required.' });
  }
  if (String(body).trim().length < 2) {
    return res.status(400).json({ error: 'Reply must be at least 2 characters.' });
  }

  const result = db.prepare(`
    INSERT INTO forum_replies (post_id, user_id, author, author_role, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    postId,
    req.user.id,
    req.user.username,
    req.user.role || 'gamer',
    String(body).trim(),
  );

  const reply = db.prepare(`
    SELECT id, post_id, user_id, author, author_role, body, created_at
    FROM forum_replies WHERE id = ?
  `).get(result.lastInsertRowid);

  return res.status(201).json(reply);
});

// ─── DELETE /api/forum/:id/replies/:replyId ───────────────────────────────────
router.delete('/:id/replies/:replyId', requireAuth, (req, res) => {
  const reply = db.prepare('SELECT * FROM forum_replies WHERE id = ? AND post_id = ?')
    .get(req.params.replyId, req.params.id);

  if (!reply) return res.status(404).json({ error: 'Reply not found.' });

  if (reply.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this reply.' });
  }

  db.prepare('DELETE FROM forum_replies WHERE id = ?').run(reply.id);
  return res.json({ success: true });
});

// ─── POST /api/forum ──────────────────────────────────────────────────────────
router.post('/', requireAuth, (req, res) => {
  const { game, category, title, body, image } = req.body;

  if (!game || !category || !title || !body) {
    return res.status(400).json({ error: 'game, category, title, and body are required.' });
  }
  if (title.trim().length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters.' });
  }
  if (body.trim().length < 10) {
    return res.status(400).json({ error: 'Body must be at least 10 characters.' });
  }

  const result = db
    .prepare(`
      INSERT INTO forum_posts (user_id, author, game, category, title, body, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(req.user.id, req.user.username, game, category, title.trim(), body.trim(), image || null);

  const post = db.prepare(`
    SELECT p.*, u.role AS author_role,
      (SELECT COUNT(*) FROM forum_replies r WHERE r.post_id = p.id) AS reply_count,
      (SELECT COUNT(*) FROM forum_posts fp WHERE fp.user_id = p.user_id) AS author_post_count
    FROM forum_posts p
    LEFT JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);
  return res.status(201).json({ ...post, liked_by_me: false });
});

// ─── POST /api/forum/:id/like ─────────────────────────────────────────────────
router.post('/:id/like', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(postId);

  if (!post) return res.status(404).json({ error: 'Post not found.' });

  const existing = db
    .prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?')
    .get(req.user.id, postId);

  if (existing) {
    // Unlike
    db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(req.user.id, postId);
    db.prepare('UPDATE forum_posts SET likes = likes - 1 WHERE id = ?').run(postId);
  } else {
    // Like
    db.prepare('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)').run(req.user.id, postId);
    db.prepare('UPDATE forum_posts SET likes = likes + 1 WHERE id = ?').run(postId);
  }

  const updated = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(postId);
  return res.json({ ...updated, liked_by_me: !existing });
});

// ─── PUT /api/forum/:id ───────────────────────────────────────────────────────
router.put('/:id', requireAuth, (req, res) => {
  const postId = Number(req.params.id);
  const { game, category, title, body, image } = req.body;

  const post = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(postId);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to edit this post.' });

  if (!game || !category || !title || !body) {
    return res.status(400).json({ error: 'game, category, title, and body are required.' });
  }
  if (title.trim().length < 5) {
    return res.status(400).json({ error: 'Title must be at least 5 characters.' });
  }
  if (body.trim().length < 10) {
    return res.status(400).json({ error: 'Body must be at least 10 characters.' });
  }

  db.prepare(`
    UPDATE forum_posts 
    SET game = ?, category = ?, title = ?, body = ?, image = ?
    WHERE id = ? AND user_id = ?
  `).run(game, category, title.trim(), body.trim(), image || null, postId, req.user.id);

  const existingLike = db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(req.user.id, postId);
  const updatedPost = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(postId);
  
  return res.json({ ...updatedPost, liked_by_me: !!existingLike });
});

// ─── DELETE /api/forum/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, (req, res) => {
  const result = db
    .prepare('DELETE FROM forum_posts WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Post not found or not yours.' });
  }
  return res.json({ success: true });
});

module.exports = router;
