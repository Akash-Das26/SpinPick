/* ==========================================================================
   SpinPick — OpenRouter Backend Proxy
   --------------------------------------------------------------------------
   Keeps the OpenRouter API key server-side so it is NEVER shipped to the
   browser or committed to the repo.

   Usage:
     1. Set the private key in your server environment:
        OPENROUTER_API_KEY=sk-or-v1-... node server/proxy.mjs
     2. Point the frontend at this server by setting VITE_OPENROUTER_PROXY_URL
        to this server's origin (e.g. https://api.spinpick.app or
        http://localhost:8787 in development).
     3. The browser calls POST {proxy}/api/openrouter — no key is sent.

   The proxy also supports the optional OPENROUTER_SITE_URL and
   OPENROUTER_APP_NAME env vars used for OpenRouter ranking attribution.

   Security:
   - ALLOWED_ORIGINS (optional, comma-separated). When set, requests with an
     Origin header not in the list are rejected with 403 and the CORS header
     reflects only the matched origin. Leave unset and the proxy defaults to a
     strict empty allow-list in production (browser requests get 403, CORS
     header is 'null' — never '*'). For production, ALWAYS set this to your
     frontend origin(s).
   - PROXY_AUTH_TOKEN (optional shared secret). When set, non-browser clients
     (requests WITHOUT an Origin header — curl, scripts, server-to-server) must
     present `Authorization: Bearer <PROXY_AUTH_TOKEN>` or they get 401. This
     closes the credit-burning vector for scripts that discover the URL, on top
     of the per-IP rate limiter. Browser clients are unaffected (they are gated
     by ALLOWED_ORIGINS and do not need the token). GET /health and OPTIONS are
     exempt so healthchecks/preflights keep working.
   - Upstream requests time out after 60s (AbortSignal.timeout).

   Health: GET /health (or /healthz) returns 200 with status JSON — used by the
   Docker HEALTHCHECK and uptime monitors.

   Testing: importing this module has NO side effects (no port bound). The
   request handler is created via createProxyHandler(env) so unit tests can
   invoke it directly with mocked req/res. The server only starts when this
   file is executed directly.

   Note: This file intentionally has NO dependencies (Node >= 18 built-ins only).
   ========================================================================== */

import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { timingSafeEqual } from 'node:crypto';

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Comma-separated allow-list of frontend origins (e.g. "https://spinpick.app,http://localhost:5173")
// Normalized: trailing slashes stripped, scheme+host lowercased, path dropped —
// so "https://SpinPick.app/" and "https://spinpick.app" both match.
const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Rate limiting: 60 requests per minute per IP
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

// CSP header for security (API endpoint - no scripts needed)
const CSP_API = [
  "default-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

// CSP for HTML responses (if any)
const CSP_HTML = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{NONCE}' https://plausible.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://plausible.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

export function normalizeOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.origin.toLowerCase();
  } catch {
    return origin.toLowerCase().replace(/\/+$/, '');
  }
}

/**
 * Parse the ALLOWED_ORIGINS env value into a normalized array.
 * - Explicit value (comma-separated) → used as-is.
 * - Unset + NODE_ENV=production → empty list (all browser origins blocked).
 * - Unset otherwise (dev) → default localhost origins.
 */
export function parseAllowedOrigins(env = {}) {
  return (env.ALLOWED_ORIGINS || (env.NODE_ENV === 'production' ? '' : DEFAULT_DEV_ORIGINS.join(',')))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

/**
 * Origin allow-list gate (pure, unit-testable).
 * - Empty allow-list: only no-Origin (non-browser) clients pass.
 * - Non-empty allow-list: no-Origin clients pass by design (server-to-server);
 *   browser Origins must match the list, otherwise rejected.
 */
export function isOriginAllowed(origin, allowedOrigins) {
  if (allowedOrigins.length === 0) {
    // No explicit allow-list configured: only allow browser origins that are explicitly trusted.
    return !origin || allowedOrigins.includes(normalizeOrigin(origin));
  }
  if (!origin) return true; // non-browser clients (curl, server-to-server)
  return allowedOrigins.includes(normalizeOrigin(origin));
}

export function corsHeadersFor(origin, allowedOrigins, isHtml = false) {
  const allowOrigin = origin && allowedOrigins.includes(normalizeOrigin(origin)) ? origin : '';
  const csp = isHtml ? CSP_HTML : CSP_API;
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': allowOrigin || 'null',
    'Content-Security-Policy': csp,
    ...(allowOrigin ? { Vary: 'Origin' } : {}),
  };
}

/**
 * Shared-secret gate for non-browser clients (pure, unit-testable).
 * - Browser clients (Origin present) are allowed — they are gated by
 *   ALLOWED_ORIGINS and do not need the token.
 * - No-Origin clients are allowed when PROXY_AUTH_TOKEN is not configured
 *   (backward compatible; still rate-limited per IP).
 * - No-Origin clients must present `Authorization: Bearer <token>` when a
 *   token IS configured; the comparison is timing-safe to resist brute force.
 */
