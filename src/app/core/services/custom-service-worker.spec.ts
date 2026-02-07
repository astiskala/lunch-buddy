// No need to declare `importScripts`; use global assignment/mocking below.
import { vi } from 'vitest';

type Handler = (request: Request) => Promise<Response>;
type ApiRequestMatcher = (url: URL) => boolean;
type AppShellRequestMatcher = (request: Request, url: URL) => boolean;

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

const createNavigationRequest = (url: URL): Request => {
  const request = new Request(url.toString());
  try {
    Object.defineProperty(request, 'mode', {
      value: 'navigate',
      configurable: true,
    });
    return request;
  } catch {
    return {
      url: url.toString(),
      method: 'GET',
      mode: 'navigate',
      destination: 'document',
    } as Request;
  }
};

describe('custom service worker API handler', () => {
  let originalImportScripts: unknown;
  let originalFetch: unknown;
  let originalClients: unknown;
  let apiHandler: Handler | undefined;
  let appShellHandler: Handler | undefined;
  let apiCacheName: string | undefined;
  let shellCacheName: string | undefined;
  let appShellUrl: string | undefined;
  let offlineUrl: string | undefined;
  let isApiRequest: ApiRequestMatcher | undefined;
  let isAppShellRequest: AppShellRequestMatcher | undefined;
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
        __LB_SW_API__?: {
          handleApiRequest: Handler;
          handleAppShellRequest: Handler;
          isApiRequest: ApiRequestMatcher;
          isAppShellRequest: AppShellRequestMatcher;
          apiCacheName: string;
          shellCacheName: string;
          appShellUrl: string;
          offlineUrl: string;
        };
      }
    ).__LB_SW_API__;

    apiHandler = api?.handleApiRequest;
    appShellHandler = api?.handleAppShellRequest;
    apiCacheName = api?.apiCacheName;
    shellCacheName = api?.shellCacheName;
    appShellUrl = api?.appShellUrl;
    offlineUrl = api?.offlineUrl;
    isApiRequest = api?.isApiRequest;
    isAppShellRequest = api?.isAppShellRequest;
  });

  beforeEach(async () => {
    originalFetch = (globalThis as { fetch?: unknown }).fetch;
    originalClients = (globalThis as { clients?: unknown }).clients;
    (globalThis as { clients?: unknown }).clients = {
      matchAll: () => Promise.resolve([]),
      openWindow: vi.fn(),
    };
    clockInstalled = false;

    if (typeof caches !== 'undefined') {
      if (apiCacheName) {
        await caches.delete(apiCacheName);
      }
      if (shellCacheName) {
        await caches.delete(shellCacheName);
      }
    }
  });

  afterEach(async () => {
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    (globalThis as { clients?: unknown }).clients = originalClients;
    if (clockInstalled) {
      vi.useRealTimers();
    }
    if (typeof caches !== 'undefined') {
      if (apiCacheName) {
        await caches.delete(apiCacheName);
      }
      if (shellCacheName) {
        await caches.delete(shellCacheName);
      }
    }
  });

  afterAll(() => {
    (globalThis as unknown as { importScripts: unknown }).importScripts =
      originalImportScripts;
  });

  it('recognizes the production Lunch Money API host', () => {
    if (!isApiRequest) {
      return;
    }

    expect(isApiRequest(new URL('https://api.lunchmoney.app/v2/summary'))).toBe(
      true
    );
  });

  it('returns cached API data when the network is slow', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary');
    const cachedResponse = new Response('cached', { status: 200 });
    const cache = await caches.open(apiCacheName);
    await cache.put(request, cachedResponse.clone());

    const fetchDeferred = createDeferred<Response>();
    (globalThis as { fetch?: unknown }).fetch = () =>
      fetchDeferred.promise as unknown as Response;

    const resultPromise = apiHandler(request);

    await new Promise(resolve => setTimeout(resolve, 550));
    const result = await resultPromise;
    expect(await result.text()).toBe('cached');

    const persisted = await cache.match(request);
    expect(await persisted?.text()).toBe('cached');

    fetchDeferred.resolve(new Response('network', { status: 200 }));
  });

  it('uses fresh network data when available and caches it', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/categories');
    const networkResponse = new Response('network', { status: 200 });
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(networkResponse);

    const result = await apiHandler(request);
    expect(await result.text()).toBe('network');

    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(await cached?.text()).toBe('network');
  });

  it('returns an offline response when both network and cache are unavailable', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
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

    const result = await apiHandler(request);
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
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key', Accept: 'application/json' },
    });

    const networkPayload = JSON.stringify({ ok: true });
    const networkResponse = new Response(networkPayload, { status: 200 });
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(networkResponse);

    const result = await apiHandler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe(networkPayload);

    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(await cached?.text()).toBe(networkPayload);
  });

  it('falls back to cache for authenticated requests when network fails', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
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

    const result = await apiHandler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('cached-auth');
  });

  it('returns offline stub for unauthenticated requests when network and cache are unavailable', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
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

    const result = await apiHandler(request);
    expect(result.status).toBe(503);
    const body = (await result.json()) as Record<string, unknown>;
    expect(body).toEqual({
      error: 'offline',
      message: 'No cached data available',
    });
  });

  it('uses cached data when network times out for unauthenticated requests', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/categories');
    const cache = await caches.open(apiCacheName);
    await cache.put(request, new Response('cached-unauth', { status: 200 }));

    const deferred = createDeferred<Response>();
    (globalThis as { fetch?: unknown }).fetch = () =>
      deferred.promise as unknown as Response;

    const resultPromise = apiHandler(request);
    await new Promise(res => setTimeout(res, 520));
    const result = await resultPromise;
    expect(await result.text()).toBe('cached-unauth');

    // Resolve the network afterwards to avoid unhandled rejections.
    deferred.resolve(new Response('network-late', { status: 200 }));
  });

  it('falls back to cache when server returns non-OK for authenticated requests', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
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

    const result = await apiHandler(request);
    expect(await result.text()).toBe('cached-auth-non-ok');
  });

  it('returns server error response for authenticated requests when cache is empty', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
      return;
    }

    const request = new Request('https://api.lunchmoney.dev/v2/summary', {
      headers: { Authorization: 'Bearer test-key' },
    });

    // Return a non-OK response with no cache available
    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(new Response('Unauthorized', { status: 401 }));

    const result = await apiHandler(request);
    expect(result.status).toBe(401);
    expect(await result.text()).toBe('Unauthorized');

    // Verify the error response was not cached
    const cache = await caches.open(apiCacheName);
    const cached = await cache.match(request);
    expect(cached).toBeFalsy();
  });

  it('returns timeout error for authenticated requests when AbortError occurs', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
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

    const result = await apiHandler(request);
    expect(result.status).toBe(503);
    const body = (await result.json()) as Record<string, unknown>;
    expect(body['error']).toBe('timeout');
    expect(body['message']).toContain('timed out');
  });

  it('does not cache non-OK responses for unauthenticated requests', async () => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
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
    const result = await apiHandler(request);
    expect(result.status).toBe(401);

    // Verify the failed response was not cached
    const newCached = await cache.match(request);
    expect(newCached).toBeFalsy();
  });

  it('prefers fresh app shell content over cached content when navigation succeeds', async () => {
    if (
      typeof caches === 'undefined' ||
      !appShellHandler ||
      !shellCacheName ||
      !appShellUrl
    ) {
      return;
    }

    const cache = await caches.open(shellCacheName);
    await cache.put(
      appShellUrl,
      new Response('<html>cached-shell</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.resolve(
        new Response('<html>network-shell</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      );

    const request = createNavigationRequest(
      new URL('/', globalThis.location.origin)
    );

    if (isAppShellRequest) {
      expect(isAppShellRequest(request, new URL(request.url))).toBe(true);
    }

    const result = await appShellHandler(request);
    expect(await result.text()).toBe('<html>network-shell</html>');

    const persisted = await cache.match(appShellUrl);
    expect(await persisted?.text()).toBe('<html>network-shell</html>');
  });

  it('falls back to cached app shell content when navigation fetch fails', async () => {
    if (
      typeof caches === 'undefined' ||
      !appShellHandler ||
      !shellCacheName ||
      !appShellUrl
    ) {
      return;
    }

    const cache = await caches.open(shellCacheName);
    await cache.put(
      appShellUrl,
      new Response('<html>cached-shell</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const failingFetch: typeof fetch = (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => Promise.reject(new Error('network down'));

    Object.defineProperty(globalThis, 'fetch', {
      value: failingFetch,
      writable: true,
      configurable: true,
    });

    const request = createNavigationRequest(
      new URL('/', globalThis.location.origin)
    );

    const result = await appShellHandler(request);
    expect(await result.text()).toBe('<html>cached-shell</html>');
  });

  it('falls back to offline page when navigation fails and shell cache is empty', async () => {
    if (
      typeof caches === 'undefined' ||
      !appShellHandler ||
      !shellCacheName ||
      !offlineUrl
    ) {
      return;
    }

    const cache = await caches.open(shellCacheName);
    await cache.put(
      offlineUrl,
      new Response('<html>offline-fallback</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const failingFetch: typeof fetch = (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => Promise.reject(new Error('network down'));

    Object.defineProperty(globalThis, 'fetch', {
      value: failingFetch,
      writable: true,
      configurable: true,
    });

    const request = createNavigationRequest(
      new URL('/', globalThis.location.origin)
    );

    const result = await appShellHandler(request);
    expect(await result.text()).toBe('<html>offline-fallback</html>');
  });
});
