// Import Angular service worker first
importScripts('./ngsw-worker.js');

const PERIODIC_SYNC_TAG = 'lunchbuddy-daily-budget-sync';
const DB_NAME = 'lunchbuddy-background';
const DB_VERSION = 1;
const CONFIG_STORE = 'config';
const STATE_STORE = 'state';
const CONFIG_KEY = 'config';
const STATE_KEY = 'state';
const FALLBACK_CURRENCY = 'USD';
const DEFAULT_API_BASE = 'https://api.lunchmoney.dev/v2';
const API_CACHE_NAME = 'lunchbuddy-api-cache-v2';

const defaultConfig = () => ({
  apiKey: null,
  apiBaseUrl: DEFAULT_API_BASE,
  preferences: {
    hiddenCategoryIds: [],
    notificationsEnabled: false,
    warnAtRatio: 0.85,
    currency: null,
  },
});

const defaultState = () => ({
  lastRunMs: 0,
  lastAlertSignature: null,
});

// Handle Lunch Money API requests before delegating other traffic to the Angular worker.
globalThis.addEventListener('fetch', event => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (!isApiRequest(url)) {
    return;
  }

  if (typeof event.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation();
  }

  try {
    event.respondWith(handleApiRequest(request));
  } catch (error) {
    // Fallback to the default handling if respondWith throws for any reason.
    console.warn(
      '[WARN] custom-service-worker: failed to respond with cached API data',
      error
    );
  }
});

// Install event - prepare cache
globalThis.addEventListener('install', () => {
  globalThis.skipWaiting();
});

// Activate event - cleanup old caches
globalThis.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      const cachesToDelete = cacheNames.filter(
        name =>
          name.startsWith('lunchbuddy-api-cache-') && name !== API_CACHE_NAME
      );
      await Promise.all(cachesToDelete.map(name => caches.delete(name)));
      await globalThis.clients.claim();
    })()
  );
});

function isApiRequest(url) {
  return (
    url.hostname === 'api.lunchmoney.dev' ||
    url.hostname === 'dev.lunchmoney.app' ||
    (url.hostname === 'localhost' &&
      (url.port === '3000' || url.port === '4600'))
  );
}

async function handleApiRequest(request) {
  try {
    // Try network first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const networkResponse = await fetch(request.clone(), {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    // Non-OK network responses should fall back to cached data when available,
    // otherwise surface the original error response to the client.
    const cachedResponse = await findCachedResponse(request);
    return cachedResponse ?? networkResponse;
  } catch (error) {
    // Network error or timeout - use cache
    console.warn(
      '[WARN] custom-service-worker: network request failed, falling back to cache',
      error
    );
    return getCachedResponse(request);
  }
}

async function findCachedResponse(request) {
  const cache = await caches.open(API_CACHE_NAME);
  return cache.match(request);
}

async function getCachedResponse(request) {
  const cachedResponse = await findCachedResponse(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  // No cache available - return error response
  return new Response(
    JSON.stringify({
      error: 'offline',
      message: 'No cached data available',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

globalThis.addEventListener('message', event => {
  const data = event.data;
  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'LUNCHBUDDY_CONFIG_UPDATE') {
    event.waitUntil(storeConfig(data.payload));
  }
});

globalThis.addEventListener('periodicsync', event => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(handleBudgetSync('periodic'));
  }
});

globalThis.addEventListener('sync', event => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(handleBudgetSync('sync'));
  }
});

async function handleBudgetSync(trigger) {
  const config = (await loadConfig()) ?? defaultConfig();
  if (!config.apiKey || !config.preferences.notificationsEnabled) {
    return;
  }

  const now = new Date();
  const state = (await loadState()) ?? defaultState();

  if (!shouldRunNow(now, state.lastRunMs)) {
    return;
  }

  try {
    const monthRange = getCurrentMonthRange(now);
    const startIso = toIsoDate(monthRange.start);
    const endIso = toIsoDate(monthRange.end);
    const monthKey = startIso;
    const monthProgress = getMonthProgress(now, monthRange);
    const warnAtRatio = config.preferences.warnAtRatio ?? 0.85;

    const budgetsUrl = buildBudgetsUrl(config.apiBaseUrl, startIso, endIso);
    const categoriesUrl = buildCategoriesUrl(config.apiBaseUrl);
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      Accept: 'application/json',
    };

    const [summaryResponse, categoriesResponse] = await Promise.all([
      fetch(budgetsUrl, { headers }),
      fetch(categoriesUrl, { headers }),
    ]);

    if (!summaryResponse.ok || !categoriesResponse.ok) {
      await storeState({
        lastRunMs: now.getTime(),
        lastAlertSignature: state.lastAlertSignature,
      });
      return;
    }

    const summaryPayload = await summaryResponse.json();
    const categoriesPayload = await categoriesResponse.json();
    const categories = Array.isArray(categoriesPayload?.categories)
      ? categoriesPayload.categories
      : [];

    const summaries = mergeSummaryWithCategories(summaryPayload, categories);
    if (!Array.isArray(summaries)) {
      await storeState({
        lastRunMs: now.getTime(),
        lastAlertSignature: state.lastAlertSignature,
      });
      return;
    }

    const progress = summaries
      .filter(summary => !summary.exclude_from_budget && !summary.is_group)
      .map(summary =>
        buildBudgetProgress(summary, monthKey, monthProgress, warnAtRatio)
      );

    const alerts = filterAlerts(progress, config.preferences.hiddenCategoryIds);
    if (!alerts.length) {
      await storeState({
        lastRunMs: now.getTime(),
        lastAlertSignature: null,
      });
      return;
    }

    const signature = buildSignature(alerts);
    if (signature === state.lastAlertSignature) {
      await storeState({
        lastRunMs: now.getTime(),
        lastAlertSignature: state.lastAlertSignature,
      });
      return;
    }

    if (await isAnyClientVisible()) {
      await storeState({
        lastRunMs: now.getTime(),
        lastAlertSignature: null,
      });
      return;
    }

    const payload = buildNotificationPayload(
      alerts,
      config.preferences.currency
    );
    await globalThis.registration.showNotification(payload.title, {
      body: payload.body,
      tag: 'lunch-buddy-budget-alerts',
      data: {
        generatedAt: now.toISOString(),
        trigger,
      },
    });

    await storeState({
      lastRunMs: now.getTime(),
      lastAlertSignature: signature,
    });
  } catch (error) {
    console.error('LunchBuddy Service Worker: background sync failed', error);
  }
}

