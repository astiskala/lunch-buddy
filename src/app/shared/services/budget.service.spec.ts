import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import {
  BudgetSummaryItem,
  BudgetSummaryResult,
  RecurringExpense,
  TransactionsResponse,
  Transaction,
} from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { BackgroundSyncService } from '../../core/services/background-sync.service';
import { LoggerService } from '../../core/services/logger.service';
import { BudgetService, CategoryPreferences } from './budget.service';
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';

const PREFERENCES_KEY = 'lunchbuddy.categoryPreferences';
const CUSTOM_PERIOD_KEY = 'lunchbuddy.customPeriod';

const defaultPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  notificationsEnabled: false,
  includeAllTransactions: true,
  hideGroupedCategories: false,
};

class MockLunchMoneyService {
  budgetSummary$ = new Subject<BudgetSummaryResult>();
  budgetSummaryQueue: BudgetSummaryResult[] = [];
  categoryTransactionsResponse: TransactionsResponse = {
    transactions: [],
    has_more: false,
  };

  getBudgetSummary(): Observable<BudgetSummaryResult> {
    const queued = this.budgetSummaryQueue.shift();
    if (queued) {
      return of(queued);
    }

    return this.budgetSummary$.asObservable();
  }

  getCategoryTransactions(
    _categoryId: number | null,
    _startDate: string,
    _endDate: string,
    _options?: { includeAllTransactions?: boolean }
  ): Observable<TransactionsResponse> {
    return of(this.categoryTransactionsResponse);
  }

  getRecurringExpenses(
    _startDate: string,
    _endDate: string
  ): Observable<RecurringExpense[]> {
    return of([]);
  }
}

const emitAligned = (
  subject: Subject<BudgetSummaryResult>,
  items: BudgetSummaryItem[]
): void => {
  subject.next({ aligned: true, items, periods: [] });
};

const createSummary = (
  monthKey: string,
  overrides: Partial<BudgetSummaryItem>
): BudgetSummaryItem => ({
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
  totals: {
    other_activity: 150,
    recurring_activity: 0,
    budgeted: 100,
    available: null,
    recurring_remaining: 0,
    recurring_expected: 0,
  },
  occurrence: {
    current: true,
    start_date: monthKey,
    end_date: monthKey,
    other_activity: 0,
    recurring_activity: 0,
    budgeted: 100,
    budgeted_amount: '100',
    budgeted_currency: 'USD',
    notes: null,
  },
  ...overrides,
});

const createTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: 1,
  date: '2025-10-01',
  amount: '-10',
  currency: 'USD',
  to_base:
    overrides.to_base ??
    (Number.isNaN(Number.parseFloat(overrides.amount ?? '-10'))
      ? 0
      : Number.parseFloat(overrides.amount ?? '-10')),
  payee: 'Test',
  category_id: null,
  notes: null,
  recurring_id: null,
  plaid_account_id: null,
  manual_account_id: null,
  external_id: null,
  tag_ids: [],
  status: 'reviewed',
  is_pending: false,
  created_at: '2025-10-01T00:00:00Z',
  updated_at: '2025-10-01T00:00:00Z',
  is_parent: false,
  parent_id: null,
  is_group: false,
  group_id: null,
  children: [],
  files: [],
  source: null,
  ...overrides,
});

const storePreferences = (prefs: Partial<CategoryPreferences>) => {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({
      version: 1,
      preferences: {
        ...defaultPreferences,
        ...prefs,
      },
    })
  );
};

const storeLegacyPreferences = (prefs: Partial<CategoryPreferences>) => {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({
      ...defaultPreferences,
      ...prefs,
    })
  );
};

const shiftMonthStart = (monthStart: string, monthDelta: number): string => {
  const [yearText, monthText] = monthStart.split('-');
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const shifted = new Date(year, month - 1 + monthDelta, 1);
  const shiftedMonth = String(shifted.getMonth() + 1).padStart(2, '0');
  return `${shifted.getFullYear().toString()}-${shiftedMonth}-01`;
};