export function isProxyAuthValid(origin, authorization, proxyAuthToken) {
  if (origin) return true; // browser client — gated by ALLOWED_ORIGINS only
  if (!proxyAuthToken) return true; // token not configured — keep current behavior
  const expected = `Bearer ${proxyAuthToken}`;
  const provided = authorization || '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Build the request handler from an env-like object (defaults to process.env).
 * Returns an async (req, res) => Promise<void> — no port is bound here, which
 * keeps it deterministic under test.
 */
export function createProxyHandler(env = process.env) {
  const allowedOrigins = parseAllowedOrigins(env);
  const openrouterApiKey = env.OPENROUTER_API_KEY;
  const proxyAuthToken = env.PROXY_AUTH_TOKEN;
  const siteUrl = env.OPENROUTER_SITE_URL || 'https://spinpick.app';
  const appName = env.OPENROUTER_APP_NAME || 'SpinPick Decision Studio';
  const upstreamTimeoutMs = Number(env.UPSTREAM_TIMEOUT_MS) || 60_000;
  const ipBuckets = new Map();

  function checkRateLimit(ip) {
    const now = Date.now();
    const bucket = ipBuckets.get(ip) || { count: 0, windowStart: now };

    if (now - bucket.windowStart > RATE_WINDOW_MS) {
      bucket.count = 0;
      bucket.windowStart = now;
    }

    if (bucket.count >= RATE_LIMIT) {
      return false;
    }

    bucket.count++;
    ipBuckets.set(ip, bucket);
    return true;
  }

  function send(res, status, body, origin, extraHeaders = {}) {
    res.writeHead(status, { ...corsHeadersFor(origin, allowedOrigins), ...extraHeaders });
    res.end(JSON.stringify(body));
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
        if (data.length > 1e6) {
          reject(new Error('Request body too large'));
          req.destroy();
        }
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  }

  return async function handleRequest(req, res) {
    const origin = req.headers.origin;

    // Origin allow-list enforcement (before any other handling)
    if (!isOriginAllowed(origin, allowedOrigins)) {
      send(res, 403, { error: 'Origin not allowed' }, origin);
      return;
    }

    // Rate limiting per IP
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress;
    if (!checkRateLimit(clientIp)) {
      send(res, 429, { error: 'Rate limit exceeded. Try again in a minute.' }, origin);
      return;
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeadersFor(origin, allowedOrigins));
      res.end();
      return;
    }

    // Health check (Docker/K8s probes, uptime monitors) — always 200 when alive
    if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) {
      send(res, 200, {
        status: 'ok',
        service: 'spinpick-openrouter-proxy',
        keyConfigured: Boolean(openrouterApiKey),
        uptime: Math.round(process.uptime()),
      }, origin);
      return;
    }

    if (req.method !== 'POST' || req.url !== '/api/openrouter') {
      send(res, 404, { error: 'Not found' }, origin);
      return;
    }

    // Shared-secret gate for non-browser clients (closes credit-burning vector
    // beyond the per-IP rate limiter). Browsers (Origin present) and /health /
    // OPTIONS are handled above and are exempt.
    if (!isProxyAuthValid(origin, req.headers.authorization, proxyAuthToken)) {
      send(res, 401, { error: 'Unauthorized: missing or invalid PROXY_AUTH_TOKEN' }, origin, {
        'WWW-Authenticate': 'Bearer', // RFC 7235: tell the client how to authenticate
      });
      return;
    }

    if (!openrouterApiKey) {
      console.error('[proxy] OPENROUTER_API_KEY is not set in the server environment.');
      send(res, 500, { error: 'Proxy not configured: OPENROUTER_API_KEY missing' }, origin);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch (err) {
      send(res, 400, { error: `Invalid JSON body: ${err.message}` }, origin);
      return;
    }

    const { model, messages } = payload; // IGNORE apiKey from client - security fix
    if (!model || !Array.isArray(messages) || messages.length === 0) {
      send(res, 400, { error: 'Missing "model" or "messages"' }, origin);
      return;
    }

    // ONLY use server-side env key - never accept key from request body
    const outgoingKey = openrouterApiKey;

    try {
      const upstream = await fetch(OPENROUTER_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${outgoingKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': siteUrl,
          'X-Title': appName,
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.8,
          max_tokens: 2000,
        }),
        signal: AbortSignal.timeout(upstreamTimeoutMs),
      });

      const raw = await upstream.text();
      console.log(`[proxy] ${new Date().toISOString()} POST /api/openrouter → ${upstream.status}`);
      res.writeHead(upstream.status, corsHeadersFor(origin, allowedOrigins));
      res.end(raw);
    } catch (err) {
      const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
      console.error(`[proxy] ${new Date().toISOString()} OpenRouter request failed: ${err.message}`);
      send(res, timedOut ? 504 : 502, {
        error: timedOut ? 'Upstream request timed out' : `Upstream request failed: ${err.message}`,
      }, origin);
    }
  };
}

// Main entry — only start the server when this file is executed directly
// (importing the module for tests must not bind a port).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const PORT = Number(process.env.PORT) || 8787;
  const allowedOrigins = parseAllowedOrigins(process.env);
  const server = createServer(createProxyHandler());

  server.listen(PORT, () => {
    console.log(`✅ SpinPick OpenRouter proxy listening on http://localhost:${PORT}`);
    console.log(`   Key configured: ${process.env.OPENROUTER_API_KEY ? 'yes' : 'NO — set OPENROUTER_API_KEY'}`);
    console.log(`   Proxy auth token: ${process.env.PROXY_AUTH_TOKEN ? 'configured (non-browser clients must send it)' : 'not set (non-browser clients allowed, rate-limited)'}`);
    console.log(`   Allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '(none; all origins blocked)'}`);
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
      console.warn('[proxy] Production mode is enabled but ALLOWED_ORIGINS is empty. Set it explicitly to your frontend origin(s).');
    }
  });
}
