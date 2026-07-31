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
     reflects only the matched origin. Leave unset for a fully open proxy
     (CORS *). For production, ALWAYS set this to your frontend origin(s).
   - Upstream requests time out after 60s (AbortSignal.timeout).

   Health: GET /health (or /healthz) returns 200 with status JSON — used by the
   Docker HEALTHCHECK and uptime monitors.

   Note: This file intentionally has NO dependencies (Node >= 18 built-ins only).
   ========================================================================== */

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT) || 8787;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = process.env.OPENROUTER_SITE_URL || 'https://spinpick.app';
const APP_NAME = process.env.OPENROUTER_APP_NAME || 'SpinPick Decision Studio';
const UPSTREAM_TIMEOUT_MS = Number(process.env.UPSTREAM_TIMEOUT_MS) || 60_000;

// Comma-separated allow-list of frontend origins (e.g. "https://spinpick.app,http://localhost:5173")
// Normalized: trailing slashes stripped, scheme+host lowercased, path dropped —
// so "https://SpinPick.app/" and "https://spinpick.app" both match.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
  .map(normalizeOrigin);

function normalizeOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.origin.toLowerCase();
  } catch {
    return origin.toLowerCase().replace(/\/+$/, '');
  }
}

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Rate limiting: 60 requests per minute per IP
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;
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

function corsHeadersFor(origin, isHtml = false) {
  const allowOrigin = ALLOWED_ORIGINS.length > 0 ? (origin || '') : '*';
  const csp = isHtml ? CSP_HTML : CSP_API;
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': allowOrigin || 'null',
    'Content-Security-Policy': csp,
    ...(allowOrigin ? { Vary: 'Origin' } : {}),
  };
}

function isOriginAllowed(origin) {
  if (ALLOWED_ORIGINS.length === 0) return true; // open by default
  if (!origin) return true; // non-browser clients (curl, server-to-server)
  return ALLOWED_ORIGINS.includes(normalizeOrigin(origin));
}

function send(res, status, body, origin) {
  res.writeHead(status, corsHeadersFor(origin));
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

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;

  // Origin allow-list enforcement (before any other handling)
  if (!isOriginAllowed(origin)) {
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
    res.writeHead(204, corsHeadersFor(origin));
    res.end();
    return;
  }

  // Health check (Docker/K8s probes, uptime monitors) — always 200 when alive
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/healthz')) {
    send(res, 200, {
      status: 'ok',
      service: 'spinpick-openrouter-proxy',
      keyConfigured: Boolean(OPENROUTER_API_KEY),
      uptime: Math.round(process.uptime()),
    }, origin);
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/openrouter') {
    send(res, 404, { error: 'Not found' }, origin);
    return;
  }

  if (!OPENROUTER_API_KEY) {
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
  const outgoingKey = OPENROUTER_API_KEY;

  try {
    const upstream = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${outgoingKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': SITE_URL,
        'X-Title': APP_NAME,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const raw = await upstream.text();
    console.log(`[proxy] ${new Date().toISOString()} POST /api/openrouter → ${upstream.status}`);
    res.writeHead(upstream.status, corsHeadersFor(origin));
    res.end(raw);
  } catch (err) {
    const timedOut = err.name === 'TimeoutError' || err.name === 'AbortError';
    console.error(`[proxy] ${new Date().toISOString()} OpenRouter request failed: ${err.message}`);
    send(res, timedOut ? 504 : 502, {
      error: timedOut ? 'Upstream request timed out' : `Upstream request failed: ${err.message}`,
    }, origin);
  }
});

server.listen(PORT, () => {
  console.log(`✅ SpinPick OpenRouter proxy listening on http://localhost:${PORT}`);
  console.log(`   Key configured: ${OPENROUTER_API_KEY ? 'yes' : 'NO — set OPENROUTER_API_KEY'}`);
});
