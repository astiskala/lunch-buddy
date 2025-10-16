import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { BudgetSummaryItem, RecurringExpense } from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { BackgroundSyncService } from '../../core/services/background-sync.service';
import { BudgetService, CategoryPreferences } from './budget.service';
import { getCurrentMonthRange, toIsoDate } from '../utils/date.util';

const PREFERENCES_KEY = 'lunchbuddy.categoryPreferences';

const defaultPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  warnAtRatio: 0.85,
  notificationsEnabled: false,
};

class MockLunchMoneyService {
  budgetSummary$ = new Subject<BudgetSummaryItem[]>();

  getBudgetSummary(): Observable<BudgetSummaryItem[]> {
    return this.budgetSummary$.asObservable();
  }

  getRecurringExpenses(): Observable<RecurringExpense[]> {
    return of([]);
  }
}

const createSummary = (monthKey: string, overrides: Partial<BudgetSummaryItem>): BudgetSummaryItem => ({
  category_id: 1,
  category_name: 'Dining Out',
  category_group_name: null,
  group_id: null,
  is_group: false,
  is_income: false,
  exclude_from_budget: false,
  exclude_from_totals: false,
  order: 0,
  archived: false,
  data: {
    [monthKey]: {
      num_transactions: 1,
      spending_to_base: 150,
      budget_to_base: 100,
      budget_amount: 100,
      budget_currency: 'USD',
      is_automated: false,
    },
  },
  config: null,
  recurring: { data: [] },
  ...overrides,
});

const storePreferences = (prefs: Partial<CategoryPreferences>) => {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({
      ...defaultPreferences,
      ...prefs,
    }),
  );
};

describe('BudgetService background sync', () => {
  let lunchMoney: MockLunchMoneyService;
  let backgroundSync: jasmine.SpyObj<BackgroundSyncService>;
  let service: BudgetService;

  beforeEach(() => {
    localStorage.clear();
    lunchMoney = new MockLunchMoneyService();
    backgroundSync = jasmine.createSpyObj<BackgroundSyncService>('BackgroundSyncService', [
      'updateBudgetPreferences',
    ]);

    backgroundSync.updateBudgetPreferences.and.resolveTo();
  });

  const initService = () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BudgetService,
        { provide: LunchMoneyService, useValue: lunchMoney },
        { provide: BackgroundSyncService, useValue: backgroundSync },
      ],
    });

    service = TestBed.inject(BudgetService);
  };

  it('restores cached budget data before network response', () => {
    const monthRange = getCurrentMonthRange();
    const monthStart = toIsoDate(monthRange.start);
    const monthEnd = toIsoDate(monthRange.end);
    const cacheKey = `lunchbuddy.cache.budget:${monthStart}:${monthEnd}`;
    const summary = createSummary(monthStart, {});
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        monthKey: monthStart,
        timestamp: new Date().toISOString(),
        summaries: [summary],
      }),
    );

    initService();

    expect(service.getIsLoading()).toBeFalse();
    expect(service.getExpenses().length).toBe(1);
  });

  it('stores fresh budget data in cache after successful fetch', () => {
    initService();
    const startDate = service.getStartDate();
    const endDate = service.getEndDate();
    const cacheKey = `lunchbuddy.cache.budget:${startDate}:${endDate}`;
    const summary = createSummary(startDate, {});

    lunchMoney.budgetSummary$.next([summary]);

    const rawCache = localStorage.getItem(cacheKey);
    expect(rawCache).toBeTruthy();
    const parsed = JSON.parse(String(rawCache));
    expect(parsed.monthKey).toBe(startDate);
    expect(Array.isArray(parsed.summaries)).toBeTrue();
    expect(parsed.summaries.length).toBe(1);
  });

  it('syncs stored preferences on initialization', () => {
    storePreferences({
      notificationsEnabled: true,
      hiddenCategoryIds: [5],
      warnAtRatio: 0.9,
    });

    initService();

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalled();
    const [payload] = backgroundSync.updateBudgetPreferences.calls.mostRecent().args;
    expect(payload).toEqual(
      jasmine.objectContaining({
        hiddenCategoryIds: [5],
        notificationsEnabled: true,
        warnAtRatio: 0.9,
      }),
    );
  });

  it('updates background sync when preferences change', () => {
    initService();
    backgroundSync.updateBudgetPreferences.calls.reset();

    service.updatePreferences((current) => ({
      ...current,
      notificationsEnabled: true,
      hiddenCategoryIds: [1, 2],
      warnAtRatio: 0.92,
    }));

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalledTimes(1);
    const [payload] = backgroundSync.updateBudgetPreferences.calls.argsFor(0);
    expect(payload).toEqual({
      hiddenCategoryIds: [1, 2],
      notificationsEnabled: true,
      warnAtRatio: 0.92,
      currency: null,
    });
  });

  it('provides currency information after loading budget data', () => {
    storePreferences({ notificationsEnabled: true });
    initService();
    backgroundSync.updateBudgetPreferences.calls.reset();

    const monthKey = (service as unknown as { monthKey: string }).monthKey;
    lunchMoney.budgetSummary$.next([createSummary(monthKey, {})]);

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalled();
    const [payload] = backgroundSync.updateBudgetPreferences.calls.mostRecent().args;
    expect(payload.currency).toBe('USD');
  });
});
