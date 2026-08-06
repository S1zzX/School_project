// routes/wallet.js - Wallet balance, top-ups, and wallet checkout debits
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VND_PER_USD = 25000;
const VALID_METHODS = ['momo', 'mb_bank'];
const VALID_CURRENCIES = ['USD', 'VND'];

function roundMoney(value, decimals = 2) {
  return Number(Number(value).toFixed(decimals));
}

function toUsd(amount, currency) {
  return currency === 'VND' ? amount / VND_PER_USD : amount;
}

function toVnd(amount, currency) {
  return currency === 'USD' ? amount * VND_PER_USD : amount;
}

function makeReference(userId, prefix = 'GG') {
  const stamp = Date.now().toString(36).toUpperCase();
  return `${prefix}-${userId}-${stamp}`;
}

function walletPayload(userId, latestTransaction = null) {
  const user = db.prepare('SELECT balance_usd FROM users WHERE id = ?').get(userId);
  const balanceUsd = roundMoney(user?.balance_usd ?? 0);
  const rows = db.prepare(`
    SELECT id, type, method, currency, amount_usd, amount_vnd, rate, status, reference, note, created_at
    FROM wallet_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 20
  `).all(userId);

  return {
    balance_usd: balanceUsd,
    balance_vnd: Math.round(balanceUsd * VND_PER_USD),
    exchange_rate: VND_PER_USD,
    transactions: rows,
    latest_transaction: latestTransaction,
  };
}

router.get('/', requireAuth, (req, res) => {
  return res.json(walletPayload(req.user.id));
});

router.post('/top-up', requireAuth, (req, res) => {
  const method = String(req.body.method || '').trim();
  const currency = String(req.body.currency || '').trim().toUpperCase();
  const amount = Number(req.body.amount);

  if (!VALID_METHODS.includes(method)) {
    return res.status(400).json({ error: 'Payment method must be momo or mb_bank.' });
  }
  if (!VALID_CURRENCIES.includes(currency)) {
    return res.status(400).json({ error: 'Currency must be USD or VND.' });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be greater than zero.' });
  }

  const amountUsd = roundMoney(toUsd(amount, currency));
  const amountVnd = Math.round(toVnd(amount, currency));
  if (amountUsd < 1) {
    return res.status(400).json({ error: 'Minimum top-up is 1 USD or the VND equivalent.' });
  }

  const reference = makeReference(req.user.id, method === 'momo' ? 'MOMO' : 'MB');
  const insertAndCredit = db.transaction(() => {
    db.prepare('UPDATE users SET balance_usd = balance_usd + ? WHERE id = ?').run(amountUsd, req.user.id);
    const result = db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, method, currency, amount_usd, amount_vnd, rate, status, reference, note)
      VALUES (?, 'top_up', ?, ?, ?, ?, ?, 'credited', ?, ?)
    `).run(
      req.user.id,
      method,
      currency,
      amountUsd,
      amountVnd,
      VND_PER_USD,
      reference,
      'Manual transfer top-up credited for demo checkout flow'
    );
    return db.prepare(`
      SELECT id, type, method, currency, amount_usd, amount_vnd, rate, status, reference, note, created_at
      FROM wallet_transactions
      WHERE id = ?
    `).get(result.lastInsertRowid);
  });

  const transaction = insertAndCredit();
  return res.status(201).json(walletPayload(req.user.id, transaction));
});

router.post('/debit', requireAuth, (req, res) => {
  const amountUsd = roundMoney(Number(req.body.amount_usd));
  const note = typeof req.body.note === 'string' ? req.body.note.slice(0, 180) : 'Wallet checkout';

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return res.status(400).json({ error: 'amount_usd must be greater than zero.' });
  }

  const debit = db.transaction(() => {
    const user = db.prepare('SELECT balance_usd FROM users WHERE id = ?').get(req.user.id);
    const currentBalance = roundMoney(user?.balance_usd ?? 0);
    if (currentBalance + 0.0001 < amountUsd) {
      const err = new Error('Insufficient wallet balance.');
      err.statusCode = 400;
      throw err;
    }

    db.prepare('UPDATE users SET balance_usd = balance_usd - ? WHERE id = ?').run(amountUsd, req.user.id);
    const result = db.prepare(`
      INSERT INTO wallet_transactions (user_id, type, method, currency, amount_usd, amount_vnd, rate, status, reference, note)
      VALUES (?, 'purchase', 'wallet', 'USD', ?, ?, ?, 'completed', ?, ?)
    `).run(
      req.user.id,
      amountUsd,
      Math.round(amountUsd * VND_PER_USD),
      VND_PER_USD,
      makeReference(req.user.id, 'PAY'),
      note
    );
    return db.prepare(`
      SELECT id, type, method, currency, amount_usd, amount_vnd, rate, status, reference, note, created_at
      FROM wallet_transactions
      WHERE id = ?
    `).get(result.lastInsertRowid);
  });

  try {
    const transaction = debit();
    return res.json(walletPayload(req.user.id, transaction));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    throw err;
  }
});

module.exports = router;