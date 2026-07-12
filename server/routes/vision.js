// routes/vision.js — Computer Vision via Groq or Google Gemini
const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { lookupCs2MarketPrice } = require('../lib/cs2Market');
const { getCandidates, canonicalSkinName } = require('../lib/cs2Catalog');
const { candidatesForWeapons, findSkin, valueInventory } = require('../lib/valorantCatalog');
const {
  getAvailableProviders,
  getOllamaRuntimeStatus,
  resolveVisionProvider,
  getVisionProviderLabel,
  analyzeScreenshot,
  visionChat,
} = require('../lib/visionProviders');

const router = express.Router();

const EMPTY_RESULT = {
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
};

const SYSTEM_PROMPT = `You are a Computer Vision AI specialized in gaming screenshots.
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

For a Valorant collection/loadout/inventory screenshot, set type to "account" and populate "valorantInventory" with every visible weapon and your best skin-name guess. Do not put the inventory in the singular "item" field.

For CS2 skins, set "item" to the exact Steam market hash base name when possible, e.g. "AK-47 | Redline" (include StatTrak™ or ★ prefix if visible). Use standard wear tier names in "wear".

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
  "tags": ["array", "of", "relevant", "keywords"],
  "valorantInventory": [{"weapon":"Vandal","skin":"best initial guess","confidence":"high|medium|low"}]
}

If the image is not a gaming screenshot or you cannot identify any game content, set "detected": false and explain in "description" what the image actually shows.`;

