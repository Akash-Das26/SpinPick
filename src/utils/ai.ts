/* ==========================================================================
   AI Decision Engine Service
   Tries: 1) Gemini AI (browser) → 2) OpenRouter proxy (server) → 3) Offline
   ========================================================================== */

import { WheelItem } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const OPENROUTER_PROXY_URL = (import.meta.env.VITE_OPENROUTER_PROXY_URL || '').replace(/\/+$/, '');

export interface AiGeneratedOption {
  label: string;
  desc: string;
  weight: number;
}

export interface AiGenerationResult {
  options: AiGeneratedOption[];
  recommendedIndex: number;
  reasoning: string;
  actionSteps: string[];
}

interface AiConfig {
  modelName?: string;
  optionCount?: number;
}

// Cryptographically secure helpers
function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  const randArr = new Uint32Array(result.length);
  crypto.getRandomValues(randArr);
  for (let i = result.length - 1; i > 0; i--) {
    const j = randArr[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function secureRandomInt(max: number): number {
  if (max <= 0) return 0;
  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  return rand[0] % max;
}

// ─── Gemini AI Backend ─────────────────────────────────────────────────

async function callGemini(prompt: string, optionCount: number): Promise<AiGenerationResult> {
  const { GoogleGenAI } = await import('@google/genai');
  const genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const systemInstruction = `You are SpinPick AI, a sharp, creative decision assistant.
Given a user's prompt, generate exactly ${optionCount} distinct, high-quality, creative choices for a decision wheel.
Also select the best single choice as the recommended winner, and explain WHY it's ideal right now with 3 actionable next steps.

Rules:
- Each option must be unique, specific, and actionable
- Make descriptions vivid and enticing (1 sentence each)
- The recommended winner should be the most compelling choice
- Return ONLY valid JSON, absolutely no markdown or code fences

Return format:
{
  "options": [
    { "label": "Option Title", "desc": "Vivid 1-sentence description", "weight": 1 }
  ],
  "recommendedIndex": 0,
  "reasoning": "A compelling 2-sentence explanation of why this winner stands out.",
  "actionSteps": [
    "Step 1: First actionable step",
    "Step 2: Second actionable step",
    "Step 3: Third actionable step"
  ]
}`;

  const response = await genai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: prompt,
    config: {
      systemInstruction,
      temperature: 0.8,
      maxOutputTokens: 2048,
    },
  });

  const text = response.text || '';
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
    throw new Error('Gemini returned no options');
  }

  return {
    options: parsed.options.map((opt: any) => ({
      label: String(opt.label || 'Untitled'),
      desc: String(opt.desc || ''),
      weight: Math.max(1, Math.min(10, Number(opt.weight) || 1)),
    })),
    recommendedIndex: Math.max(0, Math.min(Number(parsed.recommendedIndex) || 0, parsed.options.length - 1)),
    reasoning: String(parsed.reasoning || ''),
    actionSteps: Array.isArray(parsed.actionSteps) ? parsed.actionSteps : [],
  };
}

// ─── OpenRouter Backend (via server proxy) ─────────────────────────────

interface OpenRouterResponse {
  choices: Array<{ message: { content: string } }>;
}

async function callOpenRouter(
  prompt: string,
  optionCount: number,
  modelName: string
): Promise<AiGenerationResult> {
  const systemPrompt = `You are SpinPick AI, a sharp, creative decision assistant.
Given a user prompt: "${prompt}", generate exactly ${optionCount} distinct, high-quality, creative choices for the wheel.
Also select the best single choice as the recommended winner, and explain WHY it's ideal right now with 3 actionable next steps.

Return strictly valid JSON with no markdown formatting:
{
  "options": [
    { "label": "Option Title 1", "desc": "Short 1-sentence vibrant detail", "weight": 1 }
  ],
  "recommendedIndex": 0,
  "reasoning": "A compelling 2-sentence explanation of why this winner stands out.",
  "actionSteps": [
    "Step 1: First action to take",
    "Step 2: Second action to take",
    "Step 3: Third action to take"
  ]
}`;

  const response = await fetch(`${OPENROUTER_PROXY_URL}/api/openrouter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error: ${response.status} - ${error}`);
  }

  const data: OpenRouterResponse = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenRouter');

  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
    throw new Error('OpenRouter returned no options');
  }

  return {
    options: parsed.options.map((opt: any) => ({
      label: String(opt.label || 'Untitled'),
      desc: String(opt.desc || ''),
      weight: Math.max(1, Math.min(10, Number(opt.weight) || 1)),
    })),
    recommendedIndex: Math.max(0, Math.min(Number(parsed.recommendedIndex) || 0, parsed.options.length - 1)),
    reasoning: String(parsed.reasoning || ''),
    actionSteps: Array.isArray(parsed.actionSteps) ? parsed.actionSteps : [],
  };
}

