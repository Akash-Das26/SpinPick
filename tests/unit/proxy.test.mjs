import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  createProxyHandler,
  isOriginAllowed,
  parseAllowedOrigins,
  normalizeOrigin,
  isProxyAuthValid,
} from '../../server/proxy.mjs';

/* ==========================================================================
   Unit Tests: server/proxy.mjs — Origin Allow-List & Request Handling
   --------------------------------------------------------------------------
   Deterministic tests: the handler is invoked directly with mocked req/res
   (no real port is bound — createProxyHandler() returns a pure handler).
   Covers the production security policy:
     1. Evil browser origin → 403 (before any other handling).
     2. Matching origin → passes the gate (reaches body validation / upstream).
     3. No-Origin (non-browser) clients → pass by design (server-to-server) UNLESS
        PROXY_AUTH_TOKEN is configured, in which case they must present
        `Authorization: Bearer <token>` or get 401.
     4. Empty ALLOWED_ORIGINS in production → browser origins blocked, no-Origin ok.
   ========================================================================== */

const FAKE_KEY = 'test-api-key-1234567890';

const PROD_ENV = {
  ALLOWED_ORIGINS: 'https://spinpick.app,http://localhost:5173',
  OPENROUTER_API_KEY: FAKE_KEY,
  NODE_ENV: 'production',
};

/** Env with a configured shared secret for non-browser clients. */
const AUTH_ENV = { ...PROD_ENV, PROXY_AUTH_TOKEN: 'super-secret-token-42' };

/** Minimal request mock — EventEmitter so readBody's data/end/error hooks work. */
function mockReq({ method = 'POST', url = '/api/openrouter', origin, authorization, body = '' } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = {};
  if (origin) req.headers.origin = origin;
  if (authorization) req.headers.authorization = authorization;
  req.socket = { remoteAddress: '127.0.0.1' };
  // Emit the body stream on the next tick so the handler's readBody()
  // listeners are attached before data flows.
  process.nextTick(() => {
    if (body) req.emit('data', body);
    req.emit('end');
  });
  return req;
}

/** Minimal response mock capturing the status, headers and body. */
function mockRes() {
  const res = {
    status: null,
    headers: {},
    body: '',
    writeHead(status, headers = {}) {
      res.status = status;
      res.headers = headers;
    },
    end(chunk = '') {
      res.body = chunk;
    },
  };
  return res;
}

