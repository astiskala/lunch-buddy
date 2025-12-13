import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, of, switchMap, catchError, map } from 'rxjs';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import {
  Transaction,
  BudgetProgress,
  BudgetSummaryItem,
  RecurringExpense,
  RecurringInstance,
  TransactionsResponse,
} from '../../core/models/lunchmoney.types';
import {
  buildBudgetProgress,
  calculateBudgetStatus,
  rankBudgetProgress,
} from '../utils/budget.util';
import {
  deriveReferenceDate,
  getCurrentMonthRange,
  getMonthProgress,
  toIsoDate,
} from '../utils/date.util';
import {
  getRecurringDate,
  isRecurringInstancePending,
} from '../utils/recurring.util';
import { BackgroundSyncService } from '../../core/services/background-sync.service';
import { LoggerService } from '../../core/services/logger.service';

export interface CategoryPreferences {
  customOrder: (number | null)[];
  hiddenCategoryIds: (number | null)[];
  warnAtRatio: number;
  notificationsEnabled: boolean;
  includeAllTransactions: boolean;
}

const defaultCategoryPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  warnAtRatio: 0.85,
  notificationsEnabled: false,
  includeAllTransactions: true,
};

const PREFERENCES_KEY = 'lunchbuddy.categoryPreferences';
const LAST_REFRESH_KEY = 'lunchbuddy.lastRefresh';
const UNCATEGORISED_EXPENSES_LABEL = 'Uncategorised Expenses';
const UNCATEGORISED_INCOME_LABEL = 'Uncategorised Income';

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  readonly lunchMoneyService = inject(LunchMoneyService);
  readonly backgroundSyncService = inject(BackgroundSyncService);
  readonly logger = inject(LoggerService);

  // Month information
  readonly monthRange = getCurrentMonthRange();
  protected readonly monthKey = toIsoDate(this.monthRange.start);
  protected readonly startDate = signal(this.monthKey);
  protected readonly endDate = signal(toIsoDate(this.monthRange.end));
  protected readonly monthProgressRatio = signal(getMonthProgress());

  // Data state
  protected readonly budgetData = signal<BudgetProgress[]>([]);
  protected readonly recurringExpenses = signal<RecurringExpense[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isRecurringLoading = signal(false);
  protected readonly lastRefresh = signal<Date | null>(this.loadLastRefresh());
  protected readonly errors = signal<Error[]>([]);

  // Preferences
  protected readonly preferences = signal<CategoryPreferences>(
    this.loadPreferences()
  );

  // Computed values
  protected readonly expenses = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter(
      item => !item.isIncome && !hiddenIds.has(item.categoryId)
    );
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly hiddenExpenses = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter(
      item => !item.isIncome && hiddenIds.has(item.categoryId)
    );
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly incomes = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter(
      item => item.isIncome && !hiddenIds.has(item.categoryId)
    );
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly hiddenIncomes = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter(
      item => item.isIncome && hiddenIds.has(item.categoryId)
    );
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly currency = computed(() => {
    const data = this.budgetData();
    const firstExpense = data.find(
      item => !item.isIncome && item.budgetCurrency
    );
    if (firstExpense?.budgetCurrency) {
      return firstExpense.budgetCurrency;
    }
    const firstIncome = data.find(item => item.isIncome && item.budgetCurrency);
    return firstIncome?.budgetCurrency ?? null;
  });

  protected readonly referenceDate = computed(() =>
    deriveReferenceDate(this.startDate(), this.endDate())
  );

  // Recurring expenses by category
  protected readonly recurringByCategory = computed(() => {
    const assigned = new Map<number | null, RecurringInstance[]>();
    const unassigned: RecurringInstance[] = [];
    const expenses = this.recurringExpenses();

    if (!expenses.length) {
      return { assigned, unassigned };
    }

    const windowStart = this.startDate();
    const windowEnd = this.endDate();
    const referenceDate = deriveReferenceDate(windowStart, windowEnd);

    for (const expense of expenses) {
      const occurrenceDate = getRecurringDate(expense, {
        windowStart,
        windowEnd,
        referenceDate,
      });

      if (!occurrenceDate) {
        continue;
      }

      const entry: RecurringInstance = { expense, occurrenceDate };

      if (expense.category_id) {
        const list = assigned.get(expense.category_id) ?? [];
        list.push(entry);
        assigned.set(expense.category_id, list);
      } else {
        unassigned.push(entry);
      }
    }

    // Sort each list by occurrence date
    for (const list of assigned.values()) {
      list.sort(
        (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
      );
    }
    unassigned.sort(
      (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
    );

    return { assigned, unassigned };
  });

  constructor() {
    this.loadBudgetData();
    this.loadRecurringExpenses();
    this.syncBackgroundPreferences();
  }

  private loadPreferences(): CategoryPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return {
          ...defaultCategoryPreferences,
          ...(JSON.parse(stored) as Partial<CategoryPreferences>),
        };
      }
    } catch (error: unknown) {
      this.logger.error('Failed to load preferences', error);
    }
    return defaultCategoryPreferences;
  }

  private savePreferences(prefs: CategoryPreferences): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error: unknown) {
      this.logger.error('Failed to save preferences', error);
    }
  }

  updatePreferences(
    updater: (current: CategoryPreferences) => CategoryPreferences
  ): void {
    const updated = updater(this.preferences());
    this.preferences.set(updated);
    this.savePreferences(updated);
    this.syncBackgroundPreferences();
  }

  loadBudgetData(): void {
    this.isLoading.set(true);
    this.errors.set([]);

    this.lunchMoneyService
      .getBudgetSummary(this.startDate(), this.endDate())
      .pipe(
        switchMap((summaries: BudgetSummaryItem[]) =>
          this.buildBudgetProgressFromSummaries(summaries)
        )
      )
      .subscribe({
        next: (progress: BudgetProgress[]) => {
          this.budgetData.set(progress);
          this.recomputeBudgetStatuses();
          this.isLoading.set(false);
          this.syncBackgroundPreferences();

          if (this.canUseNavigator() ? navigator.onLine : true) {
            const timestamp = new Date();
            this.lastRefresh.set(timestamp);
            this.persistLastRefresh(timestamp);
          }
        },
        error: (error: unknown) => {
          this.logger.error('Failed to refresh budget data', error);
          this.errors.set([error as Error]);
          this.isLoading.set(false);
        },
      });
  }

  loadRecurringExpenses(): void {
    this.isRecurringLoading.set(true);

    this.lunchMoneyService
      .getRecurringExpenses(this.startDate(), this.endDate())
      .subscribe({
        next: (expenses: RecurringExpense[]) => {
          this.recurringExpenses.set(expenses);
          this.recomputeBudgetStatuses();
          this.isRecurringLoading.set(false);
        },
        error: (error: unknown) => {
          this.logger.error('Failed to load recurring expenses', error);
          this.isRecurringLoading.set(false);
        },
      });
  }

  refresh(): void {
    this.loadBudgetData();
    this.loadRecurringExpenses();
  }

  // Public getters for components
  getExpenses = this.expenses;
  getHiddenExpenses = this.hiddenExpenses;
  getIncomes = this.incomes;
  getHiddenIncomes = this.hiddenIncomes;
  getCurrency = this.currency;
  getIsLoading = this.isLoading;
  getErrors = this.errors;
  getStartDate = this.startDate;
  getEndDate = this.endDate;
  getMonthProgressRatio = this.monthProgressRatio;
  getPreferences = this.preferences;
  getRecurringByCategory = this.recurringByCategory;
  getLastRefresh = this.lastRefresh;
  getReferenceDate = this.referenceDate;

  private buildBudgetProgressFromSummaries(
    summaries: BudgetSummaryItem[]
  ): Observable<BudgetProgress[]> {
    const monthKey = this.monthKey;
    const monthProgress = this.monthProgressRatio();
    const warnAtRatio = this.preferences().warnAtRatio;
    const includeAll = this.preferences().includeAllTransactions;
    const filterBudgetableItems = (
      items: BudgetProgress[]
    ): BudgetProgress[] => {
      const budgetable = items.filter(item => !item.excludeFromBudget);
      const hasCategoryBudgets = budgetable.some(
        item => !item.isGroup && item.categoryId !== null
      );

      if (hasCategoryBudgets) {
        return budgetable.filter(item => !item.isGroup);
      }

      return budgetable;
    };

    // Separate uncategorised from regular summaries
    const uncategorisedSummaries: BudgetSummaryItem[] = [];
    const regularItems: BudgetProgress[] = [];

    const shouldSplitUncategorised = (summary: BudgetSummaryItem): boolean => {
      const normalizedName = summary.category_name.trim().toLowerCase();
      const hasQualifier =
        normalizedName.includes('income') || normalizedName.includes('expense');
      const isDefaultName =
        normalizedName === 'uncategorized' ||
        normalizedName === 'uncategorised';
      const isNullCategory = summary.category_id === null;
      return (isNullCategory || isDefaultName) && !hasQualifier;
    };

    for (const summary of summaries) {
      if (shouldSplitUncategorised(summary)) {
        uncategorisedSummaries.push(summary);
      } else {
        const item = buildBudgetProgress(
          summary,
          monthKey,
          monthProgress,
          warnAtRatio
        );
        regularItems.push(item);
      }
    }

    if (uncategorisedSummaries.length === 0) {
      return of(filterBudgetableItems(regularItems));
    }

    interface SplitResult {
      summary: BudgetSummaryItem;
      expense?: {
        total: number;
        transactions: number;
        transactionList: Transaction[];
      };
      income?: {
        total: number;
        transactions: number;
        transactionList: Transaction[];
      };
      fallback?: BudgetProgress;
    }

    // Only one API call for all uncategorized transactions
    const uncategorisedSummary = uncategorisedSummaries[0];
    const uncategorisedRequest: Observable<SplitResult> = this.lunchMoneyService
      .getCategoryTransactions(
        uncategorisedSummary.category_id,
        this.startDate(),
        this.endDate(),
        {
          includeAllTransactions: includeAll,
        }
      )
      .pipe(
        map((response: TransactionsResponse): SplitResult => {
          let expenseTotal = 0;
          let expenseCount = 0;
          let incomeTotal = 0;
          let incomeCount = 0;
          const expenseTransactions: typeof response.transactions = [];
          const incomeTransactions: typeof response.transactions = [];

          for (const transaction of response.transactions) {
            const value =
              transaction.to_base ?? Number.parseFloat(transaction.amount);
            if (Number.isNaN(value)) continue;
            if (value < 0) {
              incomeTotal += Math.abs(value);
              incomeCount += 1;
              incomeTransactions.push(transaction);
            } else if (value > 0) {
              expenseTotal += value;
              expenseCount += 1;
              expenseTransactions.push(transaction);
            }
            // Zero amounts are ignored
          }

          const result: SplitResult = { summary: uncategorisedSummary };

          if (expenseTotal > 0) {
            result.expense = {
              total: expenseTotal,
              transactions: expenseCount,
              transactionList: expenseTransactions,
            };
          }

          if (incomeTotal > 0) {
            result.income = {
              total: incomeTotal,
              transactions: incomeCount,
              transactionList: incomeTransactions,
            };
          }

          if (!result.expense && !result.income) {
            result.fallback = buildBudgetProgress(
              uncategorisedSummary,
              monthKey,
              monthProgress,
              warnAtRatio
            );
          }

          return result;
        }),
        catchError((error: unknown) => {
          this.logger.error(
            'Failed to fetch uncategorised transactions',
            error
          );
          return of({
            summary: uncategorisedSummary,
            fallback: buildBudgetProgress(
              uncategorisedSummary,
              monthKey,
              monthProgress,
              warnAtRatio
            ),
          } satisfies SplitResult);
        })
      );

    return uncategorisedRequest.pipe(
      switchMap((result: SplitResult) => {
        const derivedItems: BudgetProgress[] = [];
        const fallbackItems: BudgetProgress[] = [];
        if (result.fallback) {
          fallbackItems.push(result.fallback);
        }
        if (result.expense) {
          derivedItems.push(
            this.buildUncategorisedProgress({
              baseSummary: result.summary,
              monthKey,
              monthProgress,
              warnAtRatio,
              amount: result.expense.total,
              transactions: result.expense.transactions,
              isIncome: false,
              transactionList: result.expense.transactionList,
            })
          );
        }
        if (result.income) {
          derivedItems.push(
            this.buildUncategorisedProgress({
              baseSummary: result.summary,
              monthKey,
              monthProgress,
              warnAtRatio,
              amount: result.income.total,
              transactions: result.income.transactions,
              isIncome: true,
              transactionList: result.income.transactionList,
            })
          );
        }
        const allItems = [...regularItems, ...derivedItems, ...fallbackItems];
        return of(filterBudgetableItems(allItems));
      })
    );
  }

  private buildUncategorisedProgress(options: {
    baseSummary: BudgetSummaryItem;
    monthKey: string;
    monthProgress: number;
    warnAtRatio: number;
    amount: number;
    transactions: number;
    isIncome: boolean;
    transactionList: Transaction[];
  }): BudgetProgress {
    const {
      baseSummary,
      monthKey,
      monthProgress,
      warnAtRatio,
      amount,
      transactions,
      isIncome,
      transactionList,
    } = options;

    const budgetAmount =
      baseSummary.occurrence?.budgeted ?? baseSummary.totals.budgeted ?? 0;
    const budgetCurrency = baseSummary.occurrence?.budgeted_currency ?? null;
    const spent = isIncome ? -Math.abs(amount) : Math.abs(amount);
    const actualValue = Math.abs(spent);
    const remaining = budgetAmount - actualValue;
    const recurringTotal = baseSummary.totals.recurring_expected;
    const progressRatio =
      budgetAmount && budgetAmount > 0
        ? Math.min(1, Math.max(0, actualValue / budgetAmount))
        : 0;
    const label = isIncome
      ? UNCATEGORISED_INCOME_LABEL
      : UNCATEGORISED_EXPENSES_LABEL;

    const progress: BudgetProgress = {
      categoryId: baseSummary.category_id,
      categoryName: label,
      categoryGroupName: baseSummary.category_group_name,
      groupId: baseSummary.group_id,
      isGroup: false,
      isIncome,
      excludeFromBudget: baseSummary.exclude_from_budget,
      budgetAmount,
      budgetCurrency,
      spent,
      remaining,
      monthKey,
      numTransactions: transactions,
      isAutomated: false,
      recurringTotal,
      recurringItems: [],
      status: calculateBudgetStatus(
        spent,
        budgetAmount,
        monthProgress,
        warnAtRatio,
        isIncome,
        recurringTotal
      ),
      progressRatio,
      transactionList,
    };

    return progress;
  }

  private syncBackgroundPreferences(): void {
    const prefs = this.preferences();
    const currency = this.currency();

    this.backgroundSyncService
      .updateBudgetPreferences({
        hiddenCategoryIds: prefs.hiddenCategoryIds,
        notificationsEnabled: prefs.notificationsEnabled,
        warnAtRatio: prefs.warnAtRatio,
        currency,
      })
      .catch((error: unknown) => {
        this.logger.error('Failed to sync background preferences', error);
      });
  }

  private recomputeBudgetStatuses(): void {
    const items = this.budgetData();
    if (items.length === 0) {
      return;
    }

    const { assigned } = this.recurringByCategory();
    const referenceDate = this.referenceDate();
    const monthProgress = this.monthProgressRatio();
    const warnAtRatio = this.preferences().warnAtRatio;

    const updated = items.map(item => {
      const instances = assigned.get(item.categoryId) ?? [];
      const upcomingTotal = instances
        .filter(instance =>
          isRecurringInstancePending(instance, { referenceDate })
        )
        .reduce((total, instance) => {
          const amount = Number.parseFloat(instance.expense.amount);
          if (Number.isNaN(amount)) {
            return total;
          }
          return total + Math.abs(amount);
        }, 0);

      const recurringTotal =
        upcomingTotal > 0 ? upcomingTotal : item.recurringTotal;

      return {
        ...item,
        recurringTotal,
        status: calculateBudgetStatus(
          item.spent,
          item.budgetAmount,
          monthProgress,
          warnAtRatio,
          item.isIncome,
          recurringTotal
        ),
      };
    });

    this.budgetData.set(updated);
  }

  private loadLastRefresh(): Date | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const rawValue = localStorage.getItem(LAST_REFRESH_KEY);
      if (!rawValue) {
        return null;
      }

      const parsed = new Date(rawValue);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch (error: unknown) {
      this.logger.error('Failed to read last refresh timestamp', error);
      return null;
    }
  }

  private persistLastRefresh(timestamp: Date): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(LAST_REFRESH_KEY, timestamp.toISOString());
    } catch (error: unknown) {
      this.logger.error('Failed to store last refresh timestamp', error);
    }
  }

  private canUseNavigator(): boolean {
    return (
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    );
  }
}
