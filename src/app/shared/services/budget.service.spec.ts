import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { BudgetSummaryItem, RecurringExpense } from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { PushNotificationService } from './push-notification.service';
import { BudgetService, CategoryPreferences } from './budget.service';

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

const createSummary = (monthKey: string, options: { [key: string]: unknown }): BudgetSummaryItem => {
  const {
    categoryId,
    categoryName,
    isIncome = false,
    budgetAmount,
    spent,
    budgetCurrency = 'USD',
  } = options as {
    categoryId: number;
    categoryName: string;
    isIncome?: boolean;
    budgetAmount: number;
    spent: number;
    budgetCurrency?: string;
  };

  return {
    category_id: categoryId,
    category_name: categoryName,
    category_group_name: null,
    group_id: null,
    is_group: false,
    is_income: isIncome,
    exclude_from_budget: false,
    exclude_from_totals: false,
    order: 0,
    archived: false,
    data: {
      [monthKey]: {
        num_transactions: 1,
        spending_to_base: spent,
        budget_to_base: budgetAmount,
        budget_amount: budgetAmount,
        budget_currency: budgetCurrency,
        is_automated: false,
      },
    },
    config: null,
    recurring: { data: [] },
  };
};

const storePreferences = (prefs: Partial<CategoryPreferences>) => {
  localStorage.setItem(
    PREFERENCES_KEY,
    JSON.stringify({
      ...defaultPreferences,
      ...prefs,
    }),
  );
};

describe('BudgetService notifications', () => {
  let lunchMoney: MockLunchMoneyService;
  let notifySpy: jasmine.Spy;
  let service: BudgetService;

  beforeEach(() => {
    localStorage.clear();
    lunchMoney = new MockLunchMoneyService();
    notifySpy = jasmine.createSpy('notifyBudgetAlerts').and.returnValue(Promise.resolve());
  });

  const initService = () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BudgetService,
        { provide: LunchMoneyService, useValue: lunchMoney },
        {
          provide: PushNotificationService,
          useValue: {
            notifyBudgetAlerts: notifySpy,
          },
        },
      ],
    });

    service = TestBed.inject(BudgetService);
  };

  it('dispatches notifications when alerts are present and enabled', () => {
    storePreferences({ notificationsEnabled: true });
    initService();

    const monthKey = (service as unknown as { monthKey: string }).monthKey;
    const summary = createSummary(monthKey, {
      categoryId: 1,
      categoryName: 'Dining Out',
      budgetAmount: 100,
      spent: 150,
    });

    lunchMoney.budgetSummary$.next([summary]);

    expect(notifySpy).toHaveBeenCalledTimes(1);
    const [alerts, context] = notifySpy.calls.argsFor(0);
    expect(alerts.length).toBe(1);
    expect(alerts[0]).toEqual(jasmine.objectContaining({ categoryId: 1, status: 'over' }));
    expect(context).toEqual({ currency: 'USD' });
  });

  it('does not dispatch notifications when disabled in preferences', () => {
    storePreferences({ notificationsEnabled: false });
    initService();

    const monthKey = (service as unknown as { monthKey: string }).monthKey;
    const summary = createSummary(monthKey, {
      categoryId: 2,
      categoryName: 'Groceries',
      budgetAmount: 120,
      spent: 140,
    });

    lunchMoney.budgetSummary$.next([summary]);

    expect(notifySpy).not.toHaveBeenCalled();
  });

  it('ignores alerts for hidden categories', () => {
    storePreferences({ notificationsEnabled: true, hiddenCategoryIds: [3] });
    initService();

    const monthKey = (service as unknown as { monthKey: string }).monthKey;
    const summary = createSummary(monthKey, {
      categoryId: 3,
      categoryName: 'Travel',
      budgetAmount: 300,
      spent: 350,
    });

    lunchMoney.budgetSummary$.next([summary]);

    expect(notifySpy).not.toHaveBeenCalled();
  });
});