describe('proxy origin allow-list (createProxyHandler)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects an evil origin with 403 before any other handling', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      origin: 'https://evil.example.com',
      body: '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}',
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'Origin not allowed' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an evil origin even on GET /health (gate runs first)', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'GET', url: '/health', origin: 'https://evil.example.com' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(403);
  });

  it('rejects an evil origin preflight (OPTIONS)', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'OPTIONS', url: '/api/openrouter', origin: 'https://evil.example.com' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(403);
  });

  it('allows a matching origin — reaches body validation (400, not 403)', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ origin: 'https://spinpick.app', body: '{"model":"m","messages":[]}' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(400); // passed the origin gate, failed empty-messages validation
    expect(JSON.parse(res.body).error).toContain('Missing');
  });

  it('allows a matching origin — forwards to OpenRouter with the server key', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{"choices":[]}' });
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      origin: 'http://localhost:5173',
      body: '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}',
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
  });

  it('allows no-Origin (non-browser) clients by design', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ body: '{"model":"m","messages":[]}' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(400); // passes the gate, fails body validation
    expect(res.status).not.toBe(403);
  });

  it('blocks browser origins when ALLOWED_ORIGINS is empty in production', async () => {
    const handler = createProxyHandler({ ...PROD_ENV, ALLOWED_ORIGINS: '' });
    const req = mockReq({
      origin: 'https://spinpick.app',
      body: '{"model":"m","messages":[{"role":"user","content":"hi"}]}',
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(403);
    expect(JSON.parse(res.body).error).toBe('Origin not allowed');
  });

  it('still allows no-Origin when ALLOWED_ORIGINS is empty in production', async () => {
    const handler = createProxyHandler({ ...PROD_ENV, ALLOWED_ORIGINS: '' });
    const req = mockReq({ body: '{"model":"m","messages":[]}' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(400); // passes the gate
    expect(res.status).not.toBe(403);
  });

  it('returns 204 preflight for an allowed origin', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'OPTIONS', url: '/api/openrouter', origin: 'https://spinpick.app' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(204);
  });

  it('serves /health with keyConfigured flag for an allowed origin', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ method: 'GET', url: '/health', origin: 'https://spinpick.app' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ status: 'ok', keyConfigured: true });
  });

  it('sets Access-Control-Allow-Origin to null on a 403 so browsers cannot read it', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ origin: 'https://evil.example.com' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('null');
  });

  it('returns 500 (not 403) when the key is missing and origin is allowed', async () => {
    const handler = createProxyHandler({ ...PROD_ENV, OPENROUTER_API_KEY: '' });
    const req = mockReq({
      origin: 'https://spinpick.app',
      body: '{"model":"m","messages":[{"role":"user","content":"hi"}]}',
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(500);
    expect(JSON.parse(res.body).error).toContain('OPENROUTER_API_KEY');
  });

  it('rejects invalid JSON bodies with 400', async () => {
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({ origin: 'https://spinpick.app', body: 'this is not json' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(400);
    expect(JSON.parse(res.body).error).toContain('Invalid JSON');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards upstream non-2xx status as-is (no wrap, no key leak)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
    const handler = createProxyHandler(PROD_ENV);
    const req = mockReq({
      origin: 'https://spinpick.app',
      body: '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}',
    });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toBe(401);
    expect(res.body).toBe('Unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns 429 after the per-IP rate limit is exhausted (60/min)', async () => {
    const handler = createProxyHandler(PROD_ENV); // shared instance → shared ipBuckets
    // 60 allowed requests pass the rate gate (each fails body validation at 400)
    for (let i = 0; i < 60; i++) {
      const res = mockRes();
      await handler(mockReq({ origin: 'https://spinpick.app', body: '{"model":"m","messages":[]}' }), res);
      expect(res.status).toBe(400);
    }
    // 61st request from the same IP → rate limited
    const limited = mockRes();
    await handler(mockReq({ origin: 'https://spinpick.app', body: '{"model":"m","messages":[]}' }), limited);

    expect(limited.status).toBe(429);
    expect(JSON.parse(limited.body).error).toContain('Rate limit');
  });
});

describe('proxy shared-secret gate (PROXY_AUTH_TOKEN)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects a no-Origin client without the token with 401', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const res = mockRes();

    await handler(mockReq({ body: '{"model":"m","messages":[{"role":"user","content":"hi"}]}' }), res);

    expect(res.status).toBe(401);
    expect(JSON.parse(res.body).error).toContain('PROXY_AUTH_TOKEN');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a no-Origin client with a wrong token with 401', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const res = mockRes();

    await handler(mockReq({
      authorization: 'Bearer wrong-token',
      body: '{"model":"m","messages":[{"role":"user","content":"hi"}]}',
    }), res);

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('allows a no-Origin client presenting the correct token', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '{"choices":[]}' });
    const handler = createProxyHandler(AUTH_ENV);
    const res = mockRes();

    await handler(mockReq({
      authorization: 'Bearer super-secret-token-42',
      body: '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}',
    }), res);

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not require the token from browser clients (allowed origin, no Authorization header)', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const res = mockRes();

    await handler(mockReq({ origin: 'https://spinpick.app', body: '{"model":"m","messages":[]}' }), res);

    expect(res.status).toBe(400); // passes origin gate + token gate, fails body validation
    expect(res.status).not.toBe(401);
  });

  it('serves /health without a token even when PROXY_AUTH_TOKEN is set (healthcheck exempt)', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const res = mockRes();

    await handler(mockReq({ method: 'GET', url: '/health' }), res);

    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ status: 'ok', keyConfigured: true });
  });

  it('serves OPTIONS preflight without a token when PROXY_AUTH_TOKEN is set', async () => {
    const handler = createProxyHandler(AUTH_ENV);
    const res = mockRes();

    await handler(mockReq({ method: 'OPTIONS', url: '/api/openrouter' }), res);

    expect(res.status).toBe(204);
  });

  it('still allows no-Origin clients when PROXY_AUTH_TOKEN is not configured (backward compatible)', async () => {
    const handler = createProxyHandler(PROD_ENV); // no PROXY_AUTH_TOKEN
    const res = mockRes();

    await handler(mockReq({ body: '{"model":"m","messages":[]}' }), res);

    expect(res.status).toBe(400); // passes gates, fails body validation
    expect(res.status).not.toBe(401);
  });
});

