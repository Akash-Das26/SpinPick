import confetti from 'canvas-confetti';
import { ConfettiIntensity } from '../types';

export interface ConfettiTriggerOptions {
  intensity?: ConfettiIntensity;
  durationSeconds?: number;
  colors?: string[];
  isGoldChampion?: boolean;
}

export function fireWinningConfetti(options: ConfettiTriggerOptions = {}) {
  // Respect prefers-reduced-motion
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  const {
    intensity = 'normal',
    durationSeconds = 3,
    colors = ['#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6'],
    isGoldChampion = false,
  } = options;

  const palette = isGoldChampion
    ? ['#f59e0b', '#fbbf24', '#d97706', '#ffffff', '#ef4444', '#ffd700']
    : colors;

  const durationMs = Math.max(1, Math.min(10, durationSeconds)) * 1000;
  const end = Date.now() + durationMs;

  // Particle count based on intensity
  let particleCount = 5;
  let spread = 55;
  if (intensity === 'low') {
    particleCount = 2;
    spread = 45;
  } else if (intensity === 'normal') {
    particleCount = 5;
    spread = 60;
  } else if (intensity === 'high') {
    particleCount = 9;
    spread = 75;
  } else if (intensity === 'epic') {
    particleCount = 15;
    spread = 90;
  }

  // Initial cannon burst if epic or high
  if (intensity === 'epic' || intensity === 'high') {
    confetti({
      particleCount: intensity === 'epic' ? 80 : 40,
      spread: 100,
      origin: { y: 0.6 },
      colors: palette,
      zIndex: 99999,
    });
  }

  (function frame() {
    confetti({
      particleCount,
      angle: 60,
      spread,
      origin: { x: 0, y: 0.7 },
      colors: palette,
      zIndex: 99999,
    });
    confetti({
      particleCount,
      angle: 120,
      spread,
      origin: { x: 1, y: 0.7 },
      colors: palette,
      zIndex: 99999,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}
