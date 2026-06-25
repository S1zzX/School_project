// server/lib/notifications.js — In-app notification helpers
const db = require('../db');

const CATEGORY_PREF = {
  trades: 'notify_trades',
  support: 'notify_support',
  orders: 'notify_orders',
  promos: 'notify_promos',
};

function getPrefs(userId) {
  let row = db.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(userId);
  if (!row) {
    db.prepare('INSERT INTO notification_prefs (user_id) VALUES (?)').run(userId);
    row = db.prepare('SELECT * FROM notification_prefs WHERE user_id = ?').get(userId);
  }
  return {
    notify_trades: !!row.notify_trades,
    notify_support: !!row.notify_support,
    notify_orders: !!row.notify_orders,
    notify_promos: !!row.notify_promos,
    notify_email: !!row.notify_email,
  };
}

function updatePrefs(userId, prefs) {
  getPrefs(userId);
  const current = getPrefs(userId);
  const next = { ...current, ...prefs };
  db.prepare(`
    UPDATE notification_prefs
    SET notify_trades = ?, notify_support = ?, notify_orders = ?, notify_promos = ?, notify_email = ?
    WHERE user_id = ?
  `).run(
    next.notify_trades ? 1 : 0,
    next.notify_support ? 1 : 0,
    next.notify_orders ? 1 : 0,
    next.notify_promos ? 1 : 0,
    next.notify_email ? 1 : 0,
    userId,
  );
  return next;
}

function createNotification(userId, { category, title, body, link }) {
  if (!userId) return null;
  const prefs = getPrefs(userId);
  const prefKey = CATEGORY_PREF[category];
  if (prefKey && !prefs[prefKey]) return null;

  const result = db.prepare(`
    INSERT INTO notifications (user_id, category, title, body, link)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, category, title, body, link ?? null);

  return result.lastInsertRowid;
}

function notifyUsers(userIds, data) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    createNotification(userId, data);
  }
}

function notifyAdmins(data) {
  const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
  notifyUsers(admins.map(a => a.id), data);
}

module.exports = {
  getPrefs,
  updatePrefs,
  createNotification,
  notifyUsers,
  notifyAdmins,
};
