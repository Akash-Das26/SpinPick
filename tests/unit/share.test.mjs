import { describe, it, expect } from 'vitest';
import { buildVerdictShareText, shareVerdict } from '../../src/lib/share.js';

describe('share helpers', () => {
  it('builds a shareable verdict summary', () => {
    const text = buildVerdictShareText({ label: 'Pasta', desc: 'A cozy choice' }, 'It feels right');

    expect(text).toContain('🎯 SpinPick Verdict: "Pasta"');
    expect(text).toContain('💡 It feels right');
    expect(text).toContain('⚡ Shared via SpinPick Decision Studio');
  });

  it('uses the Web Share API when available', async () => {
    const events = [];
    const shareApi = async (payload) => {
      events.push(payload);
      return undefined;
    };

    const result = await shareVerdict({
      winner: { label: 'Pasta' },
      reasoning: 'It feels right',
      shareApi,
      clipboard: null,
    });

    expect(result).toBe('shared');
    expect(events).toEqual([
      {
        title: 'SpinPick Verdict',
        text: buildVerdictShareText({ label: 'Pasta' }, 'It feels right'),
      },
    ]);
  });

  it('falls back to clipboard when sharing is unavailable', async () => {
    const clipboardCalls = [];
    const clipboard = {
      writeText: async (text) => {
        clipboardCalls.push(text);
      },
    };

    const result = await shareVerdict({
      winner: { label: 'Pasta' },
      reasoning: 'It feels right',
      shareApi: null,
      clipboard,
    });

    expect(result).toBe('copied');
    expect(clipboardCalls).toHaveLength(1);
    expect(clipboardCalls[0]).toContain('SpinPick Verdict');
  });
});
