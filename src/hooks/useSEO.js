import { useEffect } from 'react';

/**
 * Minimal SEO head manager — sets <title>, meta description, and OG tags
 * without needing react-helmet or any extra dependency.
 */
export function useSEO({ title, description, url, ogTitle, ogDescription }) {
  useEffect(() => {
    // Title
    if (title) document.title = title;

    // Meta description
    let descEl = document.querySelector('meta[name="description"]');
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.name = 'description';
      document.head.appendChild(descEl);
    }
    if (description) descEl.content = description;

    // OG: title
    setMeta('property', 'og:title', ogTitle || title);
    // OG: description
    setMeta('property', 'og:description', ogDescription || description);
    // OG: url
    if (url) setMeta('property', 'og:url', url);
    // OG: type
    setMeta('property', 'og:type', 'website');

    return () => {
      // Restore default title on unmount
      document.title = 'SpinPick — AI-Powered Decision Studio';
    };
  }, [title, description, url, ogTitle, ogDescription]);
}

function setMeta(attr, attrValue, content) {
  if (!content) return;
  let el = document.querySelector(`meta[${attr}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, attrValue);
    document.head.appendChild(el);
  }
  el.content = content;
}