// ─── Offline Fallback ──────────────────────────────────────────────────

function generateOfflineFallback(prompt: string, optionCount: number): AiGenerationResult {
  const q = prompt.toLowerCase();
  const promptSnippet = prompt.slice(0, 25);

  const categories: Array<{ keywords: string[]; options: Array<{ label: string; desc: string }> }> = [
    {
      keywords: ['cook', 'eat', 'dinner', 'food', 'lunch', 'meal', 'breakfast', 'snack', 'hungry', 'restaurant'],
      options: [
        { label: 'Sheet-Pan Garlic Fajitas', desc: 'Sizzling bell peppers, onions, & seasoned protein served with warm tortillas.' },
        { label: 'Truffle Mushroom Risotto', desc: 'Creamy arborio rice with sauteed cremini mushrooms and fresh parmesan.' },
        { label: 'Spicy Salmon Poke Bowl', desc: 'Fresh salmon cubes, edamame, avocado, and sriracha mayo over jasmine rice.' },
        { label: 'Artisanal Neapolitan Pizza', desc: 'Wood-fired crispy dough with fresh mozzarella, basil, and San Marzano sauce.' },
        { label: 'Thai Green Curry Bowl', desc: 'Fragrant coconut curry with lemongrass, bamboo shoots, and Thai basil.' },
        { label: 'Classic Wagyu Smash Burgers', desc: 'Double thin patties, melted cheddar, caramelized onions, & house sauce.' },
        { label: 'Korean Bibimbap Bowl', desc: 'Crispy rice topped with seasoned vegetables, gochujang, and a fried egg.' },
        { label: 'Homemade Pasta Carbonara', desc: 'Al dente spaghetti with pancetta, egg yolk, pecorino, and black pepper.' },
      ],
    },
    {
      keywords: ['travel', 'trip', 'vacation', 'weekend', 'getaway', 'holiday', 'visit'],
      options: [
        { label: 'Coastal Cliffside Retreat', desc: 'A scenic drive to a quiet ocean cabin with sunset views.' },
        { label: 'Mountain Cabin & Hiking Trail', desc: 'Crisp pine air, cozy fireplace, and morning summit hikes.' },
        { label: 'Lakeside Kayak Getaway', desc: 'Peaceful water sports, campfire smores, and starlit night skies.' },
        { label: 'Vineyard Tasting Escape', desc: 'Rolling hills, artisanal cheese pairings, and private winery tours.' },
        { label: 'Island Hopping Adventure', desc: 'Crystal-clear waters, snorkeling, and fresh seafood on white sand.' },
        { label: 'Desert Glamping Experience', desc: 'Stargazing from a luxury tent with sunrise camel rides.' },
      ],
    },
    {
      keywords: ['project', 'build', 'code', 'work', 'app', 'software', 'hack', 'develop'],
      options: [
        { label: 'AI Voice Command Assistant', desc: 'Build a Web Speech API tool for browser voice navigation.' },
        { label: 'Realtime Micro-Kanban Board', desc: 'A minimalist drag-and-drop workspace with offline sync.' },
        { label: 'Interactive Shader Canvas', desc: 'Generative WebGL visualizers reacting to music audio.' },
        { label: 'CLI Developer Productivity Tool', desc: 'A terminal tool to automate daily dev workflows.' },
        { label: 'Personal Knowledge Graph UI', desc: 'A node-link visual graph of your markdown notes.' },
        { label: 'Automated Report Generator', desc: 'PDF/chart builder that pulls data from APIs.' },
      ],
    },
    {
      keywords: ['movie', 'watch', 'film', 'show', 'series', 'netflix', 'stream'],
      options: [
        { label: 'Neon Cyberpunk Sci-Fi Thriller', desc: 'High-budget visual masterpiece with mind-bending synth score.' },
        { label: 'Intense Psychological Drama', desc: 'Edge-of-your-seat acting duel with a twist ending.' },
        { label: 'Witty Ensemble Indie Comedy', desc: 'Charming dialog-heavy story about quirky friends.' },
        { label: 'Gripping Mystery Detective Whodunit', desc: 'Atmospheric crime puzzle in a rainy coastal mansion.' },
        { label: 'Epic Historical Action Odyssey', desc: 'Breathtaking battle choreography and sweeping soundtrack.' },
        { label: 'Heartwarming Animated Adventure', desc: 'Visually stunning journey with emotional depth.' },
      ],
    },
  ];

  let selected = categories.find((c) => c.keywords.some((k) => q.includes(k)));
  const base = selected?.options || [
    { label: `Deep-Dive: "${promptSnippet}"`, desc: 'Go all-in with full commitment and research.' },
    { label: 'The Quick Start Approach', desc: 'Jump right in with minimal planning and iterate.' },
    { label: 'The Collaborative Route', desc: 'Ask a friend or colleague to help decide together.' },
    { label: 'The Random Wildcard', desc: 'Let pure chance decide — no overthinking.' },
    { label: 'The Minimalist Choice', desc: 'Pick the simplest option that works.' },
    { label: 'The Bold Creative Spin', desc: 'Take an unconventional approach nobody expects.' },
    { label: 'The Strategic Wait', desc: 'Gather more info before committing.' },
    { label: 'The Gut Instinct Pick', desc: 'First thought, best thought — trust your intuition.' },
  ];

  const rawOptions = secureShuffle(base).slice(0, Math.max(2, optionCount));
  const options: AiGeneratedOption[] = rawOptions.map((opt) => ({ label: opt.label, desc: opt.desc, weight: 1 }));
  const winnerIndex = secureRandomInt(options.length);
  const winner = options[winnerIndex];

  return {
    options,
    recommendedIndex: winnerIndex,
    reasoning: `SpinPick evaluated "${prompt}" and identified "${winner.label}" as the highest-momentum choice. ${winner.desc}`,
    actionSteps: [
      `Commit to "${winner.label}" for the next 60 minutes without second-guessing.`,
      'Gather whatever tools or materials you need right now.',
      'Share your decision with a friend to stay accountable.',
    ],
  };
}

