import { Utensils, Plane, Code, Film } from '../lib/icons';

export const QUICK_CHIPS = [
  "What should I cook for dinner?",
  "Where to travel next weekend?",
  "Which side project to build?",
  "Pick a movie for tonight",
  "What song to play on repeat?"
];

export const SURPRISE_PROMPTS = [
  "What should I cook for dinner tonight?",
  "Where should I travel next weekend?",
  "Which side project should I ship tonight?",
  "Pick a movie for tonight",
  "What workout routine should I do today?",
  "What book should I read next?",
  "Which technology stack should I choose for my new app?"
];

export const PRESET_GALLERY = [
  {
    id: 'preset-dinner',
    title: 'The Ultimate Dinner Contender',
    category: 'Food & Dining',
    icon: Utensils,
    desc: 'Stop arguing over food. 6 delicious restaurant & home-cooked picks.',
    options: [
      { id: 'p1', label: 'Truffle Mushroom Pasta', desc: 'Creamy garlic parmesan sauce with wild mushrooms', weight: 1, color: '#d8ff5b' },
      { id: 'p2', label: 'Spicy Salmon Sushi Roll', desc: 'Fresh salmon with avocado and spicy mayo', weight: 1, color: '#a3ff12' },
      { id: 'p3', label: 'Wood-Fired Neapolitan Pizza', desc: 'San Marzano tomato and fresh mozzarella', weight: 1, color: '#38ef7d' },
      { id: 'p4', label: 'Street Style Tacos Platter', desc: 'Carne asada with fresh cilantro and salsa verde', weight: 1, color: '#00f2fe' },
      { id: 'p5', label: 'Thai Green Curry Bowl', desc: 'Coconut milk with bamboo shoots and basil', weight: 1, color: '#ffb86c' },
      { id: 'p6', label: 'Classic Wagyu Smashburger', desc: 'Double melted cheddar and caramelized onions', weight: 1, color: '#ffd166' }
    ]
  },
  {
    id: 'preset-travel',
    title: 'Weekend Escape Destination Matrix',
    category: 'Travel & Life',
    icon: Plane,
    desc: 'Unsure where to drive or fly next weekend? Let the wheel decide.',
    options: [
      { id: 't1', label: 'Coastal Cliffside Cabin', desc: 'Scenic ocean views and fresh sea air', weight: 1, color: '#d8ff5b' },
      { id: 't2', label: 'Mountain Trail Summit', desc: 'Pine forests, hiking, and cozy fireplace', weight: 1, color: '#a3ff12' },
      { id: 't3', label: 'Historic City Food Crawl', desc: 'Speakeasies, art museums, and local bakery tours', weight: 1, color: '#38ef7d' },
      { id: 't4', label: 'Lakeside Glamping Spa', desc: 'Kayak waters, campfire smores, and stargazing', weight: 1, color: '#00f2fe' },
      { id: 't5', label: 'Vineyard Wine Tasting Tour', desc: 'Rolling hills and artisanal cheese pairings', weight: 1, color: '#ffb86c' }
    ]
  },
  {
    id: 'preset-project',
    title: 'Next High-Impact Side Hustle / Project',
    category: 'Tech & Product',
    icon: Code,
    desc: 'Overwhelmed by your backlog of side projects? Ship one tonight.',
    options: [
      { id: 'c1', label: 'AI Voice Command Web Tool', desc: 'Build lightweight Web Speech API utility', weight: 1, color: '#b56cff' },
      { id: 'c2', label: 'Minimalist Micro-Kanban SaaS', desc: 'Craft offline drag-and-drop workspace', weight: 1, color: '#d8ff5b' },
      { id: 'c3', label: 'WebGL Shader Audio Visualizer', desc: 'Generative reactive music shader canvas', weight: 1, color: '#a3ff12' },
      { id: 'c4', label: 'CLI Productivity Tool in Rust', desc: 'Automate developer shell workflows', weight: 1, color: '#38ef7d' },
      { id: 'c5', label: 'High-Converting Landing Page', desc: 'Launch single page product preview', weight: 1, color: '#ffb86c' }
    ]
  },
  {
    id: 'preset-movie',
    title: 'Friday Movie Night Draft',
    category: 'Entertainment',
    icon: Film,
    desc: 'Skip spending 45 minutes scrolling Netflix menus.',
    options: [
      { id: 'm1', label: 'Neon Cyberpunk Sci-Fi', desc: 'Mind-bending thriller with synthetic soundtrack', weight: 1, color: '#ff4d6d' },
      { id: 'm2', label: 'Edge-of-Seat Heist Thriller', desc: 'Intense plot twists and mastermind robbery', weight: 1, color: '#d8ff5b' },
      { id: 'm3', label: 'Ensemble Indie Comedy', desc: 'Witty dialog and quirky roadtrip adventure', weight: 1, color: '#a3ff12' },
      { id: 'm4', label: 'Classic Whodunit Detective Mystery', desc: 'Rainy mansion murder puzzle', weight: 1, color: '#38ef7d' },
      { id: 'm5', label: 'Epic Historical Action Saga', desc: 'Breathtaking battles and orchestral score', weight: 1, color: '#ffb86c' }
    ]
  }
];
