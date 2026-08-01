import { EventEmitter } from 'node:events';

/* ==========================================================================
   Shared Test Helpers: server/proxy.mjs mocks & fixtures
   --------------------------------------------------------------------------
   Single source of truth for the request/response mocks and env fixtures
   used by the proxy test files, so they stay in sync:

   - proxy.test.mjs        (mocked-handler unit tests)
   - proxy.http.test.mjs   (real-server HTTP integration tests)
   - aiService.proxy.test.mjs (proxy-routing unit tests — reuses FAKE_KEY)

   mockReq/mockRes drive the handler directly (createProxyHandler() returns a
   pure (req, res) => Promise handler, so no port is needed). The env fixtures
   mirror what the proxy reads from process.env in production.
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
