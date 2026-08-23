import { describe, it, expect } from 'vitest';
import {
  createProxyHandler,
  normalizeOrigin,
  parseAllowedOrigins,
  isOriginAllowed,
  corsHeadersFor,
  isProxyAuthValid,
} from '../../server/proxy.mjs';
import { mockReq, mockRes, TOKEN, PROD_ENV, AUTH_ENV } from '../helpers/httpMocks.mjs';

// ─── normalizeOrigin ────────────────────────────────────────────────────
describe('normalizeOrigin', () => {
  it('lowercases scheme + host, strips trailing slash', () => {
    expect(normalizeOrigin('https://SpinPick.app/')).toBe('https://spinpick.app');
  });

  it('handles missing scheme gracefully', () => {
    // new URL throws without scheme; fallback lowercases
    const result = normalizeOrigin('localhost:5173');
    expect(result).toBeDefined();
  });
});

// ─── parseAllowedOrigins ────────────────────────────────────────────────
describe('parseAllowedOrigins', () => {
  it('parses explicit comma-separated list', () => {
    const env = { ALLOWED_ORIGINS: 'https://a.com,http://localhost:5173' };
    expect(parseAllowedOrigins(env)).toEqual(['https://a.com', 'http://localhost:5173']);
  });

  it('defaults to localhost in dev mode', () => {
    const result = parseAllowedOrigins({});
    expect(result).toContain('http://localhost:5173');
  });

  it('returns empty list in production with no ALLOWED_ORIGINS', () => {
    const result = parseAllowedOrigins({ NODE_ENV: 'production' });
    expect(result).toEqual([]);
  });
});

// ─── isOriginAllowed ────────────────────────────────────────────────────
describe('isOriginAllowed', () => {
  const allowed = ['https://spinpick.app', 'http://localhost:5173'];

  it('allows matching origin', () => {
    expect(isOriginAllowed('https://spinpick.app', allowed)).toBe(true);
  });

  it('rejects non-matching origin', () => {
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false);
  });

  it('allows no-origin (non-browser) requests when list is non-empty', () => {
    expect(isOriginAllowed(undefined, allowed)).toBe(true);
  });

  it('empty allow-list: blocks all browser origins', () => {
    expect(isOriginAllowed('https://anything.com', [])).toBe(false);
  });

  it('empty allow-list: allows no-origin requests', () => {
    expect(isOriginAllowed(undefined, [])).toBe(true);
  });
});

// ─── isProxyAuthValid ───────────────────────────────────────────────────
describe('isProxyAuthValid', () => {
  it('allows browser clients (origin present) without token check', () => {
    expect(isProxyAuthValid('https://spinpick.app', undefined, TOKEN)).toBe(true);
  });

  it('allows no-origin when no token is configured', () => {
    expect(isProxyAuthValid(undefined, undefined, undefined)).toBe(true);
  });

  it('rejects no-origin when token is configured but not provided', () => {
    expect(isProxyAuthValid(undefined, undefined, TOKEN)).toBe(false);
  });

  it('rejects wrong token', () => {
    expect(isProxyAuthValid(undefined, 'Bearer wrong-token', TOKEN)).toBe(false);
  });

  it('allows correct token', () => {
    expect(isProxyAuthValid(undefined, `Bearer ${TOKEN}`, TOKEN)).toBe(true);
  });

  it('timing-safe: rejects token of different length', () => {
    expect(isProxyAuthValid(undefined, 'Bearer short', TOKEN)).toBe(false);
  });
});

// ─── corsHeadersFor ─────────────────────────────────────────────────────
describe('corsHeadersFor', () => {
  it('reflects matched origin', () => {
    const h = corsHeadersFor('https://spinpick.app', ['https://spinpick.app']);
    expect(h['Access-Control-Allow-Origin']).toBe('https://spinpick.app');
  });

  it('returns null for unmatched origin', () => {
    const h = corsHeadersFor('https://evil.com', ['https://spinpick.app']);
    expect(h['Access-Control-Allow-Origin']).toBe('null');
  });

  it('includes CSP header', () => {
    const h = corsHeadersFor('https://spinpick.app', ['https://spinpick.app']);
    expect(h['Content-Security-Policy']).toContain("default-src 'none'");
  });
});

