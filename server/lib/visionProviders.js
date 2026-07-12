// Vision AI providers — Groq, Google Gemini, or local Ollama (Gemma 4)
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct';
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.0-flash';
const GEMINI_CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || GEMINI_VISION_MODEL;
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'gemma4:26b';
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || OLLAMA_VISION_MODEL;
const FETCH_TIMEOUT_MS = 120_000; // local vision can take a while on first load

const PROVIDER_IDS = ['ollama', 'groq', 'gemini'];

function isOllamaEnabled() {
  return process.env.OLLAMA_ENABLED === 'true';
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getOllamaRuntimeStatus() {
  if (!isOllamaEnabled()) {
    return { running: false, modelPulled: false, models: [] };
  }

  try {
    const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/tags`, { timeout: 5000 });
    if (!res.ok) return { running: false, modelPulled: false, models: [] };

    const data = await res.json();
    const names = (data.models || []).map((m) => m.name);
    const baseName = OLLAMA_VISION_MODEL.split(':')[0];
    const modelPulled = names.some(
      (n) => n === OLLAMA_VISION_MODEL || n.startsWith(`${baseName}:`) || n.startsWith(`${OLLAMA_VISION_MODEL}:`),
    );

    return { running: true, modelPulled, models: names };
  } catch {
    return { running: false, modelPulled: false, models: [] };
  }
}

function getAvailableProviders() {
  const providers = [];

  if (isOllamaEnabled()) {
    providers.push({
      id: 'ollama',
      label: `Ollama local (${OLLAMA_VISION_MODEL})`,
      shortLabel: 'Gemma 4 (local)',
      model: OLLAMA_VISION_MODEL,
      local: true,
    });
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push({
      id: 'gemini',
      label: `Gemini (${GEMINI_VISION_MODEL})`,
      shortLabel: 'Gemini 2.0 Flash',
      model: GEMINI_VISION_MODEL,
    });
  }

  if (process.env.GROQ_API_KEY) {
    providers.push({
      id: 'groq',
      label: `Groq (${GROQ_VISION_MODEL})`,
      shortLabel: 'Groq Llama 4 Scout',
      model: GROQ_VISION_MODEL,
    });
  }

  return providers;
}

function resolveVisionProvider(requested) {
  const available = getAvailableProviders();
  if (!available.length) return null;

  const ids = available.map((p) => p.id);
  const req = requested && String(requested).toLowerCase();

  if (PROVIDER_IDS.includes(req)) {
    return ids.includes(req) ? req : null;
  }

  const configured = (process.env.VISION_PROVIDER || 'auto').toLowerCase();
  if (configured !== 'auto' && ids.includes(configured)) return configured;

  // auto: prefer local Ollama (no rate limits), then Groq, then Gemini
  if (ids.includes('ollama')) return 'ollama';
  if (ids.includes('groq')) return 'groq';
  if (ids.includes('gemini')) return 'gemini';
  return ids[0];
}

function getVisionProviderLabel(provider) {
  const p = provider || resolveVisionProvider();
  if (p === 'ollama') return `Ollama Gemma 4 (${OLLAMA_VISION_MODEL})`;
  if (p === 'gemini') return `Gemini (${GEMINI_VISION_MODEL})`;
  if (p === 'groq') return `Groq (${GROQ_VISION_MODEL})`;
  return 'none';
}

async function analyzeWithOllama({ systemPrompt, userPrompt, imageBase64, maxTokens = 800 }) {
  const runtime = await getOllamaRuntimeStatus();
  if (!runtime.running) {
    const err = new Error('OLLAMA_NOT_RUNNING');
    err.status = 503;
    throw err;
  }
  if (!runtime.modelPulled) {
    const err = new Error(`OLLAMA_MODEL_MISSING:${OLLAMA_VISION_MODEL}`);
    err.status = 503;
    throw err;
  }

  const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_VISION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: userPrompt,
          images: [imageBase64],
        },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: maxTokens },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Ollama error ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.message?.content || '{}';
}

async function analyzeWithGroq({ systemPrompt, userPrompt, imageBase64, mimeType, maxTokens = 800 }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: maxTokens,
  });
  return response.choices[0]?.message?.content || '{}';
}

async function analyzeWithGemini({ systemPrompt, userPrompt, imageBase64, mimeType, maxTokens = 800 }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_VISION_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType, data: imageBase64 } },
    { text: userPrompt },
  ]);

  return result.response.text() || '{}';
}

async function chatWithOllama({ systemPrompt, messages }) {
  const runtime = await getOllamaRuntimeStatus();
  if (!runtime.running) {
    const err = new Error('OLLAMA_NOT_RUNNING');
    err.status = 503;
    throw err;
  }

  const ollamaMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  const res = await fetchWithTimeout(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_CHAT_MODEL,
      messages: ollamaMessages,
      stream: false,
      options: { temperature: 0.7, num_predict: 512 },
    }),
    timeout: 60_000,
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Ollama chat error ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return data.message?.content || 'Sorry, I could not generate a response.';
}

async function chatWithGroq({ systemPrompt, messages }) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const response = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    temperature: 0.7,
    max_tokens: 512,
  });
  return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
}

async function chatWithGemini({ systemPrompt, messages }) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_CHAT_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const last = messages[messages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(last.content);
  return result.response.text() || 'Sorry, I could not generate a response.';
}

async function analyzeScreenshot(opts) {
  const provider = resolveVisionProvider(opts.provider);
  if (!provider) {
    if (opts.provider) throw new Error('PROVIDER_UNAVAILABLE');
    throw new Error('NO_VISION_PROVIDER');
  }
  if (provider === 'ollama') return analyzeWithOllama(opts);
  if (provider === 'gemini') return analyzeWithGemini(opts);
  return analyzeWithGroq(opts);
}

async function visionChat(opts) {
  const provider = resolveVisionProvider(opts.provider);
  if (!provider) {
    if (opts.provider) throw new Error('PROVIDER_UNAVAILABLE');
    throw new Error('NO_VISION_PROVIDER');
  }
  if (provider === 'ollama') return chatWithOllama(opts);
  if (provider === 'gemini') return chatWithGemini(opts);
  return chatWithGroq(opts);
}

module.exports = {
  getAvailableProviders,
  getOllamaRuntimeStatus,
  resolveVisionProvider,
  getVisionProviderLabel,
  analyzeScreenshot,
  visionChat,
};
