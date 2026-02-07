import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, Subject, throwError } from 'rxjs';
import { vi, type Mock } from 'vitest';
import {
  BudgetSummaryItem,
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

const defaultPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  notificationsEnabled: false,
  includeAllTransactions: true,
  hideGroupedCategories: false,
};

class MockLunchMoneyService {
  budgetSummary$ = new Subject<BudgetSummaryItem[]>();
  categoryTransactionsResponse: TransactionsResponse = {
    transactions: [],
    has_more: false,
  };

  getBudgetSummary(): Observable<BudgetSummaryItem[]> {
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
    storePreferences({
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
    lunchMoney.budgetSummary$.next([createSummary(monthKey, {})]);

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

    lunchMoney.budgetSummary$.next([
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

    // Find the uncategorised expense entry by checking for null/undefined categoryId and correct name
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

    lunchMoney.budgetSummary$.next([
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

    lunchMoney.budgetSummary$.next([
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

    lunchMoney.budgetSummary$.next([
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

    lunchMoney.budgetSummary$.next([
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
      new Observable<BudgetSummaryItem[]>(subscriber => {
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
});
