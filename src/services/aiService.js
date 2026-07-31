/* ==========================================================================
   AI Decision Engine Service
   Integrates with OpenRouter API (OpenAI-compatible) + Rich Offline Fallback Engine
   ========================================================================== */

// Optional server-side proxy. When set, ALL OpenRouter calls are routed through
// the proxy so the API key never touches the browser or the JS bundle.
// See server/proxy.mjs and .env.example for setup.
const OPENROUTER_PROXY_URL = (import.meta.env.VITE_OPENROUTER_PROXY_URL || '').replace(/\/+$/, '');

// Pre-defined Vibrant Wheel Slices Color Palette Schemes
// All colors chosen for WCAG AA contrast against dark background (#141422)
// Only vibrant/light colors used — no dark colors that blend into background
export const COLOR_SCHEMES = {
  electric: ['#d8ff5b', '#a3ff12', '#38ef7d', '#00f2fe', '#ffb86c', '#ffd166', '#ff4d6d', '#b56cff'],
  cyber: ['#00f2fe', '#4facfe', '#38ef7d', '#9b59ff', '#ffb86c', '#ffd166', '#a3ff12', '#d8ff5b'],
  sunset: ['#ff4d6d', '#ff9f43', '#ffb86c', '#ffd166', '#d8ff5b', '#a3ff12', '#38ef7d', '#00f2fe'],
  emerald: ['#38ef7d', '#11998e', '#a3ff12', '#d8ff5b', '#00f2fe', '#ffb86c', '#ff4d6d', '#b56cff'],
  neon: ['#b56cff', '#ff52d9', '#00f2fe', '#d8ff5b', '#a3ff12', '#38ef7d', '#ffb86c', '#ff4d6d']
};

