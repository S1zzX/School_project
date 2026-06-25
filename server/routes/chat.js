const express = require('express');
const db = require('../db');
const Groq = require('groq-sdk');

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

// Build RAG context from the database — enriched with all relevant tables
function getRagContext(contextGame) {
  try {
    // 1. Recent store listings (top 8, optionally filtered by game)
    let storeQuery = `SELECT * FROM store_listings WHERE status != 'sold' ORDER BY id DESC LIMIT 8`;
    let storeParams = [];
    if (contextGame) {
      storeQuery = `SELECT * FROM store_listings WHERE LOWER(game) = LOWER(?) AND status != 'sold' ORDER BY id DESC LIMIT 8`;
      storeParams = [contextGame];
    }
    const storeListings = db.prepare(storeQuery).all(...storeParams);

    // 2. Recent forum posts (top 8)
    let forumQuery = `SELECT * FROM forum_posts ORDER BY created_at DESC LIMIT 8`;
    let forumParams = [];
    if (contextGame) {
      forumQuery = `SELECT * FROM forum_posts WHERE LOWER(game) = LOWER(?) ORDER BY created_at DESC LIMIT 8`;
      forumParams = [contextGame];
    }
    const forumPosts = db.prepare(forumQuery).all(...forumParams);

    // 3. Platform statistics
    const stats = {
      totalUsers:    db.prepare(`SELECT COUNT(*) as c FROM users`).get().c,
      gamers:        db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'gamer'`).get().c,
      shopOwners:    db.prepare(`SELECT COUNT(*) as c FROM users WHERE role = 'shop_owner'`).get().c,
      totalListings: db.prepare(`SELECT COUNT(*) as c FROM store_listings WHERE status = 'available'`).get().c,
      totalPosts:    db.prepare(`SELECT COUNT(*) as c FROM forum_posts`).get().c,
      openTickets:   db.prepare(`SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'`).get().c,
    };

    // 4. Open support ticket topics (to give the AI context, no personal data)
    const ticketTopics = db.prepare(`
      SELECT category, subject, status FROM support_tickets 
      WHERE status IN ('open','in_progress') ORDER BY created_at DESC LIMIT 5
    `).all();

    // 5. Popular listings (most viewed)
    const popular = db.prepare(`
      SELECT game, item, highlight, price, rank, views FROM store_listings 
      ORDER BY views DESC LIMIT 5
    `).all();

    // Build context string
    let ctx = `\n\n--- LIVE GAMEGUIDE PLATFORM DATA ---\n\n`;

    ctx += `PLATFORM STATS:\n`;
    ctx += `- ${stats.totalUsers} registered users (${stats.gamers} gamers, ${stats.shopOwners} shop owners)\n`;
    ctx += `- ${stats.totalListings} active store listings\n`;
    ctx += `- ${stats.totalPosts} community posts\n`;
    ctx += `- ${stats.openTickets} open support tickets\n\n`;

    ctx += `AVAILABLE STORE LISTINGS:\n`;
    if (storeListings.length === 0) ctx += `(No listings available)\n`;
    storeListings.forEach(l => {
      if (l.type === 'skin') {
        ctx += `- [${l.game}] Skin: "${l.item}" (${l.wear || 'N/A'}, float ${l.float || 'N/A'}) - $${l.price} by ${l.seller}\n`;
      } else {
        ctx += `- [${l.game}] Account: "${l.highlight || 'Account'}" rank ${l.rank || 'Unranked'}, ${l.hoursPlayed || 0}h played, ${l.skinsOwned || 0} skins - $${l.price} by ${l.seller}\n`;
      }
    });

    ctx += `\nMOST VIEWED LISTINGS:\n`;
    popular.forEach(l => {
      ctx += `- [${l.game}] ${l.item || l.highlight || 'Account'} (${l.rank || ''}) - $${l.price} — ${l.views} views\n`;
    });

    ctx += `\nRECENT COMMUNITY POSTS:\n`;
    if (forumPosts.length === 0) ctx += `(No recent posts)\n`;
    forumPosts.forEach(p => {
      ctx += `- [${p.game}] "${p.title}" by ${p.author} (${p.category}) — ${p.likes} likes\n`;
    });

    if (ticketTopics.length > 0) {
      ctx += `\nACTIVE SUPPORT TOPICS (anonymized):\n`;
      ticketTopics.forEach(t => {
        ctx += `- [${t.category}] "${t.subject}" (${t.status})\n`;
      });
    }

    return ctx;
  } catch (err) {
    console.error('Error fetching RAG context:', err);
    return `\n\n[Warning: Could not fetch live platform data]`;
  }
}

// POST /api/chat
router.post('/', async (req, res) => {
  const { messages, contextGame } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const ragData = getRagContext(contextGame);

  let systemPrompt = `You are GameGuide AI — a knowledgeable, friendly gaming assistant and platform support agent.

Your capabilities:
- Expert gaming knowledge: weapon stats, skin prices, loadouts, strategies for Valorant, CS2, League of Legends, Apex Legends, and more
- Platform support: help users navigate the GameGuide store, community forum, and support system
- Account & store guidance: explain how to buy/sell skins, accounts, and game items on the platform
- Community help: assist with forum posts, finding other players, and gaming tips

Communication style: Speak like a gamer — punchy, accurate, use markdown (bold, bullets). Don't be overly formal.

You have access to LIVE data from the GameGuide platform below. Use it to give accurate, real-time answers about available listings, community activity, and platform stats.`;

  if (contextGame) {
    systemPrompt += `\n\nThe user is browsing the ${contextGame} section. Prioritize ${contextGame}-related info.`;
  }

  systemPrompt += `\n\nWhen users ask about support issues, tickets, or platform problems, guide them to use the Support page (/support) to submit a ticket.`;

  systemPrompt += ragData;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
  ];

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: apiMessages,
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 600,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "I couldn't generate a response.";
    res.json({ text: aiResponse });
  } catch (err) {
    console.error('[Groq API Error]:', err);

    if (err.message && (err.message.includes('API key') || err.message.includes('apiKey') || err.status === 401)) {
      return res.json({ text: "I'm offline right now! My administrator needs to provide a valid Groq API key in `server/.env`." });
    }

    res.status(500).json({ error: 'Failed to generate AI response: ' + (err.message || String(err)) });
  }
});

module.exports = router;
