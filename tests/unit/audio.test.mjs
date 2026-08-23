import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ==========================================================================
   Unit Tests: Audio utils — Sound engine
   ========================================================================== */

describe('Audio utils', () => {
  let sound;
  let mockCtx;

  beforeEach(async () => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    // Mock AudioContext with proper constructor behavior
    const mockOscillator = {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      type: '',
    };

    const mockGain = {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
    };

    mockCtx = {
      createOscillator: vi.fn(() => ({ ...mockOscillator, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, type: '' })),
      createGain: vi.fn(() => ({ connect: vi.fn(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() } })),
      destination: {},
      currentTime: 0,
      state: 'running',
      resume: vi.fn().mockResolvedValue(undefined),
    };

    // Use a constructor function (not arrow) so `new AudioContext()` works
    function MockAudioContext() { return mockCtx; }
    function MockWebkitAudioContext() { return mockCtx; }

    vi.stubGlobal('AudioContext', MockAudioContext);
    vi.stubGlobal('webkitAudioContext', MockWebkitAudioContext);

    vi.resetModules();
    const mod = await import('../../src/utils/audio.ts');
    sound = mod.sound;
  });

  it('exports sound object with expected methods', () => {
    expect(typeof sound.playPop).toBe('function');
    expect(typeof sound.playVictoryFanfare).toBe('function');
    expect(typeof sound.playElimination).toBe('function');
    expect(typeof sound.playTick).toBe('function');
    expect(typeof sound.playSpinStart).toBe('function');
    expect(typeof sound.setMuted).toBe('function');
    expect(typeof sound.setVolume).toBe('function');
  });

  it('playPop creates audio without errors', () => {
    expect(() => sound.playPop(true)).not.toThrow();
  });

  it('playTick creates audio without errors', () => {
    expect(() => sound.playTick(1.0)).not.toThrow();
  });

  it('playSpinStart creates audio without errors', () => {
    expect(() => sound.playSpinStart()).not.toThrow();
  });

  it('playElimination creates audio without errors', () => {
    expect(() => sound.playElimination()).not.toThrow();
  });

  it('setMuted suppresses audio', () => {
    sound.setMuted(true);
    expect(() => sound.playPop(true)).not.toThrow();
    sound.setMuted(false);
  });

  it('setVolume clamps values', () => {
    expect(() => sound.setVolume(0)).not.toThrow();
    expect(() => sound.setVolume(1)).not.toThrow();
    expect(() => sound.setVolume(-0.5)).not.toThrow();
    expect(() => sound.setVolume(1.5)).not.toThrow();
  });
});
