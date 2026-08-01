import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import { vi } from 'vitest';
import { createProxyHandler } from '../../server/proxy.mjs';

/* ==========================================================================
   Shared Test Helpers: server/proxy.mjs mocks, fixtures & real-server boots
   --------------------------------------------------------------------------
   Single source of truth for the request/response mocks, env fixtures, and
   real-HTTP server boot helpers used by the proxy/aiService test files so
   they stay in sync:

   - proxy.test.mjs                (mocked-handler unit tests)
   - proxy.http.test.mjs           (real-server HTTP integration tests)
   - aiService.proxy.test.mjs      (proxy-routing unit tests — reuses FAKE_KEY)
   - aiService.proxy.http.test.mjs (aiService ↔ real proxy end-to-end)

   mockReq/mockRes drive the handler directly (createProxyHandler() returns a
   pure (req, res) => Promise handler, so no port is needed). startServer /
   stopServer / stubUpstream boot the REAL server on an ephemeral port and
   stub global fetch so only the upstream OpenRouter call is mocked. The env
   fixtures mirror what the proxy reads from process.env in production.
   ========================================================================== */

/** Deliberately fake key — never a realistic secret (gitleaks-safe). */
export const FAKE_KEY = 'test-api-key-1234567890';

/** Shared-secret value used by the PROXY_AUTH_TOKEN gate tests. */
export const TOKEN = 'super-secret-token-42';

/** Production-like env with an origin allow-list + server key. */
export const PROD_ENV = {
  ALLOWED_ORIGINS: 'https://spinpick.app,http://localhost:5173',
  OPENROUTER_API_KEY: FAKE_KEY,
  NODE_ENV: 'production',
};

/** Env with a configured shared secret for non-browser clients. */
export const AUTH_ENV = { ...PROD_ENV, PROXY_AUTH_TOKEN: TOKEN };

/** Real fetch captured before any test stubs global fetch. */
const realFetch = globalThis.fetch;

/** Boot the REAL proxy server on an ephemeral port (port 0 → OS-assigned). */
export function startServer(env) {
  return new Promise((resolve, reject) => {
    const server = createServer(createProxyHandler(env));
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

/** Close the server, force-closing any keep-alive sockets so close resolves. */
export function stopServer(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(resolve);
  });
}

/**
 * Stub global fetch so ONLY the upstream OpenRouter call is mocked: localhost
 * requests (the test's own) pass through to the real network; anything else
 * (the proxy's call to openrouter.ai) hits the mock. Returns the mock so tests
 * can assert on the upstream call.
 */
export function stubUpstream() {
  const upstreamFetch = vi.fn();
  vi.stubGlobal('fetch', (url, init) => {
    const u = String(url);
    if (u.startsWith('http://127.0.0.1') || u.startsWith('http://localhost')) {
      return realFetch(url, init);
    }
    return upstreamFetch(url, init);
  });
  return upstreamFetch;
}

/**
 * Minimal request mock — EventEmitter so readBody's data/end/error hooks work.
 * Emits the body stream on the next tick so the handler's readBody() listeners
 * are attached before data flows.
 */
export function mockReq({ method = 'POST', url = '/api/openrouter', origin, authorization, body = '' } = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = {};
  if (origin) req.headers.origin = origin;
  if (authorization) req.headers.authorization = authorization;
  req.socket = { remoteAddress: '127.0.0.1' };
  process.nextTick(() => {
    if (body) req.emit('data', body);
    req.emit('end');
  });
  return req;
}

/** Minimal response mock capturing the status, headers and body. */
export function mockRes() {
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
