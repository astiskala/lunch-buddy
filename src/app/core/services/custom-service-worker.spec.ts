// No need to declare `importScripts`; use global assignment/mocking below.
import { vi } from 'vitest';
import { createDeferred } from '../../../test/deferred';

type Handler = (request: Request) => Promise<Response>;
type ApiRequestMatcher = (url: URL) => boolean;
type AppShellRequestMatcher = (request: Request, url: URL) => boolean;
interface RawAlert {
  categoryId: number | null;
  categoryName: string;
  isIncome: boolean;
  budgetAmount: number;
  spent: number;
  status: 'over' | 'at-risk' | 'on-track';
}

interface EnrichedAlert extends RawAlert {
  displayType: 'over' | 'at-risk' | 'income-behind';
  magnitude: number;
}

type NotificationPayloadBuilder = (
  alerts: EnrichedAlert[],
  preferredCurrency: string | null,
  monthProgress: number
) => { title: string; body: string };

type AlertFilter = (
  progress: RawAlert[],
  hiddenCategoryIds: (number | null)[],
  monthProgress: number
) => RawAlert[];

type AlertEnricher = (
  alerts: RawAlert[],
  monthProgress: number
) => EnrichedAlert[];

type SignatureBuilder = (alerts: EnrichedAlert[]) => string;
interface ApiTestContext {
  handler: Handler;
  cacheName: string;
}

interface ShellTestContext {
  handler: Handler;
  cacheName: string;
}

const API_SUMMARY_URL = 'https://api.lunchmoney.dev/v2/summary';
const API_CATEGORIES_URL = 'https://api.lunchmoney.dev/v2/categories';
const AUTH_HEADERS = { Authorization: 'Bearer test-key' } as const;

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

const createAuthenticatedRequest = (
  url: string,
  includeAcceptHeader = false
): Request =>
  new Request(url, {
    headers: includeAcceptHeader
      ? { ...AUTH_HEADERS, Accept: 'application/json' }
      : AUTH_HEADERS,
  });

