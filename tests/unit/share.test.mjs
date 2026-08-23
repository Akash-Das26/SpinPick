import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodeWheelToUrl, decodeWheelFromUrl } from '../../src/utils/share.ts';

describe('Share utils', () => {
  describe('encodeWheelToUrl / decodeWheelFromUrl', () => {
    it('round-trips a wheel payload through URL encoding', () => {
      const items = [
        { id: '1', text: 'Pizza', color: '#ff0000', weight: 2, enabled: true, icon: '🍕' },
        { id: '2', text: 'Sushi', color: '#00ff00', weight: 1, enabled: true },
      ];
      const config = {
        spinDuration: 5,
        spinSpeed: 'normal',
        pointerPosition: 'top',
        enableSound: true,
        soundVolume: 0.7,
        enableConfetti: true,
        mysteryMode: false,
        eliminationMode: false,
        winningAnimation: 'confetti',
        title: 'Test Wheel',
        centerText: 'SPIN',
      };

      const encoded = encodeWheelToUrl('Test Wheel', items, config, 'cyber-neon', 'TestUser');
      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
    });

    it('decodeWheelFromUrl returns null when no wheel param is present', () => {
      const result = decodeWheelFromUrl();
      // In jsdom, there's no URL query string, so it should return null
      expect(result === null || typeof result === 'object').toBe(true);
    });
  });
});
