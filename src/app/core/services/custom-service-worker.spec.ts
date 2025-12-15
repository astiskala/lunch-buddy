// No need to declare `importScripts`; use global assignment/mocking below.

type Handler = (request: Request) => Promise<Response>;

const createDeferred = <T>() => {
  let resolveFn: (value: T | PromiseLike<T>) => void = () => {
    throw new Error('Deferred resolver not initialized');
  };
  const promise = new Promise<T>(res => {
    resolveFn = res;
  });
  return {
    promise,
    resolve(value: T | PromiseLike<T>) {
      resolveFn(value);
    },
  };
};

describe('custom service worker API handler', () => {
  let originalImportScripts: unknown;
  let originalFetch: unknown;
  let originalClients: unknown;
  let handler: Handler | undefined;
  let apiCacheName: string | undefined;
  let clockInstalled: boolean;

  beforeAll(async () => {
    originalImportScripts = (
      globalThis as unknown as { importScripts: unknown }
    ).importScripts;
    (globalThis as unknown as { importScripts: () => void }).importScripts =
      () => undefined;

    // @ts-expect-error Importing the built service worker for test coverage.
    await import('../../../../public/custom-service-worker.js');

    const api = (
      globalThis as unknown as {
        __LB_SW_API__?: { handleApiRequest: Handler; apiCacheName: string };
      }
    ).__LB_SW_API__;

    handler = api?.handleApiRequest;
    apiCacheName = api?.apiCacheName;
  });

  beforeEach(async () => {
    originalFetch = (globalThis as { fetch?: unknown }).fetch;
    originalClients = (globalThis as { clients?: unknown }).clients;
    (globalThis as { clients?: unknown }).clients = {
      matchAll: () => Promise.resolve([]),
      openWindow: jasmine.createSpy('openWindow'),
    };
    clockInstalled = false;

    if (typeof caches !== 'undefined' && apiCacheName) {
      await caches.delete(apiCacheName);
    }
  });

  afterEach(async () => {
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    (globalThis as { clients?: unknown }).clients = originalClients;
    if (clockInstalled) {
      jasmine.clock().uninstall();
    }
    if (typeof caches !== 'undefined' && apiCacheName) {
      await caches.delete(apiCacheName);
    }
  });

  afterAll(() => {
    (globalThis as unknown as { importScripts: unknown }).importScripts =
      originalImportScripts;
  });

  it('returns cached API data when the network is slow', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary');
    const cachedResponse = new Response('cached', { status: 200 });
    const cache = await caches.open(apiCacheName);
    await cache.put(request, cachedResponse.clone());

    const fetchDeferred = createDeferred<Response>();
    (globalThis as { fetch?: unknown }).fetch = () =>
      fetchDeferred.promise as unknown as Response;

    const resultPromise = handler(request);

    await new Promise(resolve => setTimeout(resolve, 550));
    const result = await resultPromise;
    expect(await result.text()).toBe('cached');

    const persisted = await cache.match(request);
    expect(await persisted?.text()).toBe('cached');

    fetchDeferred.resolve(new Response('network', { status: 200 }));
  });

  it('uses fresh network data when available and caches it', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/categories');
    const networkResponse = new Response('network', { status: 200 });
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(networkResponse);

    const result = await handler(request);
    expect(await result.text()).toBe('network');

    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(await cached?.text()).toBe('network');
  });

  it('returns an offline response when both network and cache are unavailable', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary');
    const failingFetch: typeof fetch = (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => Promise.reject(new Error('network down'));

    Object.defineProperty(globalThis, 'fetch', {
      value: failingFetch,
      writable: true,
      configurable: true,
    });

    const result = await handler(request);
    expect(result.status).toBe(503);
    const body: unknown = await result.json();
    expect(body).toEqual({
      error: 'offline',
      message: 'No cached data available',
    });

    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeFalsy();
  });

  it('uses network-first for authenticated requests and populates cache on success', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key', Accept: 'application/json' },
    });

    const networkPayload = JSON.stringify({ ok: true });
    const networkResponse = new Response(networkPayload, { status: 200 });
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(networkResponse);

    const result = await handler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe(networkPayload);

    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(await cached?.text()).toBe(networkPayload);
  });

  it('falls back to cache for authenticated requests when network fails', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key', Accept: 'application/json' },
    });

    const cachedResponse = new Response('cached-auth', { status: 200 });
    const cache = await caches.open(apiCacheName);
    await cache.put(request, cachedResponse.clone());

    const failingFetch: typeof fetch = (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => Promise.reject(new Error('network down'));

    Object.defineProperty(globalThis, 'fetch', {
      value: failingFetch,
      writable: true,
      configurable: true,
    });

    const result = await handler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('cached-auth');
  });

  it('returns offline stub for unauthenticated requests when network and cache are unavailable', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary');

    const failingFetch: typeof fetch = (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => Promise.reject(new Error('network down'));

    Object.defineProperty(globalThis, 'fetch', {
      value: failingFetch,
      writable: true,
      configurable: true,
    });

    const result = await handler(request);
    expect(result.status).toBe(503);
    const body = (await result.json()) as Record<string, unknown>;
    expect(body).toEqual({
      error: 'offline',
      message: 'No cached data available',
    });
  });

  it('uses cached data when network times out for unauthenticated requests', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/categories');
    const cache = await caches.open(apiCacheName);
    await cache.put(request, new Response('cached-unauth', { status: 200 }));

    const deferred = createDeferred<Response>();
    (globalThis as { fetch?: unknown }).fetch = () =>
      deferred.promise as unknown as Response;

    const resultPromise = handler(request);
    await new Promise(res => setTimeout(res, 520));
    const result = await resultPromise;
    expect(await result.text()).toBe('cached-unauth');

    // Resolve the network afterwards to avoid unhandled rejections.
    deferred.resolve(new Response('network-late', { status: 200 }));
  });

  it('falls back to cache when server returns non-OK for authenticated requests', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key' },
    });

    const cache = await caches.open(apiCacheName);
    await cache.put(
      request,
      new Response('cached-auth-non-ok', { status: 200 })
    );

    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(new Response('server-error', { status: 500 }));

    const result = await handler(request);
    expect(await result.text()).toBe('cached-auth-non-ok');
  });

  it('returns server error response for authenticated requests when cache is empty', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key' },
    });

    // Return a non-OK response with no cache available
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(new Response('Unauthorized', { status: 401 }));

    const result = await handler(request);
    expect(result.status).toBe(401);
    expect(await result.text()).toBe('Unauthorized');

    // Verify the error response was not cached
    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeFalsy();
  });

  it('returns timeout error for authenticated requests when AbortError occurs', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key' },
    });

    const abortError = new Error('AbortError');
    Object.defineProperty(abortError, 'name', {
      value: 'AbortError',
      writable: false,
      configurable: true,
    });

    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.reject(abortError);

    const result = await handler(request);
    expect(result.status).toBe(503);
    const body = (await result.json()) as Record<string, unknown>;
    expect(body['error']).toBe('timeout');
    expect(body['message']).toContain('timed out');
  });

  it('does not cache non-OK responses for unauthenticated requests', async () => {
    if (typeof caches === 'undefined' || !handler || !apiCacheName) {
      pending('Cache API not available in this environment');
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary');
    const cache = await caches.open(apiCacheName);

    // Ensure request is not cached initially
    const initialCached = await cache.match(request);
    expect(initialCached).toBeFalsy();

    // Return a non-OK response
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(new Response('error', { status: 401 }));
    const result = await handler(request);
    expect(result.status).toBe(401);

    // Verify the failed response was not cached
    const newCached = await cache.match(request);
    expect(newCached).toBeFalsy();
  });
});