// Cryptographically fair Fisher-Yates array shuffle
function secureShuffle(array) {
  const result = [...array];
  const randArr = new Uint32Array(result.length);
  crypto.getRandomValues(randArr);

  for (let i = result.length - 1; i > 0; i--) {
    const j = randArr[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Cryptographically secure integer picker in [0, max)
function secureRandomInt(max) {
  if (max <= 0) return 0;
  const rand = new Uint32Array(1);
  crypto.getRandomValues(rand);
  return rand[0] % max;
}

// Sensitive advice detector
function checkDisclaimerNeeded(prompt) {
  const q = prompt.toLowerCase();
  const keywords = [
    'invest', 'stock', 'crypto', 'bitcoin', 'tax', 'money', 'budget', 'loan', 'finance', 'trading',
    'medical', 'health', 'doctor', 'symptom', 'pill', 'treatment', 'disease', 'cure',
    'legal', 'lawsuit', 'lawyer', 'contract', 'court', 'sue', 'divorce'
  ];
  return keywords.some(k => q.includes(k));
}

// Built-in Knowledge Base for offline generation
const KNOWLEDGE_BASE = {
  food: {
    dinner: [
      { label: 'Sheet-Pan Garlic Fajitas', desc: 'Sizzling bell peppers, onions, & seasoned protein served with warm tortillas.' },
      { label: 'Truffle Mushroom Risotto', desc: 'Creamy arborio rice with sauteed cremini mushrooms and fresh parmesan.' },
      { label: 'Spicy Salmon Poke Bowl', desc: 'Fresh salmon cubes, edamame, avocado, and sriracha mayo over jasmine rice.' },
      { label: 'Artisanal Neapolitan Pizza', desc: 'Wood-fired crispy dough with fresh mozzarella, basil, and San Marzano sauce.' },
      { label: 'Thai Green Curry Bowl', desc: 'Fragrant coconut curry with lemongrass, bamboo shoots, and Thai basil.' },
      { label: 'Classic Wagyu Smash Burgers', desc: 'Double thin patties, melted cheddar, caramelized onions, & house sauce.' },
      { label: 'Lemon Herb Greek Gyros', desc: 'Tender marinated lamb/chicken wrapped in pita with cool tzatziki.' },
      { label: 'Velvety Tomato & Grilled Cheese', desc: 'Thick sourdough grilled cheese served alongside rich basil tomato soup.' }
    ],
    healthy: [
      { label: 'Avocado & Quinoa Power Salad', desc: 'Superfood kale, toasted pumpkin seeds, avocado, and lemon vinaigrette.' },
      { label: 'Grilled Mediterranean Salmon', desc: 'Herb-crusted salmon with grilled asparagus and lemon quinoa.' },
      { label: 'Vietnamese Tofu Banh Mi', desc: 'Crispy baguette with lemongrass tofu, pickled daikon, and cilantro.' },
      { label: 'Sesame Cold Soba Noodles', desc: 'Buckwheat noodles tossed in ginger-sesame dressing with crunchy cucumber.' }
    ]
  },
  travel: {
    weekend: [
      { label: 'Coastal Cliffside Retreat', desc: 'A scenic 2-hour drive to a quiet ocean cabin with sunset views.' },
      { label: 'Mountain Cabin & Hiking Trail', desc: 'Crisp pine air, cozy fireplace, and morning summit hikes.' },
      { label: 'Historic Downtown Food Crawl', desc: 'Boutique hotel stay exploring hidden speakeasies and local bakeries.' },
      { label: 'Lakeside Kayak Getaway', desc: 'Peaceful water sports, campfire smores, and starlit night skies.' },
      { label: 'Vineyard Tasting Escape', desc: 'Rolling hills, artisanal cheese pairings, and private winery tours.' },
      { label: 'Hot Springs Spa Haven', desc: 'Mineral soaking pools, holistic massages, and total digital detox.' }
    ]
  },
  tech: {
    project: [
      { label: 'AI Voice Command Assistant', desc: 'Build a lightweight Web Speech API tool for browser navigation.' },
      { label: 'Realtime Micro-Kanban Board', desc: 'Craft a minimalist drag-and-drop workspace with offline sync.' },
      { label: 'Interactive Shader Canvas', desc: 'Create generative WebGL visualizers reacting to music audio.' },
      { label: 'Minimalist Micro-SaaS Landing', desc: 'Design & launch a high-converting single page product preview.' },
      { label: 'CLI Developer Productivity Tool', desc: 'Build a Rust or Node terminal tool to automate daily workflows.' },
      { label: 'Personal Knowledge Graph UI', desc: 'Implement a node-link visual graph of markdown notes.' }
    ]
  },
  entertainment: {
    movie: [
      { label: 'Neon Cyberpunk Sci-Fi Thriller', desc: 'High-budget visual masterpiece with mind-bending synth score.' },
      { label: 'Intense Psychological Drama', desc: 'Edge-of-your-seat acting duel with a twist ending you wont guess.' },
      { label: 'Witty Ensemble Indie Comedy', desc: 'Charming dialog-heavy story about quirky friends on a road trip.' },
      { label: 'Gripping Mystery Detective Whodunit', desc: 'Atmospheric crime puzzle set in a rainy coastal mansion.' },
      { label: 'Epic Historical Action Odyssey', desc: 'Breathtaking battle choreography and sweeping orchestral soundtrack.' },
      { label: 'Cerebral Time-Travel Heist', desc: 'Complex narrative puzzle requiring your full undivided attention.' }
    ]
  }
};

function buildOpenRouterMessages(prompt, optionCount) {
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
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];
}

// Parse + validate the OpenAI-compatible chat completion response
async function parseOpenRouterResponse(response, sourceLabel) {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${sourceLabel} error: ${response.status} - ${error}`);
  }
  const data = await response.json();
  const rawText = data.choices[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from OpenRouter');

  let cleanText = rawText.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  }
  return JSON.parse(cleanText);
}

// Route the request through the server-side proxy — no key leaves the server
async function callOpenRouterProxy(modelName, prompt, optionCount, apiKey) {
  const body = {
    model: modelName,
    messages: buildOpenRouterMessages(prompt, optionCount),
  };
  if (apiKey && apiKey.trim().length > 0) {
    body.apiKey = apiKey.trim();
  }

  const response = await fetch(`${OPENROUTER_PROXY_URL}/api/openrouter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  });
  return parseOpenRouterResponse(response, 'OpenRouter proxy');
}