function shouldRunNow(now, lastRunMs) {
  if (!lastRunMs) {
    return true;
  }

  const lastRun = new Date(lastRunMs);
  const hoursSince = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
  if (hoursSince >= 36) {
    return true;
  }

  const lastRunDateKey = dateKey(lastRun);
  const currentDateKey = dateKey(now);
  if (lastRunDateKey === currentDateKey) {
    return false;
  }

  return now.getHours() >= 8;
}

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildBudgetsUrl(baseUrl, startIso, endIso) {
  let base = baseUrl || DEFAULT_API_BASE;
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  return `${base}/summary?start_date=${startIso}&end_date=${endIso}&include_occurrences=true&include_exclude_from_budgets=true`;
}

function buildCategoriesUrl(baseUrl) {
  let base = baseUrl || DEFAULT_API_BASE;
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  return `${base}/categories?format=flattened`;
}

async function isAnyClientVisible() {
  try {
    const clientList = await globalThis.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    return clientList.some(client => client.visibilityState === 'visible');
  } catch {
    return false;
  }
}

function buildBudgetProgress(summary, monthKey, monthProgress, warnAtRatio) {
  const budgetAmount =
    summary.occurrence?.budgeted ?? summary.totals?.budgeted ?? 0;
  const spent =
    (summary.totals?.other_activity ?? 0) +
    (summary.totals?.recurring_activity ?? 0);
  const budgetCurrency = summary.occurrence?.budgeted_currency ?? null;
  const recurringTotal = summary.totals?.recurring_expected ?? 0;

  return {
    categoryId: summary.category_id,
    categoryName: summary.category_name,
    isIncome: !!summary.is_income,
    budgetAmount,
    budgetCurrency,
    spent,
    status: calculateStatus(
      spent,
      budgetAmount,
      monthProgress,
      warnAtRatio,
      !!summary.is_income,
      recurringTotal
    ),
  };
}

function calculateStatus(
  spent,
  budget,
  monthProgress,
  warnAtRatio,
  isIncome,
  recurringTotal
) {
  if (!budget || budget <= 0) {
    return 'on-track';
  }

  const epsilon = 0.005;

  if (isIncome) {
    const actual = Math.abs(spent);
    const projected = actual + Math.max(0, recurringTotal ?? 0);
    if (projected >= budget * (1 - epsilon)) {
      return 'on-track';
    }
    const projectedRatio = budget > 0 ? projected / budget : 1;
    const projectedShortfallRatio = Math.max(0, 1 - projectedRatio);
    const warnShortfallRatio = Math.max(
      0,
      1 - Math.min(Math.max(warnAtRatio, 0), 1)
    );
    if (projectedShortfallRatio > warnShortfallRatio + epsilon) {
      return 'at-risk';
    }
    return 'on-track';
  }

  const ratio = spent / budget;

  if (ratio > 1 + epsilon) {
    return 'over';
  }

  if (Math.abs(ratio - 1) <= epsilon) {
    return 'on-track';
  }

  if (ratio >= warnAtRatio || ratio >= monthProgress + 0.1) {
    return 'at-risk';
  }

  return 'on-track';
}