const createRootNavigationRequest = (): Request =>
  createNavigationRequest(new URL('/', globalThis.location.origin));

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
  let buildNotificationPayload: NotificationPayloadBuilder | undefined;
  let filterAlerts: AlertFilter | undefined;
  let enrichAlerts: AlertEnricher | undefined;
  let buildSignature: SignatureBuilder | undefined;

  const resolveApiTestContext = (): ApiTestContext | undefined => {
    if (typeof caches === 'undefined' || !apiHandler || !apiCacheName) {
      return undefined;
    }

    return { handler: apiHandler, cacheName: apiCacheName };
  };

  const resolveShellTestContext = (): ShellTestContext | undefined => {
    if (typeof caches === 'undefined' || !appShellHandler || !shellCacheName) {
      return undefined;
    }

    return { handler: appShellHandler, cacheName: shellCacheName };
  };

  const setFetchResponse = (response: Response): void => {
    (globalThis as { fetch?: unknown }).fetch = () => Promise.resolve(response);
  };

  const setFailingFetch = (message = 'network down'): void => {
    const failingFetch: typeof fetch = (
      _input: RequestInfo | URL,
      _init?: RequestInit
    ) => Promise.reject(new Error(message));

    Object.defineProperty(globalThis, 'fetch', {
      value: failingFetch,
      writable: true,
      configurable: true,
    });
  };

  const clearTestCaches = async (): Promise<void> => {
    if (typeof caches === 'undefined') {
      return;
    }

    if (apiCacheName) {
      await caches.delete(apiCacheName);
    }
    if (shellCacheName) {
      await caches.delete(shellCacheName);
    }
  };

  beforeAll(async () => {
    originalImportScripts = (
      globalThis as unknown as { importScripts: unknown }
    ).importScripts;
    (globalThis as unknown as { importScripts: () => void }).importScripts =
      () => undefined;

    const serviceWorkerScriptPath =
      '../../../../public/custom-service-worker.js';
    await import(serviceWorkerScriptPath);

    const api = (
      globalThis as unknown as {
        __LB_SW_API__?: {
          handleApiRequest: Handler;
          handleAppShellRequest: Handler;
          isApiRequest: ApiRequestMatcher;
          isAppShellRequest: AppShellRequestMatcher;
          buildNotificationPayload: NotificationPayloadBuilder;
          enrichAlerts: AlertEnricher;
          filterAlerts: AlertFilter;
          buildSignature: SignatureBuilder;
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
    buildNotificationPayload = api?.buildNotificationPayload;
    enrichAlerts = api?.enrichAlerts;
    filterAlerts = api?.filterAlerts;
    buildSignature = api?.buildSignature;
  });

  beforeEach(async () => {
    originalFetch = (globalThis as { fetch?: unknown }).fetch;
    originalClients = (globalThis as { clients?: unknown }).clients;
    (globalThis as { clients?: unknown }).clients = {
      matchAll: () => Promise.resolve([]),
      openWindow: vi.fn(),
    };
    await clearTestCaches();
  });

  afterEach(async () => {
    (globalThis as { fetch?: unknown }).fetch = originalFetch;
    (globalThis as { clients?: unknown }).clients = originalClients;
    await clearTestCaches();
  });

  afterAll(() => {
    (globalThis as unknown as { importScripts: unknown }).importScripts =
      originalImportScripts;
  });

  it('exposes the service-worker test API', () => {
    expect(apiHandler).toBeTypeOf('function');
    expect(appShellHandler).toBeTypeOf('function');
    expect(buildNotificationPayload).toBeTypeOf('function');
    expect(enrichAlerts).toBeTypeOf('function');
    expect(filterAlerts).toBeTypeOf('function');
    expect(buildSignature).toBeTypeOf('function');
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
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = new Request(API_SUMMARY_URL);
    const cachedResponse = new Response('cached', { status: 200 });
    const cache = await caches.open(context.cacheName);
    await cache.put(request, cachedResponse.clone());

    const fetchDeferred = createDeferred<Response>();
    (globalThis as { fetch?: unknown }).fetch = () =>
      fetchDeferred.promise as unknown as Response;

    const resultPromise = context.handler(request);

    await new Promise(resolve => setTimeout(resolve, 550));
    const result = await resultPromise;
    expect(await result.text()).toBe('cached');

    const persisted = await cache.match(request);
    expect(await persisted?.text()).toBe('cached');

    fetchDeferred.resolve(new Response('network', { status: 200 }));
  });

  it('uses fresh network data when available and caches it', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = new Request(API_CATEGORIES_URL);
    const networkResponse = new Response('network', { status: 200 });
    setFetchResponse(networkResponse);

    const result = await context.handler(request);
    expect(await result.text()).toBe('network');

    const cache = await caches.open(context.cacheName);
    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(await cached?.text()).toBe('network');
  });

  it('returns an offline response when both network and cache are unavailable', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = new Request(API_SUMMARY_URL);
    setFailingFetch();

    const result = await context.handler(request);
    expect(result.status).toBe(503);
    const body: unknown = await result.json();
    expect(body).toEqual({
      error: 'offline',
      message: 'No cached data available',
    });

    const cache = await caches.open(context.cacheName);
    const cached = await cache.match(request);
    expect(cached).toBeFalsy();
  });

  it('uses network-first for authenticated requests and populates cache on success', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = createAuthenticatedRequest(API_SUMMARY_URL, true);

    const networkPayload = JSON.stringify({ ok: true });
    const networkResponse = new Response(networkPayload, { status: 200 });
    setFetchResponse(networkResponse);

    const result = await context.handler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe(networkPayload);

    const cache = await caches.open(context.cacheName);
    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(await cached?.text()).toBe(networkPayload);
  });

  it('falls back to cache for authenticated requests when network fails', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = createAuthenticatedRequest(API_SUMMARY_URL, true);

    const cachedResponse = new Response('cached-auth', { status: 200 });
    const cache = await caches.open(context.cacheName);
    await cache.put(request, cachedResponse.clone());

    setFailingFetch();

    const result = await context.handler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('cached-auth');
  });

  it('returns offline stub for unauthenticated requests when network and cache are unavailable', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = new Request(API_SUMMARY_URL);
    setFailingFetch();

    const result = await context.handler(request);
    expect(result.status).toBe(503);
    const body = (await result.json()) as Record<string, unknown>;
    expect(body).toEqual({
      error: 'offline',
      message: 'No cached data available',
    });
  });

  it('uses cached data when network times out for unauthenticated requests', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = new Request(API_CATEGORIES_URL);
    const cache = await caches.open(context.cacheName);
    await cache.put(request, new Response('cached-unauth', { status: 200 }));

    const deferred = createDeferred<Response>();
    (globalThis as { fetch?: unknown }).fetch = () =>
      deferred.promise as unknown as Response;

    const resultPromise = context.handler(request);
    await new Promise(res => setTimeout(res, 520));
    const result = await resultPromise;
    expect(await result.text()).toBe('cached-unauth');

    // Resolve the network afterwards to avoid unhandled rejections.
    deferred.resolve(new Response('network-late', { status: 200 }));
  });

  it('falls back to cache when server returns non-OK for authenticated requests', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = createAuthenticatedRequest(API_SUMMARY_URL);

    const cache = await caches.open(context.cacheName);
    await cache.put(
      request,
      new Response('cached-auth-non-ok', { status: 200 })
    );

    setFetchResponse(new Response('server-error', { status: 500 }));

    const result = await context.handler(request);
    expect(await result.text()).toBe('cached-auth-non-ok');
  });

  it('does not fall back to cache when server returns 401 for authenticated requests', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = createAuthenticatedRequest(API_SUMMARY_URL);

    const cache = await caches.open(context.cacheName);
    await cache.put(request, new Response('stale-auth-cache', { status: 200 }));

    setFetchResponse(new Response('Unauthorized', { status: 401 }));

    const result = await context.handler(request);
    expect(result.status).toBe(401);
    expect(await result.text()).toBe('Unauthorized');
  });

  it('returns server error response for authenticated requests when cache is empty', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = createAuthenticatedRequest(API_SUMMARY_URL);

    // Return a non-OK response with no cache available.
    setFetchResponse(new Response('Unauthorized', { status: 401 }));

    const result = await context.handler(request);
    expect(result.status).toBe(401);
    expect(await result.text()).toBe('Unauthorized');

    // Verify that the error response was not cached.
    const cache = await caches.open(context.cacheName);
    const cached = await cache.match(request);
    expect(cached).toBeFalsy();
  });

  it('returns timeout error for authenticated requests when AbortError occurs', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = createAuthenticatedRequest(API_SUMMARY_URL);

    const abortError = new Error('AbortError');
    Object.defineProperty(abortError, 'name', {
      value: 'AbortError',
      writable: false,
      configurable: true,
    });

    (globalThis as { fetch?: unknown }).fetch = () =>
      Promise.reject(abortError);

    const result = await context.handler(request);
    expect(result.status).toBe(503);
    const body = (await result.json()) as Record<string, unknown>;
    expect(body['error']).toBe('timeout');
    expect(body['message']).toContain('timed out');
  });

  it('does not cache non-OK responses for unauthenticated requests', async () => {
    const context = resolveApiTestContext();
    if (!context) {
      return;
    }

    const request = new Request(API_SUMMARY_URL);
    const cache = await caches.open(context.cacheName);

    // Ensure the request is not cached initially.
    const initialCached = await cache.match(request);
    expect(initialCached).toBeFalsy();

    // Return a non-OK response.
    setFetchResponse(new Response('error', { status: 401 }));
    const result = await context.handler(request);
    expect(result.status).toBe(401);

    // Verify that the failed response was not cached.
    const newCached = await cache.match(request);
    expect(newCached).toBeFalsy();
  });

  it('prefers fresh app shell content over cached content when navigation succeeds', async () => {
    const context = resolveShellTestContext();
    if (!context || !appShellUrl) {
      return;
    }

    const cache = await caches.open(context.cacheName);
    await cache.put(
      appShellUrl,
      new Response('<html>cached-shell</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    setFetchResponse(
      new Response('<html>network-shell</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const request = createRootNavigationRequest();

    if (isAppShellRequest) {
      expect(isAppShellRequest(request, new URL(request.url))).toBe(true);
    }

    const result = await context.handler(request);
    expect(await result.text()).toBe('<html>network-shell</html>');

    const persisted = await cache.match(appShellUrl);
    expect(await persisted?.text()).toBe('<html>network-shell</html>');
  });

  it('falls back to cached app shell content when navigation fetch fails', async () => {
    const context = resolveShellTestContext();
    if (!context || !appShellUrl) {
      return;
    }

    const cache = await caches.open(context.cacheName);
    await cache.put(
      appShellUrl,
      new Response('<html>cached-shell</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    setFailingFetch();

    const request = createRootNavigationRequest();

    const result = await context.handler(request);
    expect(await result.text()).toBe('<html>cached-shell</html>');
  });

  it('falls back to offline page when navigation fails and shell cache is empty', async () => {
    const context = resolveShellTestContext();
    if (!context || !offlineUrl) {
      return;
    }

    const cache = await caches.open(context.cacheName);
    await cache.put(
      offlineUrl,
      new Response('<html>offline-fallback</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    setFailingFetch();

    const request = createRootNavigationRequest();

    const result = await context.handler(request);
    expect(await result.text()).toBe('<html>offline-fallback</html>');
  });

  it('replaces poisoned script cache entries with network JavaScript responses', async () => {
    const context = resolveShellTestContext();
    if (!context) {
      return;
    }

    const request = new Request(`${globalThis.location.origin}/main-TEST.js`);
    const cache = await caches.open(context.cacheName);
    await cache.put(
      request,
      new Response('<html>poisoned</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    setFetchResponse(
      new Response('console.log("healthy");', {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' },
      })
    );

    const result = await context.handler(request);
    expect(await result.text()).toContain('console.log("healthy")');

    const cached = await cache.match(request);
    expect(cached).toBeTruthy();
    expect(cached?.headers.get('Content-Type')).toContain(
      'application/javascript'
    );
  });

  it('does not cache incompatible HTML responses for script requests', async () => {
    const context = resolveShellTestContext();
    if (!context) {
      return;
    }

    const request = new Request(`${globalThis.location.origin}/main-BAD.js`);
    const cache = await caches.open(context.cacheName);

    setFetchResponse(
      new Response('<html>wrong-mime</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      })
    );

    const result = await context.handler(request);
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('<html>wrong-mime</html>');

    const cached = await cache.match(request);
    expect(cached).toBeFalsy();
  });

  const findLine = (body: string, needle: string): string =>
    body.split('\n').find(line => line.includes(needle)) ?? '';

  const makeAlert = (overrides: Partial<RawAlert>): RawAlert => ({
    categoryId: 1,
    categoryName: 'Sample',
    isIncome: false,
    budgetAmount: 100,
    spent: 50,
    status: 'on-track',
    ...overrides,
  });

  it('includes category names and per-item amounts in the notification body', () => {
    if (!enrichAlerts || !buildNotificationPayload) return;

    const enriched = enrichAlerts(
      [
        makeAlert({
          categoryId: 1,
          categoryName: 'Groceries',
          budgetAmount: 300,
          spent: 340,
          status: 'over',
        }),
        makeAlert({
          categoryId: 2,
          categoryName: 'Dining Out',
          budgetAmount: 100,
          spent: 125,
          status: 'over',
        }),
        makeAlert({
          categoryId: 3,
          categoryName: 'Entertainment',
          budgetAmount: 100,
          spent: 95,
          status: 'at-risk',
        }),
      ],
      0.55
    );

    const payload = buildNotificationPayload(enriched, 'USD', 0.55);

    expect(payload.title).toBe('Budget alerts · 2 over, 1 at risk');
    expect(payload.body).toContain('55% through month');
    expect(payload.body).toContain('Over budget:');
    expect(findLine(payload.body, 'Groceries')).toContain('40');
    expect(findLine(payload.body, 'Groceries')).toContain('over');
    expect(findLine(payload.body, 'Dining Out')).toContain('25');
    expect(payload.body).toContain('At risk:');
    expect(findLine(payload.body, 'Entertainment')).toContain('5');
    expect(findLine(payload.body, 'Entertainment')).toContain('left');
  });

  it('sorts over-budget by largest overage and at-risk by least remaining', () => {
    if (!enrichAlerts || !buildNotificationPayload) return;

    const enriched = enrichAlerts(
      [
        makeAlert({
          categoryId: 1,
          categoryName: 'Small Over',
          budgetAmount: 100,
          spent: 110,
          status: 'over',
        }),
        makeAlert({
          categoryId: 2,
          categoryName: 'Big Over',
          budgetAmount: 100,
          spent: 200,
          status: 'over',
        }),
        makeAlert({
          categoryId: 3,
          categoryName: 'Roomy',
          budgetAmount: 100,
          spent: 50,
          status: 'at-risk',
        }),
        makeAlert({
          categoryId: 4,
          categoryName: 'Tight',
          budgetAmount: 100,
          spent: 95,
          status: 'at-risk',
        }),
      ],
      0.4
    );

    const { body } = buildNotificationPayload(enriched, 'USD', 0.4);
    expect(body.indexOf('Big Over')).toBeLessThan(body.indexOf('Small Over'));
    expect(body.indexOf('Tight')).toBeLessThan(body.indexOf('Roomy'));
  });

  it('truncates sections to 4 items and appends "+ N more"', () => {
    if (!enrichAlerts || !buildNotificationPayload) return;

    const overs = Array.from({ length: 6 }, (_, i) =>
      makeAlert({
        categoryId: i + 1,
        categoryName: `Cat ${String(i + 1)}`,
        budgetAmount: 100,
        spent: 100 + (i + 1) * 10,
        status: 'over',
      })
    );

    const payload = buildNotificationPayload(
      enrichAlerts(overs, 0.5),
      'USD',
      0.5
    );
    expect(payload.body).toContain('+ 2 more');
    expect(
      payload.body.split('\n').filter(line => line.startsWith('• '))
    ).toHaveLength(4);
  });

  it('includes income-behind section when month is past half', () => {
    if (!filterAlerts || !enrichAlerts || !buildNotificationPayload) return;

    const income = makeAlert({
      categoryId: 10,
      categoryName: 'Salary',
      isIncome: true,
      budgetAmount: 1000,
      spent: -400,
      status: 'at-risk',
    });

    const filtered = filterAlerts([income], [], 0.6);
    const enriched = enrichAlerts(filtered, 0.6);
    const payload = buildNotificationPayload(enriched, 'USD', 0.6);

    expect(payload.title).toContain('1 income behind');
    expect(payload.body).toContain('Income behind:');
    expect(findLine(payload.body, 'Salary')).toContain('200');
    expect(findLine(payload.body, 'Salary')).toContain('short');
  });

  it('suppresses income-behind alerts in the first half of the month', () => {
    if (!filterAlerts) return;

    const income = makeAlert({
      categoryId: 10,
      categoryName: 'Salary',
      isIncome: true,
      budgetAmount: 1000,
      spent: 0,
      status: 'at-risk',
    });

    expect(filterAlerts([income], [], 0.2)).toHaveLength(0);
    expect(filterAlerts([income], [], 0.5)).toHaveLength(1);
  });

  it('buckets amounts in the signature so small changes do not re-fire', () => {
    if (!enrichAlerts || !buildSignature) return;

    const base = (spent: number): RawAlert =>
      makeAlert({
        categoryId: 1,
        categoryName: 'Groceries',
        budgetAmount: 100,
        spent,
        status: 'over',
      });

    const sigAt140 = buildSignature(enrichAlerts([base(140)], 0.5));
    const sigAt145 = buildSignature(enrichAlerts([base(145)], 0.5));
    const sigAt155 = buildSignature(enrichAlerts([base(155)], 0.5));

    expect(sigAt140).toBe(sigAt145);
    expect(sigAt140).not.toBe(sigAt155);
  });

  it('decodes HTML entities in category names', () => {
    if (!enrichAlerts || !buildNotificationPayload) return;

    const enriched = enrichAlerts(
      [
        makeAlert({
          categoryName: 'Food &amp; Drink',
          budgetAmount: 100,
          spent: 150,
          status: 'over',
        }),
      ],
      0.5
    );

    const payload = buildNotificationPayload(enriched, 'USD', 0.5);
    expect(payload.body).toContain('Food & Drink');
    expect(payload.body).not.toContain('&amp;');
  });

  it('respects preferred currency in formatted amounts', () => {
    if (!enrichAlerts || !buildNotificationPayload) return;

    const enriched = enrichAlerts(
      [
        makeAlert({
          categoryName: 'Groceries',
          budgetAmount: 100,
          spent: 140,
          status: 'over',
        }),
      ],
      0.5
    );

    const payload = buildNotificationPayload(enriched, 'EUR', 0.5);
    const line = findLine(payload.body, 'Groceries');
    expect(line).toContain('40');
    expect(line).toContain('over');
    expect(line).not.toContain('$40');
  });
});
