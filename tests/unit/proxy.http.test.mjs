// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FAKE_KEY, TOKEN, PROD_ENV, AUTH_ENV, startServer, stopServer, stubUpstream } from '../helpers/httpMocks.mjs';

/* ==========================================================================
   HTTP-Level Integration Tests: server/proxy.mjs
   --------------------------------------------------------------------------
   Boots the REAL server on an ephemeral port (createServer(createProxyHandler()))
   and drives it over real HTTP with fetch — complementing the mocked-handler
   unit tests in proxy.test.mjs. Proves the production security policy holds
   end-to-end through the actual Node HTTP stack (listening socket, headers,
   body streaming, status codes):

     1. Origin allow-list (evil origin → 403, allowed origin → passes).
     2. PROXY_AUTH_TOKEN gate (no-Origin clients must present the token; 401
        otherwise, with WWW-Authenticate: Bearer per RFC 7235).
     3. GET /health (200 + keyConfigured, exempt from the token gate).
     4. Per-IP rate limiting (60/min — the 61st request from the same IP → 429).

   Only the UPSTREAM OpenRouter call is mocked — via a pass-through fetch stub
   that lets localhost requests through to the real network. Everything else is
   genuinely wired. Each test boots a fresh server so the per-IP rate-limit
   buckets (60/min) are never shared across tests.

   Runs under the `node` environment (not jsdom) since it needs real sockets.
   ========================================================================== */

// Env fixtures + real-server boot helpers come from tests/helpers/httpMocks.mjs
// (shared with proxy.test.mjs and aiService.proxy.http.test.mjs).
const VALID_BODY = JSON.stringify({
  model: 'openai/gpt-4o-mini',
  messages: [{ role: 'user', content: 'hi' }],
});

function upstreamOk() {
  return { ok: true, status: 200, text: async () => '{"choices":[]}' };
}

describe('proxy HTTP integration — origin allow-list over real HTTP', () => {
  let server;
  let baseUrl;
  let upstreamFetch;

  beforeEach(async () => {
    upstreamFetch = stubUpstream();
    ({ server, baseUrl } = await startServer(PROD_ENV));
  });

  afterEach(async () => {
    await stopServer(server);
    vi.unstubAllGlobals();
  });

  it('serves GET /health with 200 and keyConfigured for an allowed origin', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://spinpick.app' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.keyConfigured).toBe(true);
  });

  it('rejects an evil browser origin with 403 over real HTTP (upstream never called)', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { Origin: 'https://evil.example.com', 'Content-Type': 'application/json' },
      body: VALID_BODY,
    });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Origin not allowed' });
    expect(res.headers.get('access-control-allow-origin')).toBe('null');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects an evil origin even on GET /health (gate runs first)', async () => {
    const res = await fetch(`${baseUrl}/health`, {
      headers: { Origin: 'https://evil.example.com' },
    });

    expect(res.status).toBe(403);
  });

  it('allows a matching origin — passes the gate and reaches body validation (400)', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'm', messages: [] }),
    });

    expect(res.status).toBe(400); // passed origin gate, failed empty-messages validation
    expect((await res.json()).error).toContain('Missing');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('forwards a valid request from an allowed origin to OpenRouter with the server key', async () => {
    upstreamFetch.mockResolvedValue(upstreamOk());
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
      body: VALID_BODY,
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('{"choices":[]}');
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    const [url, init] = upstreamFetch.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(init.headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);
  });

  it('answers OPTIONS preflight with 204 for an allowed origin', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://spinpick.app' },
    });

    expect(res.status).toBe(204);
  });

  it('rejects an invalid JSON body with 400 over real HTTP (no upstream call)', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
      body: 'this is not json',
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('Invalid JSON');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown route over real HTTP', async () => {
    const res = await fetch(`${baseUrl}/nope`, {
      method: 'POST',
      headers: { Origin: 'https://spinpick.app' },
    });

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' }); // parity with the 403 body assertion
    expect(upstreamFetch).not.toHaveBeenCalled();
  });
});

describe('proxy HTTP integration — PROXY_AUTH_TOKEN gate over real HTTP', () => {
  let server;
  let baseUrl;
  let upstreamFetch;

  beforeEach(async () => {
    upstreamFetch = stubUpstream();
    ({ server, baseUrl } = await startServer(AUTH_ENV));
  });

  afterEach(async () => {
    await stopServer(server);
    vi.unstubAllGlobals();
  });

  it('rejects a no-Origin client without the token with 401 + WWW-Authenticate: Bearer', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: VALID_BODY,
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer realm="spinpick-proxy"');
    expect((await res.json()).error).toContain('PROXY_AUTH_TOKEN');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects a no-Origin client with a wrong token with 401', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong-token' },
      body: VALID_BODY,
    });

    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe('Bearer realm="spinpick-proxy"'); // RFC 7235 on every unauthorized response
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('allows a no-Origin client presenting the correct token', async () => {
    upstreamFetch.mockResolvedValue(upstreamOk());
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: VALID_BODY,
    });

    expect(res.status).toBe(200);
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
  });

  it('does not require the token from browser clients (allowed origin)', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'm', messages: [] }),
    });

    expect(res.status).toBe(400); // passed origin + token gate, failed body validation
    expect(res.status).not.toBe(401);
  });

  it('serves GET /health without a token even when PROXY_AUTH_TOKEN is set (exempt)', async () => {
    const res = await fetch(`${baseUrl}/health`);

    expect(res.status).toBe(200);
    expect((await res.json()).keyConfigured).toBe(true);
  });

  it('serves OPTIONS preflight without a token when PROXY_AUTH_TOKEN is set (exempt)', async () => {
    const res = await fetch(`${baseUrl}/api/openrouter`, { method: 'OPTIONS' });

    expect(res.status).toBe(204);
  });
});

describe('proxy HTTP integration — per-IP rate limiting over real HTTP', () => {
  let server;
  let baseUrl;
  let upstreamFetch;

  beforeEach(async () => {
    upstreamFetch = stubUpstream();
    ({ server, baseUrl } = await startServer(PROD_ENV));
  });

  afterEach(async () => {
    await stopServer(server);
    vi.unstubAllGlobals();
  });

  it('returns 429 after the 60/min per-IP limit is exhausted over real HTTP', async () => {
    // 60 allowed requests pass the rate gate over the real socket; each fails
    // body validation at 400 (empty messages) so no upstream call is needed.
    const body = JSON.stringify({ model: 'm', messages: [] });
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${baseUrl}/api/openrouter`, {
        method: 'POST',
        headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
        body,
      });
      expect(res.status).toBe(400);
    }

    // 61st request from the same IP (127.0.0.1) → rate limited on the wire
    const limited = await fetch(`${baseUrl}/api/openrouter`, {
      method: 'POST',
      headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
      body,
    });

    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ error: 'Rate limit exceeded. Try again in a minute.' });
    expect(upstreamFetch).not.toHaveBeenCalled();
  }, 15000);

  it('gives a fresh server instance a fresh rate-limit budget (buckets are per-server)', async () => {
    // A second server has independent ipBuckets → its first request is NOT 429
    const { server: secondServer, baseUrl: secondBaseUrl } = await startServer(PROD_ENV);
    try {
      const res = await fetch(`${secondBaseUrl}/api/openrouter`, {
        method: 'POST',
        headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'm', messages: [] }),
      });

      expect(res.status).toBe(400); // passed the rate gate — fresh bucket
      expect(res.status).not.toBe(429);
    } finally {
      await stopServer(secondServer);
    }
  });
});