function parseVisionJson(raw) {
  const cleaned = String(raw || '{}')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function refineCs2Skin({ initialResult, imageBase64, mimeType, provider }) {
  const candidates = await getCandidates(initialResult.item);
  if (!candidates.length) {
    return { ...initialResult, item: null, wear: null, float: null, confidence: 'low', catalogVerified: false };
  }

  const systemPrompt = `You are the verification stage of a CS2 skin classifier.
Choose the visible skin ONLY from the supplied catalogue candidates. Never invent a name.
Inspect the weapon artwork, colors, motifs, and layout. The first-stage guess may be wrong.
Wear and float are metadata, not reliably visible from artwork. Return them only when explicit UI text in the screenshot shows them.
Respond with JSON only using this schema:
{"item":"exact candidate or null","wear":"Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred|null","float":"visible numeric text or null","confidence":"high|medium|low","reason":"short visual reason"}`;
  const userPrompt = `First-stage guess: ${initialResult.item || 'unknown'}.
Allowed candidates for this weapon:
${candidates.map(name => `- ${name}`).join('\n')}
Select the closest exact candidate based only on the screenshot. If none is defensible, return null.`;

  try {
    const raw = await analyzeScreenshot({
      systemPrompt,
      userPrompt,
      imageBase64,
      mimeType,
      provider,
    });
    const refined = parseVisionJson(raw);
    const canonical = await canonicalSkinName(refined.item);
    if (!canonical || !candidates.includes(canonical)) {
      return { ...initialResult, item: null, wear: null, float: null, confidence: 'low', catalogVerified: false };
    }
    return {
      ...initialResult,
      item: canonical,
      wear: refined.wear || null,
      float: refined.float || null,
      confidence: refined.confidence || 'medium',
      catalogVerified: true,
      verificationReason: refined.reason || null,
      firstStageItem: initialResult.item || null,
    };
  } catch (error) {
    console.error('[Vision] CS2 verification pass failed:', error.message);
    const canonical = await canonicalSkinName(initialResult.item);
    return {
      ...initialResult,
      item: canonical,
      wear: null,
      float: null,
      confidence: canonical ? 'medium' : 'low',
      catalogVerified: !!canonical,
    };
  }
}

async function refineValorantInventory({ initialResult, imageBase64, mimeType, provider }) {
  const initialRows = Array.isArray(initialResult.valorantInventory)
    ? initialResult.valorantInventory.filter(row => row?.weapon)
    : [];
  if (!initialRows.length) return { ...initialResult, valorantInventory: [], catalogVerified: false };

  let grouped;
  try {
    grouped = await candidatesForWeapons(initialRows.map(row => row.weapon));
  } catch (error) {
    console.error('[Vision] Valorant catalogue unavailable:', error.message);
    return { ...initialResult, valorantInventory: initialRows, catalogVerified: false };
  }
  if (!Object.keys(grouped).length) return { ...initialResult, valorantInventory: [], catalogVerified: false };

  const candidateText = Object.entries(grouped)
    .map(([weapon, skins]) => `${weapon}:\n${skins.map(name => `- ${name}`).join('\n')}`)
    .join('\n\n');
  const systemPrompt = `You verify a Valorant collection screenshot against an authoritative skin catalogue.
For each visible weapon tile, select exactly one skin from that weapon's allowed list. Never invent names.
Use the weapon model, colors, silhouette, effects and artwork. Omit tiles you cannot identify defensibly.
Return JSON only: {"skins":[{"weapon":"exact weapon heading","skin":"exact allowed candidate","confidence":"high|medium|low"}]}`;
  const userPrompt = `Initial guesses (may be wrong): ${JSON.stringify(initialRows)}

Allowed catalogue candidates:
${candidateText}

Re-check the screenshot and return all visible skins you can verify.`;

  try {
    const raw = await analyzeScreenshot({
      systemPrompt,
      userPrompt,
      imageBase64,
      mimeType,
      provider,
      maxTokens: 2400,
    });
    const refined = parseVisionJson(raw);
    const verified = [];
    for (const row of Array.isArray(refined.skins) ? refined.skins : []) {
      const match = await findSkin(row.weapon, row.skin);
      if (!match) continue;
      verified.push({
        weapon: match.weapon,
        skin: match.name,
        tier: match.tier,
        icon: match.icon,
        confidence: row.confidence || 'medium',
      });
    }
    const unique = [...new Map(verified.map(row => [row.weapon, row])).values()];
    const valuation = valueInventory(unique);
    return {
      ...initialResult,
      type: 'account',
      item: null,
      wear: null,
      float: null,
      estimatedPrice: null,
      valorantInventory: valuation.skins,
      valorantTotalVpMin: valuation.totalVpMin,
      valorantTotalVpMax: valuation.totalVpMax,
      replacementValueUsd: valuation.replacementValueUsd,
      catalogVerified: unique.length > 0,
      confidence: unique.length >= Math.max(3, initialRows.length * 0.6) ? 'high' : unique.length ? 'medium' : 'low',
    };
  } catch (error) {
    console.error('[Vision] Valorant verification pass failed:', error.message);
    return { ...initialResult, valorantInventory: [], catalogVerified: false, confidence: 'low' };
  }
}

function providerConfigError() {
  if (getAvailableProviders().length) return null;
  return {
    status: 503,
    error:
      'Vision AI is offline. Add GEMINI_API_KEY or GROQ_API_KEY to server/.env.',
  };
}

// GET /api/vision/status — available models and default
router.get('/status', requireAuth, async (_req, res) => {
  const providers = getAvailableProviders();
  const defaultProvider = resolveVisionProvider();
  const configured = (process.env.VISION_PROVIDER || 'auto').toLowerCase();
  const ollama = await getOllamaRuntimeStatus();

  if (!providers.length) {
    return res.json({
      online: false,
      provider: null,
      defaultProvider: null,
      label: null,
      configured,
      providers: [],
      ollama,
      message: providerConfigError().error,
    });
  }

  const enrichedProviders = providers.map((p) =>
    p.id === 'ollama'
      ? {
          ...p,
          ollamaRunning: ollama.running,
          ollamaModelPulled: ollama.modelPulled,
          ready: ollama.running && ollama.modelPulled,
        }
      : { ...p, ready: true },
  );

  const online = enrichedProviders.some((p) => p.ready);

  return res.json({
    online,
    provider: defaultProvider,
    defaultProvider,
    label: getVisionProviderLabel(defaultProvider),
    configured,
    providers: enrichedProviders,
    ollama,
  });
});

// POST /api/vision/analyze
router.post('/analyze', requireAuth, async (req, res) => {
  const configErr = providerConfigError();
  if (configErr) return res.status(configErr.status).json({ error: configErr.error });

  const { imageBase64, mimeType = 'image/jpeg', context, provider: requestedProvider } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required.' });
  }

  if (imageBase64.length > 14_000_000) {
    return res.status(400).json({ error: 'Image too large. Please use an image under 10MB.' });
  }

  const userPrompt = context
    ? `Analyze this gaming screenshot. Context from user: "${context}". Extract all relevant gaming information.`
    : 'Analyze this gaming screenshot. Extract all relevant gaming information including game name, item/skin details, player rank, stats, and estimated market price if applicable.';

  try {
    const raw = await analyzeScreenshot({
      systemPrompt: SYSTEM_PROMPT,
      userPrompt,
      imageBase64,
      mimeType,
      provider: requestedProvider,
      maxTokens: 1800,
    });

    let result;
    try {
      result = parseVisionJson(raw);
    } catch {
      console.error('[Vision] JSON parse error, raw response:', raw);
      return res.json(EMPTY_RESULT);
    }

    const usedProvider = resolveVisionProvider(requestedProvider);
    result.visionProvider = getVisionProviderLabel(usedProvider);

    if (result.detected && result.game === 'CS2' && result.type === 'skin' && result.item) {
      result = await refineCs2Skin({
        initialResult: result,
        imageBase64,
        mimeType,
        provider: requestedProvider,
      });
      result.visionProvider = getVisionProviderLabel(usedProvider);
    }

    if (result.detected && result.game === 'Valorant' && Array.isArray(result.valorantInventory)) {
      result = await refineValorantInventory({
        initialResult: result,
        imageBase64,
        mimeType,
        provider: requestedProvider,
      });
      result.visionProvider = getVisionProviderLabel(usedProvider);
    }

    if (
      result.detected &&
      result.game === 'CS2' &&
      result.type === 'skin' &&
      result.item
    ) {
      try {
        const market = await lookupCs2MarketPrice(result.item, result.wear);
        if (market) {
          result.aiEstimatedPrice = result.estimatedPrice ?? null;
          result.marketPrice = market.lowestPrice ?? market.medianPrice;
          result.marketPriceMedian = market.medianPrice;
          result.marketVolume = market.volume;
          result.marketHashName = market.marketHashName;
          result.priceSource = market.priceSource;
          result.marketFetchedAt = market.fetchedAt;
          if (result.marketPrice != null) {
            result.estimatedPrice = result.marketPrice;
            result.priceVerified = true;
          }
        } else {
          result.estimatedPrice = null;
          result.priceVerified = false;
        }
      } catch (err) {
        console.error('[Vision] CS2 market lookup failed:', err.message);
        result.estimatedPrice = null;
        result.priceVerified = false;
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('[Vision Analyze Error]:', err);

    if (err.message === 'NO_VISION_PROVIDER') {
      return res.status(503).json({ error: providerConfigError().error });
    }

    if (err.message === 'PROVIDER_UNAVAILABLE') {
      return res.status(400).json({
        error: 'Selected model is not available. Check API keys in server/.env.',
      });
    }

    if (err.message === 'OLLAMA_NOT_RUNNING') {
      return res.status(503).json({
        error:
          'Ollama is not running. Install from https://ollama.com/download, start Ollama, then run: ollama pull gemma4:26b',
      });
    }

    if (err.message && err.message.startsWith('OLLAMA_MODEL_MISSING:')) {
      const model = err.message.split(':').slice(1).join(':');
      return res.status(503).json({
        error: `Gemma 4 not downloaded yet. In a terminal run: ollama pull ${model}`,
      });
    }

    if (err.status === 401 || (err.message && err.message.includes('API key'))) {
      const keyHint =
        resolveVisionProvider() === 'gemini'
          ? 'GEMINI_API_KEY in server/.env'
          : 'GROQ_API_KEY in server/.env';
      return res.status(503).json({ error: `Vision AI auth failed. Check your ${keyHint}.` });
    }

    if (
      err.status === 429 ||
      (err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RATE_LIMIT')))
    ) {
      return res.status(429).json({
        error:
          'Gemini free-tier rate limit reached. Wait a minute and try again, switch to Groq in the Model dropdown, or enable billing in Google AI Studio.',
      });
    }

    return res.status(500).json({
      error: 'Failed to analyze image: ' + (err.message || String(err)),
    });
  }
});

// POST /api/vision/chat
router.post('/chat', requireAuth, async (req, res) => {
  const configErr = providerConfigError();
  if (configErr) return res.status(configErr.status).json({ error: configErr.error });

  const { message, visionContext, history = [], provider: requestedProvider } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required.' });
  }

  let contextBlock = 'No screenshot has been analyzed yet. The user is asking a general gaming question.';
  if (visionContext && visionContext.detected) {
    const ctx = visionContext;
    const lines = [
      `Game: ${ctx.game ?? 'Unknown'}`,
      `Type: ${ctx.type ?? 'Unknown'}`,
      ctx.item ? `Item/Skin: ${ctx.item}` : null,
      ctx.wear ? `Wear: ${ctx.wear}` : null,
      ctx.float ? `Float: ${ctx.float}` : null,
      ctx.rank ? `Rank: ${ctx.rank}` : null,
      ctx.level != null ? `Level: ${ctx.level}` : null,
      ctx.hoursPlayed != null ? `Hours played: ${ctx.hoursPlayed}h` : null,
      ctx.skinsOwned != null ? `Skins owned: ${ctx.skinsOwned}` : null,
      ctx.estimatedPrice != null ? `Estimated price: $${ctx.estimatedPrice}` : null,
      ctx.marketPrice != null ? `Steam Market lowest: $${ctx.marketPrice}` : null,
      ctx.marketPriceMedian != null ? `Steam Market median: $${ctx.marketPriceMedian}` : null,
      ctx.marketHashName ? `Steam market hash: ${ctx.marketHashName}` : null,
      ctx.marketVolume != null ? `Steam 24h volume: ${ctx.marketVolume}` : null,
      ctx.catalogVerified != null ? `Skin catalogue verified: ${ctx.catalogVerified ? 'yes' : 'no'}` : null,
      ctx.priceVerified != null ? `Steam price verified: ${ctx.priceVerified ? 'yes' : 'no'}` : null,
      Array.isArray(ctx.valorantInventory) && ctx.valorantInventory.length
        ? `Verified Valorant inventory:\n${ctx.valorantInventory.map(s => `- ${s.weapon}: ${s.skin} (${s.tier}, ${s.estimatedVp?.min ?? 0}-${s.estimatedVp?.max ?? 0} VP)`).join('\n')}`
        : null,
      ctx.valorantTotalVpMin != null ? `Valorant replacement VP range: ${ctx.valorantTotalVpMin}-${ctx.valorantTotalVpMax} VP` : null,
      ctx.replacementValueUsd ? `Estimated replacement cost: $${ctx.replacementValueUsd.min}-$${ctx.replacementValueUsd.max} USD` : null,
      ctx.aiEstimatedPrice != null && ctx.marketPrice != null
        ? `AI price guess (before market lookup): $${ctx.aiEstimatedPrice}`
        : null,
      `Confidence: ${ctx.confidence}`,
      `Description: ${ctx.description}`,
      ctx.tags?.length ? `Tags: ${ctx.tags.join(', ')}` : null,
    ].filter(Boolean);
    contextBlock = `The user has uploaded and analyzed a gaming screenshot. Here is what the AI detected:\n${lines.join('\n')}`;
  }

  const systemPrompt = `You are a helpful gaming assistant with Computer Vision capabilities. You help users understand their game screenshots, discuss pricing, trading tips, and game-related advice.

${contextBlock}

Respond conversationally and helpfully. Be concise. If you don't know something specific, say so honestly.
When discussing prices, prefer Steam Community Market data when present in the context above. Remind users that Buff163 and third-party markets may differ. Market prices fluctuate — verify before trading.
For CS2 screenshots, never invent or estimate a price. Quote a price only when "Steam price verified: yes" and a Steam Market value are present above. Otherwise say that no verified live price was found.
Never contradict the catalogue-verified skin name from the screenshot context. If catalogue verification failed, explain that the skin could not be confirmed instead of guessing.
For Valorant, describe monetary figures only as estimated replacement cost, never resale value. Valorant cosmetics are account-bound and the estimate excludes reliable pricing for battle-pass/unclassified skins.
For Valorant, LoL, Apex, and other non-tradeable games, remind users that skins are account-bound.`;

  const messages = [
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  try {
    const reply = await visionChat({ systemPrompt, messages, provider: requestedProvider });
    return res.json({ reply });
  } catch (err) {
    console.error('[Vision Chat Error]:', err);
    if (err.message === 'PROVIDER_UNAVAILABLE') {
      return res.status(400).json({
        error: 'Selected model is not available. Check API keys in server/.env.',
      });
    }
    if (err.message === 'OLLAMA_NOT_RUNNING') {
      return res.status(503).json({
        error: 'Ollama is not running. Start Ollama from https://ollama.com/download',
      });
    }
    return res.status(500).json({ error: 'Chat failed. Please try again.' });
  }
});

module.exports = router;