// ─── createProxyHandler — health check ──────────────────────────────────
describe('createProxyHandler — health', () => {
  it('GET /health returns 200 with status JSON', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'GET', url: '/health', origin: 'https://spinpick.app' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.keyConfigured).toBe(true);
  });

  it('GET /healthz also works', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'GET', url: '/healthz', origin: 'https://spinpick.app' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(200);
  });
});

// ─── createProxyHandler — OPTIONS ───────────────────────────────────────
describe('createProxyHandler — OPTIONS', () => {
  it('returns 204 with CORS headers', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'OPTIONS', url: '/api/openrouter', origin: 'https://spinpick.app' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://spinpick.app');
  });
});

// ─── createProxyHandler — origin blocking ───────────────────────────────
describe('createProxyHandler — origin blocking', () => {
  it('rejects unknown origin with 403', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://evil.com',
      body: JSON.stringify({ model: 'test', messages: [] }),
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(403);
  });

  it('accepts allowed origin', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://spinpick.app',
      body: JSON.stringify({ model: 'test', messages: [] }),
    });
    const res = mockRes();
    await handler(req, res);
    // 400 is expected (messages array is empty) — but NOT 403
    expect(res.status).not.toBe(403);
  });
});

// ─── createProxyHandler — auth token gate ───────────────────────────────
describe('createProxyHandler — auth token', () => {
  it('rejects no-origin request without token when configured', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      body: JSON.stringify({ model: 'test', messages: [] }),
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(401);
  });

  it('allows no-origin request with correct token', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      authorization: `Bearer ${TOKEN}`,
      body: JSON.stringify({ model: 'test', messages: [] }),
    });
    const res = mockRes();
    await handler(req, res);
    // 400 expected (empty messages), NOT 401
    expect(res.status).not.toBe(401);
  });

  it('allows browser origin without token', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://spinpick.app',
      body: JSON.stringify({ model: 'test', messages: [] }),
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).not.toBe(401);
  });
});

// ─── createProxyHandler — health exempt from auth ───────────────────────
describe('createProxyHandler — health exempt from token', () => {
  it('GET /health bypasses auth token gate', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const req = mockReq({ method: 'GET', url: '/health' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(200);
  });
});

// ─── createProxyHandler — 404 for unknown routes ────────────────────────
describe('createProxyHandler — 404', () => {
  it('returns 404 for unknown GET routes', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'GET', url: '/unknown', origin: 'https://spinpick.app' });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(404);
  });
});

// ─── createProxyHandler — missing API key ───────────────────────────────
describe('createProxyHandler — missing API key', () => {
  it('returns 500 when OPENROUTER_API_KEY is not set', async () => {
    const handler = createProxyHandler({ ALLOWED_ORIGINS: 'https://spinpick.app' });
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://spinpick.app',
      body: JSON.stringify({ model: 'test', messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(500);
  });
});

// ─── createProxyHandler — invalid JSON body ─────────────────────────────
describe('createProxyHandler — invalid JSON', () => {
  it('returns 400 for invalid JSON body', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://spinpick.app',
      body: 'not-json',
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(400);
  });
});

// ─── createProxyHandler — missing model/messages ────────────────────────
describe('createProxyHandler — validation', () => {
  it('returns 400 when model is missing', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://spinpick.app',
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(400);
  });

  it('returns 400 when messages is empty', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      method: 'POST',
      url: '/api/openrouter',
      origin: 'https://spinpick.app',
      body: JSON.stringify({ model: 'test', messages: [] }),
    });
    const res = mockRes();
    await handler(req, res);
    expect(res.status).toBe(400);
  });
});
