// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FAKE_KEY, PROD_ENV, AUTH_ENV, startServer, stopServer, stubUpstream } from '../helpers/httpMocks.mjs';

/* ==========================================================================
   HTTP Integration Tests: aiService ↔ server/proxy.mjs (live, end-to-end)
   --------------------------------------------------------------------------
   Extends the proxy HTTP suite to the aiService routing path: instead of
   driving the proxy directly with raw fetch, this suite boots the REAL proxy
   on an ephemeral port, points aiService at it via VITE_OPENROUTER_PROXY_URL
   (stubbed before module eval, as in aiService.proxy.test.mjs), and verifies
   the whole chain:

     1. aiService's generateWheelOptions() POSTs to {proxyUrl}/api/openrouter
        and parses the proxy-relayed upstream response ('OpenRouter AI (via
        proxy)' — proving the request reached /api/openrouter and round-tripped).
     2. The proxy forwards to OpenRouter with the SERVER key (aiService sends
        no Authorization — the key stays server-side).
     3. Proxy-side rejection (401 token gate) → graceful offline fallback,
        upstream never called.
     4. Proxy unreachable (network error on a real closed port) → graceful
        offline fallback.
     5. Proxy rate-limit rejection (429 after the 60/min per-IP budget is
        exhausted) → graceful offline fallback, upstream never called.
     6. Malformed upstream payload (the proxy relays garbage JSON verbatim) →
        graceful offline fallback — upstream WAS called; the failure is in
        parsing the relayed body, not in routing.
     7. Valid JSON whose options array is empty (relayed verbatim) → graceful
        offline fallback — payload validation (not parsing) rejects it.

   Only the upstream OpenRouter call is mocked (localhost pass-through fetch
   stub from tests/helpers/httpMocks.mjs); everything else is genuinely wired.
   Runs under the `node` environment (not jsdom) since it needs real sockets.
   ========================================================================== */

/** Fresh-import aiService pointing at the given proxy URL (env captured at module eval). */
async function loadAiService(proxyUrl) {
  vi.stubEnv('VITE_OPENROUTER_PROXY_URL', proxyUrl);
  vi.resetModules();
  const mod = await import('../../src/services/aiService.js');
  return mod.aiService;
}

/**
 * Upstream OpenAI-compatible chat completion. The proxy relays the upstream
 * body verbatim, so text() must return the full choices envelope (aiService
 * reads choices[0].message.content and JSON-parses it).
 */
function upstreamAiOk() {
  const inner = JSON.stringify({
    options: [
      { label: 'Proxy Option A', desc: 'From proxy', weight: 1 },
      { label: 'Proxy Option B', desc: 'Also from proxy', weight: 1 },
    ],
    recommendedIndex: 0,
    reasoning: 'Proxy picked the best option.',
    actionSteps: ['Do step one', 'Do step two', 'Do step three'],
  });
  const envelope = JSON.stringify({ choices: [{ message: { content: inner } }] });
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(envelope),
    text: async () => envelope,
  };
}

