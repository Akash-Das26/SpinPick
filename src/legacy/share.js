export function buildVerdictShareText(winner, reasoning = '') {
  return `🎯 SpinPick Verdict: "${winner?.label || 'Your choice'}"\n💡 ${reasoning || ''}\n⚡ Shared via SpinPick Decision Studio`;
}

export function buildVerdictPermalink({ winner, reasoning, actionSteps, prompt, options, timestamp }) {
  const data = {
    v: 1,
    w: winner?.label || '',
    r: reasoning || '',
    a: actionSteps || [],
    p: prompt || '',
    o: options?.map(opt => ({ l: opt.label, w: opt.weight, c: opt.color })) || [],
    t: timestamp || Date.now(),
  };
  const encoded = btoa(JSON.stringify(data));
  return `${window.location.origin}/result#${encoded}`;
}

export async function shareVerdict({
  winner,
  reasoning,
  shareApi = typeof navigator !== 'undefined' ? navigator.share?.bind(navigator) : null,
  clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null,
}) {
  const text = buildVerdictShareText(winner, reasoning);

  if (shareApi) {
    try {
      await shareApi({
        title: 'SpinPick Verdict',
        text,
      });
      return 'shared';
    } catch {
      // Fall back to clipboard when sharing is cancelled or unavailable.
    }
  }

  if (clipboard?.writeText) {
    await clipboard.writeText(text);
    return 'copied';
  }

  return 'unavailable';
}

export function parseVerdictPermalink(hash) {
  try {
    const encoded = hash.replace(/^#/, '');
    const data = JSON.parse(atob(encoded));
    if (data.v !== 1) return null;
    return {
      winner: { label: data.w },
      reasoning: data.r,
      actionSteps: data.a,
      prompt: data.p,
      options: data.o,
      timestamp: data.t,
    };
  } catch {
    return null;
  }
}