function mergeSummaryWithCategories(summaryResponse, categories) {
  const categoryMap = new Map();
  const groupNameMap = new Map();

  for (const category of categories ?? []) {
    categoryMap.set(category.id, category);
    if (category.is_group) {
      groupNameMap.set(category.id, category.name);
    }
  }

  const items = [];
  const summaries = summaryResponse?.categories ?? [];
  for (const entry of summaries) {
    const metadata = categoryMap.get(entry.category_id);
    const groupId = metadata?.group_id ?? null;
    items.push({
      category_id: entry.category_id ?? null,
      category_name: metadata?.name ?? `Category ${entry.category_id ?? ''}`,
      category_group_name:
        groupId !== null ? (groupNameMap.get(groupId) ?? null) : null,
      group_id: groupId,
      is_group: metadata?.is_group ?? false,
      is_income: metadata?.is_income ?? false,
      exclude_from_budget: metadata?.exclude_from_budget ?? false,
      totals: entry.totals ?? emptyTotals(),
      occurrence: pickOccurrence(entry.occurrences),
    });
  }

  for (const category of categories ?? []) {
    if (items.some(item => item.category_id === category.id)) {
      continue;
    }
    items.push({
      category_id: category.id,
      category_name: category.name,
      category_group_name:
        category.group_id !== null
          ? (groupNameMap.get(category.group_id) ?? null)
          : null,
      group_id: category.group_id,
      is_group: category.is_group,
      is_income: category.is_income,
      exclude_from_budget: category.exclude_from_budget,
      totals: emptyTotals(),
      occurrence: undefined,
    });
  }

  return items;
}

function pickOccurrence(occurrences) {
  if (!occurrences || !occurrences.length) {
    return undefined;
  }
  return occurrences.find(item => item.current) ?? occurrences[0];
}

function emptyTotals() {
  return {
    other_activity: 0,
    recurring_activity: 0,
    budgeted: null,
    available: null,
    recurring_remaining: 0,
    recurring_expected: 0,
  };
}

function filterAlerts(progress, hiddenCategoryIds) {
  const hidden = new Set(hiddenCategoryIds ?? []);
  return progress.filter(
    item =>
      !hidden.has(item.categoryId) &&
      !item.isIncome &&
      (item.status === 'over' || item.status === 'at-risk')
  );
}

function buildSignature(alerts) {
  return alerts
    .map(alert => `${alert.categoryId}:${alert.status}`)
    .sort()
    .join('|');
}

function buildNotificationPayload(alerts, preferredCurrency) {
  const fallbackCurrency =
    preferredCurrency ??
    alerts.find(alert => alert.budgetCurrency)?.budgetCurrency ??
    FALLBACK_CURRENCY;

  if (alerts.length === 1) {
    const [alert] = alerts;
    const statusLabel = alert.status === 'over' ? 'over budget' : 'at risk';
    const spent = formatCurrency(
      alert.spent,
      alert.budgetCurrency,
      fallbackCurrency
    );
    const budget = formatCurrency(
      alert.budgetAmount,
      alert.budgetCurrency,
      fallbackCurrency
    );

    return {
      title: `${alert.categoryName} is ${statusLabel}`,
      body: `${spent} spent of ${budget}`,
    };
  }

  const summary = alerts
    .map(
      alert =>
        `${alert.categoryName} (${alert.status === 'over' ? 'over' : 'at risk'})`
    )
    .join(', ');

  return {
    title: `Budget alerts: ${alerts.length} categories`,
    body: summary,
  };
}

function formatCurrency(amount, currency, fallbackCurrency) {
  const currencyCode = currency || fallbackCurrency || FALLBACK_CURRENCY;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode} ${Math.round(amount)}`;
  }
}

function getCurrentMonthRange(today) {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthProgress(today, range) {
  const elapsedDays = differenceInCalendarDays(today, range.start) + 1;
  const totalDays = differenceInCalendarDays(range.end, range.start) + 1;
  return Math.min(1, Math.max(0, elapsedDays / totalDays));
}

function differenceInCalendarDays(left, right) {
  const utcLeft = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate());
  const utcRight = Date.UTC(
    right.getFullYear(),
    right.getMonth(),
    right.getDate()
  );
  return Math.floor((utcLeft - utcRight) / (1000 * 60 * 60 * 24));
}

async function openDb() {
  if (!globalThis.indexedDB) {
    return null;
  }

  return new Promise(resolve => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONFIG_STORE)) {
        db.createObjectStore(CONFIG_STORE);
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function storeConfig(config) {
  const db = await openDb();
  if (!db) {
    return;
  }

  await putValue(db, CONFIG_STORE, CONFIG_KEY, config ?? defaultConfig());
  db.close();
}

async function storeState(state) {
  const db = await openDb();
  if (!db) {
    return;
  }

  await putValue(db, STATE_STORE, STATE_KEY, state ?? defaultState());
  db.close();
}

async function loadConfig() {
  const db = await openDb();
  if (!db) {
    return defaultConfig();
  }

  const value = await getValue(db, CONFIG_STORE, CONFIG_KEY);
  db.close();
  return value ?? defaultConfig();
}

async function loadState() {
  const db = await openDb();
  if (!db) {
    return defaultState();
  }

  const value = await getValue(db, STATE_STORE, STATE_KEY);
  db.close();
  return value ?? defaultState();
}

function putValue(db, storeName, key, value) {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

function getValue(db, storeName, key) {
  return new Promise(resolve => {
    const tx = db.transaction(storeName, 'readonly');
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(undefined);
  });
}