interface LoggerSpies {
  debug: Mock<(message: string, ...args: unknown[]) => void>;
  info: Mock<(message: string, ...args: unknown[]) => void>;
  warn: Mock<(message: string, ...args: unknown[]) => void>;
  error: Mock<(message: string, error?: unknown, ...args: unknown[]) => void>;
}

describe('BudgetService background sync', () => {
  let lunchMoney: MockLunchMoneyService;
  let logger: LoggerService;
  let loggerSpies: LoggerSpies;
  interface BackgroundPreferencesPayload {
    hiddenCategoryIds: number[];
    notificationsEnabled: boolean;
    currency: string | null;
  }

  interface BackgroundSyncStub {
    updateBudgetPreferences: (
      payload: BackgroundPreferencesPayload
    ) => Promise<void>;
  }

  let backgroundSync: SpyObj<BackgroundSyncStub>;
  let service: BudgetService;

  beforeEach(() => {
    localStorage.clear();
    lunchMoney = new MockLunchMoneyService();
    loggerSpies = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    logger = {
      debug: loggerSpies.debug,
      info: loggerSpies.info,
      warn: loggerSpies.warn,
      error: loggerSpies.error,
    } as unknown as LoggerService;
    backgroundSync = createSpyObj<BackgroundSyncStub>('BackgroundSyncService', [
      'updateBudgetPreferences',
    ]);

    backgroundSync.updateBudgetPreferences.mockResolvedValue();
  });

  const initService = () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BudgetService,
        { provide: LunchMoneyService, useValue: lunchMoney },
        { provide: BackgroundSyncService, useValue: backgroundSync },
        { provide: LoggerService, useValue: logger },
      ],
    });

    service = TestBed.inject(BudgetService);
  };

  it('syncs stored preferences on initialization', () => {
    storeLegacyPreferences({
      notificationsEnabled: true,
      hiddenCategoryIds: [5],
    });

    initService();

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalled();
    const latestSyncCall =
      backgroundSync.updateBudgetPreferences.mock.calls.at(-1);
    expect(latestSyncCall).toBeDefined();
    if (!latestSyncCall) {
      throw new Error('Expected updateBudgetPreferences to be called');
    }
    const [payload] = latestSyncCall;
    expect(payload).toEqual(
      expect.objectContaining({
        hiddenCategoryIds: [5],
        notificationsEnabled: true,
      })
    );
  });

  it('returns a friendly message for unauthorized API responses', () => {
    initService();

    lunchMoney.budgetSummary$.error(
      new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: 'https://api.lunchmoney.dev/v2/summary',
      })
    );

    const errors = service.getErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('Authentication failed');
    expect(errors[0]?.message).toContain('Use "Use different API key"');
  });

  it('loads schema-versioned preferences on initialization', () => {
    storePreferences({
      notificationsEnabled: true,
      hiddenCategoryIds: [7],
    });

    initService();

    const prefs = service.getPreferences();
    expect(prefs.hiddenCategoryIds).toEqual([7]);
    expect(prefs.notificationsEnabled).toBe(true);
  });

  it('updates background sync when preferences change', () => {
    initService();
    backgroundSync.updateBudgetPreferences.mockClear();

    service.updatePreferences(current => ({
      ...current,
      notificationsEnabled: true,
      hiddenCategoryIds: [1, 2],
    }));

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalledTimes(1);
    const [payload] = backgroundSync.updateBudgetPreferences.mock.calls[0];
    expect(payload).toEqual({
      hiddenCategoryIds: [1, 2],
      notificationsEnabled: true,
      currency: null,
    });
  });

  it('provides currency information after loading budget data', () => {
    storePreferences({ notificationsEnabled: true });
    initService();
    backgroundSync.updateBudgetPreferences.mockClear();

    const monthKey = service.getStartDate();
    emitAligned(lunchMoney.budgetSummary$, [createSummary(monthKey, {})]);

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalled();
    const latestSyncCall =
      backgroundSync.updateBudgetPreferences.mock.calls.at(-1);
    expect(latestSyncCall).toBeDefined();
    if (!latestSyncCall) {
      throw new Error('Expected updateBudgetPreferences to be called');
    }
    const [payload] = latestSyncCall;
    expect(payload.currency).toBe('USD');
  });

  it('creates a single uncategorised expense entry for negative-only transactions', () => {
    initService();
    const monthKey = service.getStartDate();

    lunchMoney.categoryTransactionsResponse = {
      has_more: false,
      transactions: [
        createTransaction({ id: 101, amount: '-120.5', to_base: -120.5 }),
        createTransaction({ id: 102, amount: '-50.75', to_base: -50.75 }),
      ],
    };

    emitAligned(lunchMoney.budgetSummary$, [
      createSummary(monthKey, {
        category_id: null,
        category_name: 'Uncategorised',
        totals: {
          other_activity: 171.25,
          recurring_activity: 0,
          budgeted: 0,
          available: null,
          recurring_remaining: 0,
          recurring_expected: 0,
        },
        occurrence: {
          current: true,
          start_date: monthKey,
          end_date: monthKey,
          other_activity: 0,
          recurring_activity: 0,
          budgeted: 0,
          budgeted_amount: '0',
          budgeted_currency: 'USD',
          notes: null,
        },
      }),
    ]);

    // Find the uncategorized expense entry using categoryId and label checks.
    const incomes = service.getIncomes();
    const uncategorisedIncome = incomes.find(
      item =>
        item.categoryId == null && item.categoryName === 'Uncategorised Income'
    );
    expect(uncategorisedIncome).toBeDefined();
    expect(uncategorisedIncome?.spent).toBeCloseTo(-171.25, 5);
  });

  it('splits uncategorised totals into expense and income entries when both exist', () => {
    initService();
    const monthKey = service.getStartDate();

    lunchMoney.categoryTransactionsResponse = {
      has_more: false,
      transactions: [
        createTransaction({ id: 201, amount: '-200' }),
        createTransaction({ id: 202, amount: '150' }),
        createTransaction({ id: 203, amount: '50' }),
      ],
    };

    emitAligned(lunchMoney.budgetSummary$, [
      createSummary(monthKey, {
        category_id: null,
        category_name: 'Uncategorised',
        totals: {
          other_activity: 200,
          recurring_activity: 0,
          budgeted: 0,
          available: null,
          recurring_remaining: 0,
          recurring_expected: 0,
        },
        occurrence: {
          current: true,
          start_date: monthKey,
          end_date: monthKey,
          other_activity: 0,
          recurring_activity: 0,
          budgeted: 0,
          budgeted_amount: '0',
          budgeted_currency: 'USD',
          notes: null,
        },
      }),
    ]);

    const expenses = service.getExpenses();
    const incomes = service.getIncomes();

    const uncategorisedExpenses = expenses.filter(
      item => item.categoryName === 'Uncategorised Expenses'
    );
    expect(uncategorisedExpenses.length).toBe(1);
    expect(uncategorisedExpenses[0].spent).toBeCloseTo(200, 5);

    const uncategorisedIncome = incomes.filter(
      item => item.categoryName === 'Uncategorised Income'
    );
    expect(uncategorisedIncome.length).toBe(1);
    expect(Math.abs(uncategorisedIncome[0].spent)).toBeCloseTo(200, 5);
  });

  it('exposes hidden expenses and incomes based on preferences', () => {
    initService();
    const monthKey = service.getStartDate();

    emitAligned(lunchMoney.budgetSummary$, [
      createSummary(monthKey, {
        category_id: 10,
        category_name: 'Dining Out',
        totals: {
          other_activity: 120,
          recurring_activity: 0,
          budgeted: 0,
          available: null,
          recurring_remaining: 0,
          recurring_expected: 0,
        },
      }),
      createSummary(monthKey, {
        category_id: 20,
        category_name: 'Salary',
        is_income: true,
        totals: {
          other_activity: -5000,
          recurring_activity: 0,
          budgeted: 0,
          available: null,
          recurring_remaining: 0,
          recurring_expected: 0,
        },
      }),
    ]);

    service.updatePreferences(current => ({
      ...current,
      hiddenCategoryIds: [10, 20],
    }));

    const hiddenExpenses = service.getHiddenExpenses();
    const hiddenIncomes = service.getHiddenIncomes();

    expect(hiddenExpenses.some(item => item.categoryId === 10)).toBe(true);
    expect(hiddenIncomes.some(item => item.categoryId === 20)).toBe(true);
  });

  it('includes group budgets when category-level budgets are absent', () => {
    initService();
    const monthKey = service.getStartDate();

    emitAligned(lunchMoney.budgetSummary$, [
      createSummary(monthKey, {
        category_id: 99,
        category_name: 'Household Essentials',
        category_group_name: 'Household',
        group_id: 99,
        is_group: true,
      }),
    ]);

    const expenses = service.getExpenses();

    expect(expenses.length).toBe(1);
    expect(expenses[0].isGroup).toBe(true);
    expect(expenses[0].categoryName).toBe('Household Essentials');
  });

  it('shows group rows instead of grouped leaf categories when enabled', () => {
    initService();
    const monthKey = service.getStartDate();

    emitAligned(lunchMoney.budgetSummary$, [
      createSummary(monthKey, {
        category_id: 900,
        category_name: 'Dining Group',
        is_group: true,
        group_id: 900,
      }),
      createSummary(monthKey, {
        category_id: 901,
        category_name: 'Dining Out',
        group_id: 900,
        is_group: false,
      }),
      createSummary(monthKey, {
        category_id: 902,
        category_name: 'Coffee',
        group_id: 900,
        is_group: false,
      }),
      createSummary(monthKey, {
        category_id: 903,
        category_name: 'Rent',
        group_id: null,
        is_group: false,
      }),
    ]);

    expect(service.getExpenses().map(item => item.categoryId)).toEqual([
      901, 902, 903,
    ]);

    service.updatePreferences(current => ({
      ...current,
      hideGroupedCategories: true,
    }));

    expect(service.getExpenses().map(item => item.categoryId)).toEqual([
      900, 903,
    ]);
  });

  it('formats object-shaped budget load errors into readable messages', () => {
    vi.spyOn(lunchMoney, 'getBudgetSummary').mockReturnValue(
      new Observable<BudgetSummaryResult>(subscriber => {
        subscriber.error({ code: 503, detail: 'Upstream unavailable' });
      })
    );

    initService();

    const [error] = service.getErrors();
    expect(error).toBeDefined();
    expect(error.message).toContain('"code":503');
    expect(error.message).not.toBe('[object Object]');
  });

  it('recovers from recurring expense load failures', () => {
    initService();
    const failure = new Error('network');
    const getRecurringExpensesSpy = vi
      .spyOn(lunchMoney, 'getRecurringExpenses')
      .mockReturnValue(throwError(() => failure));

    service.loadRecurringExpenses();

    expect(getRecurringExpensesSpy).toHaveBeenCalled();
    expect(loggerSpies.error).toHaveBeenCalledWith(
      'Failed to load recurring expenses',
      failure
    );
  });

  it('navigates to previous months and keeps month progress at 100%', () => {
    initService();
    const refreshSpy = vi.spyOn(service, 'refresh');
    const initialMonth = service.getStartDate();

    service.goToPreviousMonth();

    expect(service.getStartDate()).toBe(shiftMonthStart(initialMonth, -1));
    expect(service.getMonthProgressRatio()).toBe(1);
    expect(service.getCanNavigateToNextMonth()).toBe(true);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('allows moving back to current month but prevents moving into future months', () => {
    initService();
    const currentMonth = service.getStartDate();

    service.goToPreviousMonth();
    service.goToNextMonth();
    expect(service.getStartDate()).toBe(currentMonth);
    expect(service.getCanNavigateToNextMonth()).toBe(false);

    service.goToNextMonth();
    expect(service.getStartDate()).toBe(currentMonth);
  });

  it('refresh reuses budget and recurring loaders', () => {
    initService();
    const loadBudgetSpy = vi.spyOn(
      service as unknown as { loadBudgetData: () => void },
      'loadBudgetData'
    );
    const loadRecurringSpy = vi.spyOn(
      service as unknown as { loadRecurringExpenses: () => void },
      'loadRecurringExpenses'
    );

    service.refresh();

    expect(loadBudgetSpy).toHaveBeenCalledTimes(1);
    expect(loadRecurringSpy).toHaveBeenCalledTimes(1);
  });

  it('sets non-aligned period mode when API returns aligned=false', () => {
    initService();

    lunchMoney.budgetSummary$.next({
      aligned: false,
      items: [createSummary(service.getStartDate(), {})],
      periods: [],
    });

    expect(service.getPeriodMode()).toBe('non-aligned');
    expect(service.getNonAlignedPeriodRequired()).toBe(true);
    expect(service.getExpenses()).toEqual([]);
    expect(service.getIncomes()).toEqual([]);
  });

  it('dismisses the custom period prompt without changing period mode', () => {
    initService();

    lunchMoney.budgetSummary$.next({
      aligned: false,
      items: [createSummary(service.getStartDate(), {})],
      periods: [],
    });

    expect(service.getPeriodMode()).toBe('non-aligned');
    expect(service.getNonAlignedPeriodRequired()).toBe(true);

    service.dismissCustomPeriodPrompt();

    expect(service.getPeriodMode()).toBe('non-aligned');
    expect(service.getNonAlignedPeriodRequired()).toBe(false);
  });

  it('switches to sub-monthly mode when multiple periods are detected', () => {
    initService();
    const monthKey = service.getStartDate();

    // First emit: full-month response with multiple periods.
    const getBudgetSummarySpy = vi.spyOn(lunchMoney, 'getBudgetSummary');
    getBudgetSummarySpy.mockClear();

    lunchMoney.budgetSummary$.next({
      aligned: true,
      items: [createSummary(monthKey, {})],
      periods: [
        { startDate: '2026-02-01', endDate: '2026-02-14' },
        { startDate: '2026-02-15', endDate: '2026-02-28' },
      ],
    });

    expect(service.getPeriodMode()).toBe('sub-monthly');
    // Should have re-requested with narrowed dates.
    expect(getBudgetSummarySpy).toHaveBeenCalled();
  });

  it('applies custom period when setCustomPeriod is called', () => {
    initService();
    const refreshSpy = vi.spyOn(service, 'refresh');

    service.setCustomPeriod('2026-01-15', '2026-01-28');

    expect(service.getPeriodMode()).toBe('non-aligned');
    expect(service.getNonAlignedPeriodRequired()).toBe(false);
    expect(service.getStartDate()).toBe('2026-01-15');
    expect(service.getEndDate()).toBe('2026-01-28');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('navigates by period length in non-aligned mode', () => {
    initService();

    // Set up custom period mode.
    service.setCustomPeriod('2026-01-01', '2026-01-14');
    const refreshSpy = vi.spyOn(service, 'refresh');

    service.goToPreviousPeriod();

    expect(service.getStartDate()).toBe('2025-12-18');
    expect(service.getEndDate()).toBe('2025-12-31');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('allows navigating to an earlier period within the current month in non-aligned mode', () => {
    initService();
    const currentMonth = service.getStartDate().slice(0, 7);

    service.setCustomPeriod(`${currentMonth}-10`, `${currentMonth}-16`);
    const refreshSpy = vi.spyOn(service, 'refresh');

    service.goToPreviousPeriod();

    expect(service.getStartDate()).toBe(`${currentMonth}-03`);
    expect(service.getEndDate()).toBe(`${currentMonth}-09`);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('allows moving to the next non-aligned period when it starts before today', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 1, 20, 12));
      initService();

      const refreshSpy = vi.spyOn(service, 'refresh');
      service.setCustomPeriod('2026-02-01', '2026-02-13');
      refreshSpy.mockClear();

      expect(service.getCanNavigateToNextMonth()).toBe(true);

      service.goToNextPeriod();

      expect(service.getStartDate()).toBe('2026-02-14');
      expect(service.getEndDate()).toBe('2026-02-26');
      expect(refreshSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('allows moving forward from the last sub-monthly period when the shifted period starts before today', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 0, 25, 12));
      initService();

      lunchMoney.budgetSummary$.next({
        aligned: true,
        items: [createSummary(service.getStartDate(), {})],
        periods: [
          { startDate: '2026-01-01', endDate: '2026-01-10' },
          { startDate: '2026-01-11', endDate: '2026-01-20' },
        ],
      });

      expect(service.getPeriodMode()).toBe('sub-monthly');
      expect(service.getStartDate()).toBe('2026-01-01');
      expect(service.getEndDate()).toBe('2026-01-10');

      service.goToNextPeriod();

      expect(service.getStartDate()).toBe('2026-01-11');
      expect(service.getEndDate()).toBe('2026-01-20');
      expect(service.getCanNavigateToNextMonth()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps period-step direction when crossing sub-monthly month boundaries', () => {
    lunchMoney.budgetSummaryQueue = [
      {
        aligned: true,
        items: [createSummary('2024-02-01', {})],
        periods: [
          { startDate: '2024-02-01', endDate: '2024-02-14' },
          { startDate: '2024-02-15', endDate: '2024-02-29' },
        ],
      },
      {
        aligned: true,
        items: [createSummary('2024-02-01', {})],
        periods: [],
      },
      {
        aligned: true,
        items: [createSummary('2024-01-01', {})],
        periods: [
          { startDate: '2024-01-01', endDate: '2024-01-17' },
          { startDate: '2024-01-18', endDate: '2024-01-31' },
        ],
      },
      {
        aligned: true,
        items: [createSummary('2024-01-18', {})],
        periods: [],
      },
    ];

    initService();

    expect(service.getPeriodMode()).toBe('sub-monthly');
    expect(service.getStartDate()).toBe('2024-02-01');
    expect(service.getEndDate()).toBe('2024-02-14');

    service.goToPreviousPeriod();

    expect(service.getPeriodMode()).toBe('sub-monthly');
    expect(service.getStartDate()).toBe('2024-01-18');
    expect(service.getEndDate()).toBe('2024-01-31');
  });

  it('persists custom period to localStorage when setCustomPeriod is called', () => {
    initService();

    service.setCustomPeriod('2026-01-15', '2026-01-28');

    const stored = localStorage.getItem(CUSTOM_PERIOD_KEY) ?? '';
    expect(stored).not.toBe('');
    const parsed = JSON.parse(stored) as { start: string; end: string };
    expect(parsed.start).toBe('2026-01-15');
    expect(parsed.end).toBe('2026-01-28');
  });

  it('restores saved custom period on initialization', () => {
    localStorage.setItem(
      CUSTOM_PERIOD_KEY,
      JSON.stringify({ start: '2026-01-10', end: '2026-01-23' })
    );

    initService();

    expect(service.getPeriodMode()).toBe('non-aligned');
    expect(service.getStartDate()).toBe('2026-01-10');
    expect(service.getEndDate()).toBe('2026-01-23');
  });

  it('uses saved custom period instead of prompting dialog when API returns aligned=false', () => {
    localStorage.setItem(
      CUSTOM_PERIOD_KEY,
      JSON.stringify({ start: '2026-01-10', end: '2026-01-23' })
    );

    // Queue: first response (for saved period dates) returns aligned=false,
    // second response (re-fetch with saved period) returns data.
    lunchMoney.budgetSummaryQueue = [
      {
        aligned: false,
        items: [],
        periods: [],
      },
      {
        aligned: false,
        items: [createSummary('2026-01-10', {})],
        periods: [],
      },
    ];

    initService();

    expect(service.getPeriodMode()).toBe('non-aligned');
    expect(service.getNonAlignedPeriodRequired()).toBe(false);
    expect(service.getStartDate()).toBe('2026-01-10');
    expect(service.getEndDate()).toBe('2026-01-23');
  });

  it('ignores invalid saved custom period data', () => {
    localStorage.setItem(CUSTOM_PERIOD_KEY, JSON.stringify({ start: '' }));
    initService();

    // Should fall back to current month (monthly mode).
    expect(service.getPeriodMode()).toBe('monthly');
  });
});
