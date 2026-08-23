import { WheelItem, WheelConfig, SharedWheelPayload } from '../types';

export function encodeWheelToUrl(
  title: string,
  items: WheelItem[],
  config: WheelConfig,
  themeId: string = 'cyber-neon',
  authorName?: string
): string {
  const payload: SharedWheelPayload = {
    v: 1,
    title: title || 'Custom Spin Wheel',
    items: items.map((i) => ({
      text: i.text,
      color: i.color,
      weight: i.weight,
      icon: i.icon,
      imageUrl: i.imageUrl,
    })),
    themeId: themeId || 'cyber-neon',
    fontFamily: config.fontFamily || 'Outfit',
    author: authorName,
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // Base64 encode URL safe
    const base64 = btoa(encodeURIComponent(jsonStr));
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('wheel', base64);
    return url.toString();
  } catch (err) {
    console.error('Failed to encode shareable wheel URL:', err);
    return window.location.href;
  }
}

export function decodeWheelFromUrl(): {
  title: string;
  items: WheelItem[];
  themeId: string;
  fontFamily?: any;
  author?: string;
} | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('wheel');
    if (!encoded) return null;

    const jsonStr = decodeURIComponent(atob(encoded));
    const payload: SharedWheelPayload = JSON.parse(jsonStr);

    if (!payload.items || !Array.isArray(payload.items)) return null;

    const items: WheelItem[] = payload.items.map((item, idx) => ({
      id: 'shared_' + Date.now().toString(36) + '_' + idx,
      text: item.text || `Item ${idx + 1}`,
      color: item.color || '#6366f1',
      weight: typeof item.weight === 'number' ? item.weight : 1,
      enabled: true,
      icon: item.icon,
      imageUrl: item.imageUrl,
    }));

    return {
      title: payload.title || 'Shared Wheel',
      items,
      themeId: payload.themeId || 'cyber-neon',
      fontFamily: payload.fontFamily || 'Outfit',
      author: payload.author,
    };
  } catch (err) {
    console.error('Failed to decode wheel from URL:', err);
    return null;
  }
}

// ─── Verdict Permalink Sharing ──────────────────────────────────────

interface VerdictPermalinkData {
  winner: { label: string; desc?: string };
  reasoning?: string;
  actionSteps?: string[];
  prompt?: string;
  options?: Array<{ label: string; weight?: number; color?: string }>;
  timestamp?: number;
}

export function buildVerdictShareText(
  winner: { label: string; desc?: string },
  reasoning = ''
): string {
  return `🎯 SpinPick Verdict: "${winner?.label || 'Your choice'}"\n💡 ${reasoning || ''}\n⚡ Shared via SpinPick Decision Studio`;
}

export function buildVerdictPermalink(data: VerdictPermalinkData): string {
  const payload = {
    v: 1,
    w: data.winner?.label || '',
    r: data.reasoning || '',
    a: data.actionSteps || [],
    p: data.prompt || '',
    o: data.options?.map((opt) => ({ l: opt.label, w: opt.weight, c: opt.color })) || [],
    t: data.timestamp || Date.now(),
  };
  const encoded = btoa(JSON.stringify(payload));
  return `${window.location.origin}${window.location.pathname}#${encoded}`;
}

export function parseVerdictPermalink(
  hash: string
): VerdictPermalinkData | null {
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

export async function shareVerdict({
  winner,
  reasoning,
  shareApi = typeof navigator !== 'undefined' ? navigator.share?.bind(navigator) : null,
  clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null,
}: {
  winner: { label: string };
  reasoning?: string;
  shareApi?: ((data: ShareData) => Promise<void>) | null;
  clipboard?: { writeText: (text: string) => Promise<void> } | null;
}): Promise<'shared' | 'copied' | 'unavailable'> {
  const text = buildVerdictShareText(winner, reasoning);

  if (shareApi) {
    try {
      await shareApi({ title: 'SpinPick Verdict', text });
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

export function getSocialShareLinks(shareUrl: string, title: string) {
  const encUrl = encodeURIComponent(shareUrl);
  const text = encodeURIComponent(`🎡 Spin the "${title}" wheel on SpinPick! Make random choices and decisions:`);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${encUrl}&text=${text}`,
    whatsapp: `https://api.whatsapp.com/send?text=${text}%20${encUrl}`,
    telegram: `https://t.me/share/url?url=${encUrl}&text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
    reddit: `https://reddit.com/submit?url=${encUrl}&title=${text}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
    email: `mailto:?subject=${encodeURIComponent('Spin the ' + title + ' Wheel on SpinPick!')}&body=${text}%0A%0A${encUrl}`,
  };
}
