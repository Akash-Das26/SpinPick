import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/* ==========================================================================
   Unit Tests: aiService — OpenRouter Proxy Routing
   --------------------------------------------------------------------------
   Verifies the proxy-preference / fallback chain introduced for the
   server-side OpenRouter proxy (server/proxy.mjs):

     1. When VITE_OPENROUTER_PROXY_URL is set → requests go to the proxy,
        never to the direct OpenRouter endpoint, even if a BYOK key exists.
     2. Proxy success → options returned with source 'OpenRouter AI (via proxy)'.
     3. Proxy failure (network error, non-2xx, unusable payload) → graceful
        fallback to the built-in keyword engine ('SpinPick Decision Engine').
     4. No proxy configured + BYOK key → direct browser OpenRouter calls are disabled.
     5. No proxy + no key → offline engine, fetch never called.

   NOTE: aiService captures VITE_OPENROUTER_PROXY_URL at module evaluation
   time, so each test re-imports the module fresh after stubbing the env var.
   ========================================================================== */

const _DIRECT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

/** Fresh-import aiService with the given VITE_OPENROUTER_PROXY_URL ('' = unset). */
async function loadAiService(proxyUrl) {
  vi.stubEnv('VITE_OPENROUTER_PROXY_URL', proxyUrl);
  vi.resetModules();
  const mod = await import('../../src/services/aiService.js');
  return mod.aiService;
}

/** A successful OpenAI-compatible chat completion response. */
function okResponse({ options, recommendedIndex = 0 } = {}) {
  const content = JSON.stringify({
    options: options || [
      { label: 'Proxy Option A', desc: 'From proxy', weight: 1 },
      { label: 'Proxy Option B', desc: 'Also from proxy', weight: 1 },
    ],
    recommendedIndex,
    reasoning: 'Proxy picked the best option.',
    actionSteps: ['Do step one', 'Do step two', 'Do step three'],
  });
  return {
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content } }] }),
    text: async () => content,
  };
}

/** An error response (non-2xx). */
function errorResponse(status = 401) {
  return {
    ok: false,
    status,
    json: async () => ({ error: { message: 'Unauthorized', code: status } }),
    text: async () => 'Unauthorized',
  };
}

describe('aiService — proxy routing (VITE_OPENROUTER_PROXY_URL)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    // Silence expected fallback warnings during failure-path tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('routes to the proxy endpoint when VITE_OPENROUTER_PROXY_URL is set', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    fetchMock.mockResolvedValue(okResponse());

    const result = await aiService.generateWheelOptions('What should I cook?', { optionCount: 4 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8787/api/openrouter');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body);
    expect(body.model).toBe('openrouter/auto');
    expect(body.messages).toHaveLength(2); // system + user
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'What should I cook?' });

    expect(result.source).toBe('OpenRouter AI (via proxy)');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].label).toBe('Proxy Option A');
    expect(result.winnerIndex).toBe(0);
  });

  it('does NOT forward user API key to proxy (security fix)', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    fetchMock.mockResolvedValue(okResponse());

    const result = await aiService.generateWheelOptions('What should I cook?', {
      apiKey: 'test-api-key-1234567890',
      optionCount: 4,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8787/api/openrouter');
    expect(init.headers.Authorization).toBeUndefined();
    const body = JSON.parse(init.body);
    // Security fix: apiKey should NOT be forwarded to proxy
    expect(body.apiKey).toBeUndefined();
    expect(result.source).toBe('OpenRouter AI (via proxy)');
  });

  it('strips trailing slashes from the configured proxy URL', async () => {
    const aiService = await loadAiService('http://localhost:8787/');
    fetchMock.mockResolvedValue(okResponse());

    await aiService.generateWheelOptions('What should I cook?');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8787/api/openrouter');
  });

  it('falls back to the offline engine when the proxy request fails (network error)', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(fetchMock).toHaveBeenCalledTimes(1); // proxy attempted once, no BYOK fallback
    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to the offline engine when the proxy returns a non-2xx status (401)', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    fetchMock.mockResolvedValue(errorResponse(401));

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back to the offline engine when the proxy returns an unusable payload', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    fetchMock.mockResolvedValue(okResponse({ options: [] })); // empty options array

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('falls back to the offline engine when the proxy returns a non-array options payload', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    // options is a string, not an array → Array.isArray guard rejects it
    fetchMock.mockResolvedValue(okResponse({ options: 'oops' }));

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('falls back to the offline engine when the proxy returns malformed JSON content', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    // choices[0].message.content is not valid JSON → JSON.parse throws
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'not json at all' } }] }),
      text: async () => 'not json at all',
    });

    const result = await aiService.generateWheelOptions('What should I cook?');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('does NOT fall back to BYOK when the proxy is configured but fails', async () => {
    const aiService = await loadAiService('http://localhost:8787');
    fetchMock.mockRejectedValue(new Error('proxy down'));

    const result = await aiService.generateWheelOptions('What should I cook?', {
      apiKey: 'test-api-key-1234567890', // should be ignored even on proxy failure
    });

    // Only one fetch call total — the direct endpoint is never hit
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8787/api/openrouter');
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('does not call the direct OpenRouter endpoint when no proxy is configured, even if a BYOK key exists', async () => {
    const aiService = await loadAiService('');
    fetchMock.mockResolvedValue(okResponse());

    const result = await aiService.generateWheelOptions('What should I cook?', {
      apiKey: 'test-api-key-1234567890',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe('SpinPick Decision Engine');
  });

  it('uses the offline engine (no fetch) when neither proxy nor BYOK key is configured', async () => {
    const aiService = await loadAiService('');

    const result = await aiService.generateWheelOptions('What should I cook?', { apiKey: '' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.source).toBe('SpinPick Decision Engine');
    expect(result.options.length).toBeGreaterThanOrEqual(2);
  });
});