describe('isProxyAuthValid (pure function)', () => {
  const TOKEN = 'super-secret-token-42';

  it('allows browser clients (Origin present) without a token', () => {
    expect(isProxyAuthValid('https://spinpick.app', undefined, TOKEN)).toBe(true);
  });

  it('allows no-Origin clients when no token is configured', () => {
    expect(isProxyAuthValid(undefined, undefined, undefined)).toBe(true);
    expect(isProxyAuthValid(undefined, 'Bearer whatever', '')).toBe(true);
  });

  it('rejects no-Origin clients without a token when one is configured', () => {
    expect(isProxyAuthValid(undefined, undefined, TOKEN)).toBe(false);
  });

  it('rejects a wrong token', () => {
    expect(isProxyAuthValid(undefined, 'Bearer wrong-token', TOKEN)).toBe(false);
  });

  it('accepts the correct token (case-sensitive, Bearer prefix required)', () => {
    expect(isProxyAuthValid(undefined, `Bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(isProxyAuthValid(undefined, `bearer ${TOKEN}`, TOKEN)).toBe(false);
    expect(isProxyAuthValid(undefined, TOKEN, TOKEN)).toBe(false); // missing Bearer prefix
  });
});

describe('isOriginAllowed (pure function)', () => {
  const list = ['https://spinpick.app'];

  it('rejects an unmatched browser origin', () => {
    expect(isOriginAllowed('https://evil.example.com', list)).toBe(false);
  });

  it('accepts a matched origin with case + trailing-slash normalization', () => {
    expect(isOriginAllowed('https://SpinPick.app/', list)).toBe(true);
  });

  it('accepts no-Origin clients when the list is non-empty (by design)', () => {
    expect(isOriginAllowed(undefined, list)).toBe(true);
  });

  it('with an empty list: no-Origin passes, browser origin blocked', () => {
    expect(isOriginAllowed(undefined, [])).toBe(true);
    expect(isOriginAllowed('https://spinpick.app', [])).toBe(false);
  });
});

describe('parseAllowedOrigins + normalizeOrigin', () => {
  it('parses a comma-separated list with normalization', () => {
    expect(parseAllowedOrigins({ ALLOWED_ORIGINS: 'https://SpinPick.App/, http://localhost:5173' }))
      .toEqual(['https://spinpick.app', 'http://localhost:5173']);
  });

  it('empty ALLOWED_ORIGINS + NODE_ENV=production → empty list (strict)', () => {
    expect(parseAllowedOrigins({ ALLOWED_ORIGINS: '', NODE_ENV: 'production' })).toEqual([]);
  });

  it('unset ALLOWED_ORIGINS + non-production → dev localhost defaults', () => {
    const list = parseAllowedOrigins({ NODE_ENV: 'development' });
    expect(list).toContain('http://localhost:5173');
    expect(list).toContain('http://127.0.0.1:5173');
  });

  it('normalizeOrigin strips paths and lowercases', () => {
    expect(normalizeOrigin('https://SpinPick.App/some/path')).toBe('https://spinpick.app');
  });
});