// ─── Public API — tries Gemini → OpenRouter → Offline ──────────────────

export async function generateAiOptions(
  prompt: string,
  config: AiConfig = {}
): Promise<AiGenerationResult> {
  const { modelName = 'openrouter/auto', optionCount = 8 } = config;

  // 1. Try Gemini AI (browser-side, no server needed)
  if (GEMINI_API_KEY) {
    try {
      const result = await callGemini(prompt, optionCount);
      if (result.options.length > 0) {
        console.log('[AI] Used Gemini backend');
        return result;
      }
    } catch (err) {
      console.warn('[AI] Gemini failed, trying OpenRouter proxy:', err);
    }
  }

  // 2. Try OpenRouter proxy (server-side, keeps key secure)
  if (OPENROUTER_PROXY_URL) {
    try {
      const result = await callOpenRouter(prompt, optionCount, modelName);
      if (result.options.length > 0) {
        console.log('[AI] Used OpenRouter proxy backend');
        return result;
      }
    } catch (err) {
      console.warn('[AI] OpenRouter proxy failed, using offline engine:', err);
    }
  }

  // 3. Offline fallback
  console.log('[AI] Using offline fallback engine');
  return generateOfflineFallback(prompt, optionCount);
}

/**
 * Convert AI generation results into WheelItems with theme colors.
 */
export function aiResultToWheelItems(
  result: AiGenerationResult,
  sliceColors: string[]
): Array<Omit<WheelItem, 'id'>> {
  return result.options.map((opt, i) => ({
    text: opt.label,
    color: sliceColors[i % sliceColors.length],
    weight: opt.weight || 1,
    enabled: true,
    icon: undefined,
    imageUrl: undefined,
    note: opt.desc,
  }));
}