// Format a validated AI response into wheel options + verdict
function formatAiResult(parsed, isSensitive, source) {
  const colors = COLOR_SCHEMES.electric;
  const optionsWithColor = parsed.options.map((opt, i) => ({
    id: `opt-${i}-${Date.now()}`,
    label: opt.label,
    desc: opt.desc || '',
    weight: opt.weight || 1,
    color: colors[i % colors.length]
  }));

  return {
    options: optionsWithColor,
    winnerIndex: Math.min(Math.max(0, parsed.recommendedIndex || 0), optionsWithColor.length - 1),
    reasoning: parsed.reasoning || `OpenRouter selected ${optionsWithColor[0].label}.`,
    actionSteps: parsed.actionSteps || [],
    isSensitive,
    source
  };
}

export const aiService = {
  /**
   * Generate decision options from a user prompt
   */
  generateWheelOptions: async (prompt, config = {}) => {
    const { modelName = 'openrouter/auto', optionCount = 8, apiKey } = config;
    const isSensitive = checkDisclaimerNeeded(prompt);

    // Preferred path: server-side proxy (key never in the browser).
    // Only used when VITE_OPENROUTER_PROXY_URL is configured at build time.
    if (OPENROUTER_PROXY_URL) {
      try {
        const parsed = await callOpenRouterProxy(modelName, prompt, optionCount, apiKey);
        if (Array.isArray(parsed.options) && parsed.options.length > 0) {
          return formatAiResult(parsed, isSensitive, 'OpenRouter AI (via proxy)');
        }
      } catch (err) {
        console.warn('OpenRouter proxy call failed, falling back to built-in decision engine:', err);
      }
      // fall through to offline fallback below
    }

    // Offline fallback generation
    const q = prompt.toLowerCase();
    let rawOptions = [];

    if (q.includes('cook') || q.includes('eat') || q.includes('dinner') || q.includes('food') || q.includes('lunch')) {
      rawOptions = KNOWLEDGE_BASE.food.dinner;
    } else if (q.includes('travel') || q.includes('trip') || q.includes('vacation') || q.includes('weekend')) {
      rawOptions = KNOWLEDGE_BASE.travel.weekend;
    } else if (q.includes('project') || q.includes('build') || q.includes('code') || q.includes('work')) {
      rawOptions = KNOWLEDGE_BASE.tech.project;
    } else if (q.includes('movie') || q.includes('watch') || q.includes('film') || q.includes('show')) {
      rawOptions = KNOWLEDGE_BASE.entertainment.movie;
    } else {
      rawOptions = [
        { label: `Focus on ${prompt.slice(0, 20)} Alpha`, desc: 'The most direct, immediate approach with zero delay.' },
        { label: 'The Bold Creative Route', desc: 'Take a calculated risk for maximum payoff and novelty.' },
        { label: 'The Pragmatic Choice', desc: 'Safe, low friction, and guaranteed satisfaction.' },
        { label: 'Collaborative Option', desc: 'Involve a teammate or friend to co-execute this.' },
        { label: 'The Wildcard Choice', desc: 'Unexpected angle that flips the normal process on its head.' },
        { label: 'Minimalist Streamlined Way', desc: 'Cut away fluff and do the smallest viable step.' },
        { label: 'High-Impact Masterplan', desc: 'Go all-in with total commitment.' },
        { label: 'Quick 15-Minute Sprint', desc: 'Test the waters immediately before deciding further.' }
      ];
    }

    // Cryptographically secure shuffle & slice
    const shuffled = secureShuffle(rawOptions).slice(0, Math.max(2, Number(optionCount) || 8));
    const colors = COLOR_SCHEMES.electric;
    
    const formattedOptions = shuffled.map((opt, i) => ({
      id: `opt-${i}-${Date.now()}`,
      label: opt.label,
      desc: opt.desc,
      weight: 1,
      color: colors[i % colors.length]
    }));

    const winnerIndex = secureRandomInt(formattedOptions.length);
    const winner = formattedOptions[winnerIndex];

    return {
      options: formattedOptions,
      winnerIndex,
      reasoning: `SpinPick evaluated your prompt "${prompt}" and identified "${winner.label}" as the highest momentum choice. ${winner.desc}`,
      actionSteps: [
        `Lock in "${winner.label}" without second-guessing for the next 60 minutes.`,
        `Gather whatever tools or materials you need right now.`,
        `Share your verdict with a friend or colleague to stay accountable.`
      ],
      isSensitive,
      source: 'SpinPick Decision Engine'
    };
  }
};