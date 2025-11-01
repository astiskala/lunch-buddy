import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, Subject, throwError } from 'rxjs';
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

const PREFERENCES_KEY = 'lunchbuddy.categoryPreferences';

const defaultPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  warnAtRatio: 0.85,
  notificationsEnabled: false,
  includeAllTransactions: true,
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

  getRecurringExpenses(): Observable<RecurringExpense[]> {
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

const createTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: 1,
  date: '2025-10-01',
  amount: '-10',
  currency: 'USD',
  payee: 'Test',
  category_id: null,
  notes: null,
  recurring_id: null,
  recurring_payee: null,
  recurring_description: null,
  tags: [],
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

interface LoggerSpies {
  debug: jasmine.Spy<(message: string, ...args: unknown[]) => void>;
  info: jasmine.Spy<(message: string, ...args: unknown[]) => void>;
  warn: jasmine.Spy<(message: string, ...args: unknown[]) => void>;
  error: jasmine.Spy<
    (message: string, error?: unknown, ...args: unknown[]) => void
  >;
}

describe('BudgetService background sync', () => {
  let lunchMoney: MockLunchMoneyService;
  let logger: LoggerService;
  let loggerSpies: LoggerSpies;
  interface BackgroundPreferencesPayload {
    hiddenCategoryIds: number[];
    notificationsEnabled: boolean;
    warnAtRatio: number;
    currency: string | null;
  }

  interface BackgroundSyncStub {
    updateBudgetPreferences: (
      payload: BackgroundPreferencesPayload
    ) => Promise<void>;
  }

  let backgroundSync: jasmine.SpyObj<BackgroundSyncStub>;
  let service: BudgetService;

  beforeEach(() => {
    localStorage.clear();
    lunchMoney = new MockLunchMoneyService();
    loggerSpies = {
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
    };
    logger = {
      debug: loggerSpies.debug,
      info: loggerSpies.info,
      warn: loggerSpies.warn,
      error: loggerSpies.error,
    } as unknown as LoggerService;
    backgroundSync = jasmine.createSpyObj<BackgroundSyncStub>(
      'BackgroundSyncService',
      ['updateBudgetPreferences']
    );

    backgroundSync.updateBudgetPreferences.and.resolveTo();
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
      warnAtRatio: 0.9,
    });

    initService();

    expect(backgroundSync.updateBudgetPreferences).toHaveBeenCalled();
    const [payload] =
      backgroundSync.updateBudgetPreferences.calls.mostRecent().args;
    expect(payload).toEqual(
      jasmine.objectContaining({
        hiddenCategoryIds: [5],
        notificationsEnabled: true,
        warnAtRatio: 0.9,
      })
    );
  });

  it('updates background sync when preferences change', () => {
    initService();
    backgroundSync.updateBudgetPreferences.calls.reset();

    service.updatePreferences(current => ({
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
    const [payload] =
      backgroundSync.updateBudgetPreferences.calls.mostRecent().args;
    expect(payload.currency).toBe('USD');
  });

  it('creates a single uncategorised expense entry for negative-only transactions', () => {
    initService();
    const monthKey = (service as unknown as { monthKey: string }).monthKey;

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
        data: {
          [monthKey]: {
            num_transactions: 2,
            spending_to_base: 171.25,
            budget_to_base: 0,
            budget_amount: 0,
            budget_currency: 'USD',
            is_automated: false,
          },
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
    const monthKey = (service as unknown as { monthKey: string }).monthKey;

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
        data: {
          [monthKey]: {
            num_transactions: 3,
            spending_to_base: 200,
            budget_to_base: 0,
            budget_amount: 0,
            budget_currency: 'USD',
            is_automated: false,
          },
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
    const monthKey = (service as unknown as { monthKey: string }).monthKey;

    lunchMoney.budgetSummary$.next([
      createSummary(monthKey, {
        category_id: 10,
        category_name: 'Dining Out',
        data: {
          [monthKey]: {
            num_transactions: 1,
            spending_to_base: 120,
            budget_to_base: 0,
            budget_amount: 0,
            budget_currency: 'USD',
            is_automated: false,
          },
        },
      }),
      createSummary(monthKey, {
        category_id: 20,
        category_name: 'Salary',
        is_income: true,
        data: {
          [monthKey]: {
            num_transactions: 1,
            spending_to_base: -5000,
            budget_to_base: 0,
            budget_amount: 0,
            budget_currency: 'USD',
            is_automated: false,
          },
        },
      }),
    ]);

    service.updatePreferences(current => ({
      ...current,
      hiddenCategoryIds: [10, 20],
    }));

    const hiddenExpenses = service.getHiddenExpenses();
    const hiddenIncomes = service.getHiddenIncomes();

    expect(hiddenExpenses.some(item => item.categoryId === 10)).toBeTrue();
    expect(hiddenIncomes.some(item => item.categoryId === 20)).toBeTrue();
  });

  it('recovers from recurring expense load failures', () => {
    initService();
    const failure = new Error('network');
    const getRecurringExpensesSpy = spyOn(
      lunchMoney,
      'getRecurringExpenses'
    ).and.returnValue(throwError(() => failure));

    service.loadRecurringExpenses();

    expect(getRecurringExpensesSpy).toHaveBeenCalled();
    expect(loggerSpies.error).toHaveBeenCalledWith(
      'Failed to load recurring expenses',
      failure
    );
  });

  it('refresh reuses budget and recurring loaders', () => {
    initService();
    const loadBudgetSpy = spyOn(
      service as unknown as { loadBudgetData: () => void },
      'loadBudgetData'
    ).and.callThrough();
    const loadRecurringSpy = spyOn(
      service as unknown as { loadRecurringExpenses: () => void },
      'loadRecurringExpenses'
    ).and.callThrough();

    service.refresh();

    expect(loadBudgetSpy).toHaveBeenCalledTimes(1);
    expect(loadRecurringSpy).toHaveBeenCalledTimes(1);
  });
});
