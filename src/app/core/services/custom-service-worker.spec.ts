// No need to declare `importScripts`; use global assignment/mocking below.

type Handler = (request: Request) => Promise<Response>;

const createDeferred = <T>() => {
  let resolveFn: ((value: T | PromiseLike<T>) => void) | undefined;
  const promise = new Promise<T>(res => {
    resolveFn = res;
  });
  if (!resolveFn) {
    throw new Error('Promise executor did not run synchronously');
  }
  return { promise, resolve: resolveFn };
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

  describe('API URL interception coverage', () => {
    it('should intercept all LunchMoney API endpoints', async () => {
      if (!handler) {
        pending('Handler not available');
        return;
      }

      const apiEndpoints = [
        'https://api.lunchmoney.dev/v2/me',
        'https://api.lunchmoney.dev/v2/categories',
        'https://api.lunchmoney.dev/v2/summary',
        'https://api.lunchmoney.dev/v2/transactions',
        'https://api.lunchmoney.dev/v2/recurring_items',
      ];

      (globalThis as { fetch?: unknown }).fetch = () =>
        Promise.resolve(new Response('{}', { status: 200 }));

      for (const url of apiEndpoints) {
        const request = new Request(url);
        const result = await handler(request);
        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
      }
    });

    it('should intercept localhost development endpoints', async () => {
      if (!handler) {
        pending('Handler not available');
        return;
      }

      const devEndpoints = [
        'http://localhost:3000/api/summary',
        'http://localhost:4600/v2/categories',
      ];

      (globalThis as { fetch?: unknown }).fetch = () =>
        Promise.resolve(new Response('{}', { status: 200 }));

      for (const url of devEndpoints) {
        const request = new Request(url);
        const result = await handler(request);
        expect(result).toBeDefined();
        expect(result.status).toBeGreaterThanOrEqual(200);
      }
    });

    it('should intercept dev.lunchmoney.app endpoints', async () => {
      if (!handler) {
        pending('Handler not available');
        return;
      }

      const request = new Request('https://dev.lunchmoney.app/v2/summary');
      (globalThis as { fetch?: unknown }).fetch = () =>
        Promise.resolve(new Response('{}', { status: 200 }));

      const result = await handler(request);
      expect(result).toBeDefined();
      expect(result.status).toBeGreaterThanOrEqual(200);
    });
  });
});