describe('aiService ↔ proxy HTTP integration — live end-to-end routing', () => {
  let server;
  let baseUrl;
  let upstreamFetch;

  beforeEach(async () => {
    upstreamFetch = stubUpstream();
    ({ server, baseUrl } = await startServer(PROD_ENV));
    // Silence expected fallback warnings during the failure-path tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(async () => {
    await stopServer(server);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('routes aiService through the live proxy: reaches /api/openrouter and returns parsed options', async () => {
    upstreamFetch.mockResolvedValue(upstreamAiOk());
    const aiService = await loadAiService(baseUrl);

    const result = await aiService.generateWheelOptions('What should I cook?', { optionCount: 4 });

    // Success source proves the request round-tripped through the real proxy
    // (any other route — unknown path, gate rejection — would fall back offline).
    expect(result.source).toBe('OpenRouter AI (via proxy)');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].label).toBe('Proxy Option A');
    expect(result.winnerIndex).toBe(0);

    // The proxy forwarded to OpenRouter exactly once → request reached /api/openrouter
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
    const [url, init] = upstreamFetch.mock.calls[0];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    // Server key added by the proxy — aiService must NOT send one (key stays server-side)
    expect(init.headers.Authorization).toBe(`Bearer ${FAKE_KEY}`);

    // aiService's payload was relayed upstream unchanged
    const forwarded = JSON.parse(init.body);
    expect(forwarded.model).toBe('openrouter/auto');
    expect(forwarded.messages).toHaveLength(2);
    expect(forwarded.messages[1]).toEqual({ role: 'user', content: 'What should I cook?' });
  });

  it('falls back to the offline engine when the live proxy 401s (token gate, no client token)', async () => {
    const { server: tokenServer, baseUrl: tokenBaseUrl } = await startServer(AUTH_ENV);
    try {
      upstreamFetch.mockRejectedValue(new Error('must not be reached'));
      const aiService = await loadAiService(tokenBaseUrl);

      const result = await aiService.generateWheelOptions('What should I cook?');

      expect(result.source).toBe('SpinPick Decision Engine');
      expect(result.options.length).toBeGreaterThanOrEqual(2);
      expect(upstreamFetch).not.toHaveBeenCalled(); // blocked at the proxy gate, never forwarded
    } finally {
      await stopServer(tokenServer);
    }
  });

  it('falls back to the offline engine when the live proxy is unreachable (network error)', async () => {
    // Boot once to get a real ephemeral URL, then shut it down so fetch hits a closed port
    const { server: deadServer, baseUrl: deadBaseUrl } = await startServer(PROD_ENV);
    await stopServer(deadServer);

    const aiService = await loadAiService(deadBaseUrl);
    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(result.source).toBe('SpinPick Decision Engine');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('falls back to the offline engine when the live proxy rate-limits (429)', async () => {
    // Exhaust the server's per-IP budget (60/min) over the real socket, so the
    // aiService call below hits the 429 rate-limit gate instead of the upstream.
    const body = JSON.stringify({ model: 'm', messages: [] });
    for (let i = 0; i < 60; i++) {
      const res = await fetch(`${baseUrl}/api/openrouter`, {
        method: 'POST',
        headers: { Origin: 'https://spinpick.app', 'Content-Type': 'application/json' },
        body,
      });
      expect(res.status).toBe(400);
    }

    upstreamFetch.mockRejectedValue(new Error('must not be reached'));
    const aiService = await loadAiService(baseUrl);
    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
    expect(upstreamFetch).not.toHaveBeenCalled(); // 429 gate fires before any forward
  }, 15000);

  it('falls back to the offline engine when the proxy relays a malformed upstream payload (garbage JSON)', async () => {
    // Upstream returns 200 with a non-JSON body; the proxy relays it verbatim
    // (it only consumes upstream.text()), so aiService's response.json() on
    // the relayed garbage throws and it falls back offline.
    upstreamFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html>502 bad gateway</html>',
    });
    const aiService = await loadAiService(baseUrl);

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
    // Unlike the 401/429/network cases, the upstream WAS called — the failure
    // is in parsing the relayed payload, not in routing/gating.
    expect(upstreamFetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to the offline engine when the proxy relays valid JSON with an empty options array', async () => {
    // A well-formed envelope that parses fine, but options is [] → aiService's
    // payload-validation guard (Array.isArray && length > 0) rejects it and it
    // falls back offline. The proxy only consumes upstream.text(), relaying it
    // verbatim; aiService's response.json() on the relayed envelope succeeds.
    const envelope = JSON.stringify({
      choices: [{
        message: {
          content: JSON.stringify({
            options: [],
            recommendedIndex: 0,
            reasoning: 'No options.',
            actionSteps: [],
          }),
        },
      }],
    });
    upstreamFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => envelope,
    });
    const aiService = await loadAiService(baseUrl);

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
    expect(upstreamFetch).toHaveBeenCalledTimes(1); // forwarded, then rejected by validation
  });
});
