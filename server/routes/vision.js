// routes/vision.js — Computer Vision via Groq Vision API
const express = require('express');
const Groq = require('groq-sdk');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

// POST /api/vision/analyze
// Body: { imageBase64: string, mimeType: string, context?: string }
router.post('/analyze', requireAuth, async (req, res) => {
  const { imageBase64, mimeType = 'image/jpeg', context } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }

  // Validate base64 size (max ~10MB encoded)
  if (imageBase64.length > 14_000_000) {
    return res.status(400).json({ error: 'Image too large. Please use an image under 10MB.' });
  }

  const systemPrompt = `You are a Computer Vision AI specialized in gaming screenshots.
Your task is to analyze gaming screenshots and extract structured information.

Games you can identify: CS2, Valorant, League of Legends (LoL), Apex Legends, Dota 2, Fortnite, PUBG, Overwatch 2, and others.

CRITICAL TRADING RULES — you must apply these when setting the "type" field:
- CS2 and PUBG: skins and items ARE tradeable on Steam Market. Use "skin" for a single item, "inventory" for a collection of items.
- Valorant, League of Legends (LoL), Apex Legends, Fortnite, Overwatch 2, Dota 2: cosmetics are ACCOUNT-BOUND and CANNOT be traded or sold. Even if you see a weapon skin collection or inventory screen for these games, you MUST set type to "account" — never "skin" or "inventory".
- Use "gameplay" for in-game action screenshots.
- Use "stats" for profile/stats/rank screens.
- Use "other" only if nothing else fits.

The "wear" and "float" fields only apply to CS2 items. Set them to null for all other games.
The "estimatedPrice" should reflect account value (not individual item value) for non-CS2 games.

You MUST respond with ONLY a valid JSON object, no markdown, no extra text. Use this exact schema:
{
  "detected": true | false,
  "game": "CS2" | "Valorant" | "LoL" | "Apex Legends" | "Fortnite" | "PUBG" | "Dota 2" | "Overwatch 2" | "Other" | null,
  "type": "skin" | "account" | "inventory" | "gameplay" | "stats" | "other" | null,
  "item": "Name of skin or item detected (or null for account screenshots)" | null,
  "wear": "Factory New" | "Minimal Wear" | "Field-Tested" | "Well-Worn" | "Battle-Scarred" | null,
  "float": "0.0000" | null,
  "rank": "Detected rank (e.g. Silver 1, Platinum 3, Diamond, Radiant, Immortal, Global Elite)" | null,
  "level": number | null,
  "hoursPlayed": number | null,
  "skinsOwned": number | null,
  "estimatedPrice": number | null,
  "confidence": "high" | "medium" | "low",
  "description": "A 1-2 sentence human-readable summary of what you see in the screenshot",
  "tags": ["array", "of", "relevant", "keywords"]
}

If the image is not a gaming screenshot or you cannot identify any game content, set "detected": false and explain in "description" what the image actually shows.`;

  const userPrompt = context
    ? `Analyze this gaming screenshot. Context from user: "${context}". Extract all relevant gaming information.`
    : `Analyze this gaming screenshot. Extract all relevant gaming information including game name, item/skin details, player rank, stats, and estimated market price if applicable.`;

  try {
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            { type: 'text', text: userPrompt },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 800,
    });

    const raw = response.choices[0]?.message?.content || '{}';

    // Strip markdown code fences if model wraps response
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // If parse fails, return a graceful degraded response
      console.error('[Vision] JSON parse error, raw response:', raw);
      return res.json({
        detected: false,
        game: null,
        type: null,
        item: null,
        wear: null,
        float: null,
        rank: null,
        level: null,
        hoursPlayed: null,
        skinsOwned: null,
        estimatedPrice: null,
        confidence: 'low',
        description: 'Could not parse the AI response. Please try again with a clearer screenshot.',
        tags: [],
      });
    }

    return res.json(result);
  } catch (err) {
    console.error('[Groq Vision Error]:', err);

    if (err.status === 401 || (err.message && err.message.includes('API key'))) {
      return res.status(503).json({
        error: 'Vision AI is offline. Please check your GROQ_API_KEY in server/.env',
      });
    }

    if (err.message && err.message.includes('model')) {
      return res.status(503).json({
        error: 'Vision model unavailable. Please try again later.',
      });
    }

    return res.status(500).json({
      error: 'Failed to analyze image: ' + (err.message || String(err)),
    });
  }
});

// POST /api/vision/chat
// Body: { message, visionContext, history }
router.post('/chat', requireAuth, async (req, res) => {
  const { message, visionContext, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required.' });
  }

  // Build a rich system prompt from the analysis result
  let contextBlock = 'No screenshot has been analyzed yet. The user is asking a general gaming question.';
  if (visionContext && visionContext.detected) {
    const ctx = visionContext;
    const lines = [
      `Game: ${ctx.game ?? 'Unknown'}`,
      `Type: ${ctx.type ?? 'Unknown'}`,
      ctx.item        ? `Item/Skin: ${ctx.item}` : null,
      ctx.wear        ? `Wear: ${ctx.wear}` : null,
      ctx.float       ? `Float: ${ctx.float}` : null,
      ctx.rank        ? `Rank: ${ctx.rank}` : null,
      ctx.level != null ? `Level: ${ctx.level}` : null,
      ctx.hoursPlayed != null ? `Hours played: ${ctx.hoursPlayed}h` : null,
      ctx.skinsOwned  != null ? `Skins owned: ${ctx.skinsOwned}` : null,
      ctx.estimatedPrice != null ? `Estimated price: $${ctx.estimatedPrice}` : null,
      `Confidence: ${ctx.confidence}`,
      `Description: ${ctx.description}`,
      ctx.tags?.length ? `Tags: ${ctx.tags.join(', ')}` : null,
    ].filter(Boolean);
    contextBlock = `The user has uploaded and analyzed a gaming screenshot. Here is what the AI detected:\n${lines.join('\n')}`;
  }

  const systemPrompt = `You are a helpful gaming assistant with Computer Vision capabilities. You help users understand their game screenshots, discuss pricing, trading tips, and game-related advice.

${contextBlock}

Respond conversationally and helpfully. Be concise. If you don't know something specific, say so honestly. 
When discussing prices, remind users that market prices fluctuate and to verify on Steam Market or Buff163 for CS2 items.
For Valorant, LoL, Apex, and other non-tradeable games, remind users that skins are account-bound.`;

  // Build message history
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 512,
    });

    const reply = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    return res.json({ reply });
  } catch (err) {
    console.error('[Vision Chat Error]:', err);
    return res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

module.exports = router;
