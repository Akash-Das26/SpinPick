export function buildVerdictShareText(winner, reasoning = '') {
  return `🎯 SpinPick Verdict: "${winner?.label || 'Your choice'}"\n💡 ${reasoning || ''}\n⚡ Shared via SpinPick Decision Studio`;
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
