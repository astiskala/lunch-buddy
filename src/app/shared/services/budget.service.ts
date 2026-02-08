import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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
import { normalizeCurrencyCode, resolveAmount } from '../utils/currency.util';
import {
  deriveReferenceDate,
  getCurrentMonthRange,
  getMonthProgress,
  getWindowRange,
  toIsoDate,
} from '../utils/date.util';
import {
  getRecurringDate,
  hasFoundTransactionForOccurrence,
  filterPendingInstances,
} from '../utils/recurring.util';
import { BackgroundSyncService } from '../../core/services/background-sync.service';
import { LoggerService } from '../../core/services/logger.service';
import { DiagnosticsService } from '../../core/services/diagnostics.service';
import {
  normalizeError,
  NormalizedError,
} from '../../core/utils/diagnostics.utils';

export interface CategoryPreferences {
  customOrder: (number | null)[];
  hiddenCategoryIds: (number | null)[];
  notificationsEnabled: boolean;
  includeAllTransactions: boolean;
  hideGroupedCategories: boolean;
}

const defaultCategoryPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  notificationsEnabled: false,
  includeAllTransactions: true,
  hideGroupedCategories: false,
};

const PREFERENCES_KEY = 'lunchbuddy.categoryPreferences';
const LAST_REFRESH_KEY = 'lunchbuddy.lastRefresh';
const PREFERENCES_SCHEMA_VERSION = 1;
const UNCATEGORISED_EXPENSES_LABEL = 'Uncategorised Expenses';
const UNCATEGORISED_INCOME_LABEL = 'Uncategorised Income';

interface PersistedCategoryPreferences {
  version: number;
  preferences: CategoryPreferences;
}

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  readonly lunchMoneyService = inject(LunchMoneyService);
  readonly backgroundSyncService = inject(BackgroundSyncService);
  readonly logger = inject(LoggerService);
  private readonly diagnostics = inject(DiagnosticsService);

  // Month information
  private readonly currentMonthRange = getCurrentMonthRange();
  private readonly currentMonthStartKey = toIsoDate(
    this.currentMonthRange.start
  );
  protected readonly startDate = signal(this.currentMonthStartKey);
  protected readonly endDate = signal(toIsoDate(this.currentMonthRange.end));
  protected readonly monthProgressRatio = signal(getMonthProgress());
  protected readonly canNavigateToNextMonth = computed(
    () => this.startDate() < this.currentMonthStartKey
  );

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
    const prefs = this.preferences();
    return this.getVisibleItemsByType(false, prefs);
  });

  protected readonly hiddenExpenses = computed(() => {
    const prefs = this.preferences();
    return this.getHiddenItemsByType(false, prefs);
  });

  protected readonly incomes = computed(() => {
    const prefs = this.preferences();
    return this.getVisibleItemsByType(true, prefs);
  });

  protected readonly hiddenIncomes = computed(() => {
    const prefs = this.preferences();
    return this.getHiddenItemsByType(true, prefs);
  });

  protected readonly currency = computed(() => {
    const data = this.budgetData();
    const firstExpense = data.find(
      item => !item.isIncome && item.budgetCurrency
    );
    const candidate =
      firstExpense?.budgetCurrency ??
      data.find(item => item.isIncome && item.budgetCurrency)?.budgetCurrency ??
      null;

    return normalizeCurrencyCode(candidate);
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

    for (const expense of expenses) {
      const occurrenceDate = getRecurringDate(expense, {
        windowStart,
        windowEnd,
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
        const parsed = JSON.parse(stored) as
          | Partial<CategoryPreferences>
          | Partial<PersistedCategoryPreferences>;

        const preferences = this.extractStoredPreferences(parsed);
        return {
          ...defaultCategoryPreferences,
          ...preferences,
        };
      }
    } catch (error: unknown) {
      this.logger.error('Failed to load preferences', error);
    }
    return defaultCategoryPreferences;
  }

  private savePreferences(prefs: CategoryPreferences): void {
    try {
      const payload: PersistedCategoryPreferences = {
        version: PREFERENCES_SCHEMA_VERSION,
        preferences: prefs,
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(payload));
    } catch (error: unknown) {
      this.logger.error('Failed to save preferences', error);
    }
  }

  private extractStoredPreferences(
    parsed: Partial<CategoryPreferences> | Partial<PersistedCategoryPreferences>
  ): Partial<CategoryPreferences> {
    if (this.isPersistedPreferences(parsed)) {
      return parsed.preferences;
    }

    return parsed as Partial<CategoryPreferences>;
  }

  private isPersistedPreferences(
    value: Partial<CategoryPreferences> | Partial<PersistedCategoryPreferences>
  ): value is PersistedCategoryPreferences {
    const maybePersisted = value as Partial<PersistedCategoryPreferences>;
    return (
      typeof maybePersisted.version === 'number' &&
      !!maybePersisted.preferences &&
      typeof maybePersisted.preferences === 'object'
    );
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

    const startDate = this.startDate();
    const endDate = this.endDate();

    this.diagnostics.log('info', 'budget', 'Loading budget data', {
      startDate,
      endDate,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
    });

    this.lunchMoneyService
      .getBudgetSummary(startDate, endDate)
      .pipe(
        switchMap((summaries: BudgetSummaryItem[]) =>
          this.buildBudgetProgressFromSummaries(summaries)
        )
      )
      .subscribe({
        next: (progress: BudgetProgress[]) => {
          this.diagnostics.log(
            'info',
            'budget',
            'Budget data loaded successfully',
            {
              categoryCount: progress.length,
            }
          );
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
          const normalizedError = normalizeError(error);
          const displayError = this.toDisplayError(error, normalizedError);
          this.logger.error('Failed to refresh budget data', error);
          this.diagnostics.log(
            'error',
            'budget',
            'Failed to load budget data',
            {
              startDate,
              endDate,
              normalizedError: {
                name: normalizedError.name,
                message: normalizedError.message,
                hasStack: !!normalizedError.stack,
              },
              displayMessage: displayError.message,
            },
            error
          );
          this.errors.set([displayError]);
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

  goToPreviousMonth(): void {
    this.shiftDisplayedMonth(-1);
  }

  goToNextMonth(): void {
    this.shiftDisplayedMonth(1);
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
  getCanNavigateToNextMonth = this.canNavigateToNextMonth;

  private buildBudgetProgressFromSummaries(
    summaries: BudgetSummaryItem[]
  ): Observable<BudgetProgress[]> {
    const monthKey = this.startDate();
    const monthProgress = this.monthProgressRatio();
    const includeAll = this.preferences().includeAllTransactions;
    const filterBudgetableItems = (items: BudgetProgress[]): BudgetProgress[] =>
      items.filter(item => !item.excludeFromBudget);

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
        const item = buildBudgetProgress(summary, monthKey, monthProgress);
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
              monthProgress
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
              monthProgress
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
    amount: number;
    transactions: number;
    isIncome: boolean;
    transactionList: Transaction[];
  }): BudgetProgress {
    const {
      baseSummary,
      monthKey,
      monthProgress,
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
      budgetAmount > 0
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
      isAutomated: baseSummary.occurrence?.is_automated ?? false,
      recurringTotal,
      recurringItems: [],
      status: calculateBudgetStatus(
        spent,
        budgetAmount,
        monthProgress,
        isIncome
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
    const windowRange = getWindowRange(this.startDate(), this.endDate());
    const monthProgress = this.monthProgressRatio();

    const updated = items.map(item => {
      const instances = assigned.get(item.categoryId) ?? [];
      const upcomingTotal = filterPendingInstances(instances, {
        referenceDate,
        windowRange: windowRange ?? undefined,
      })
        .filter(instance => !hasFoundTransactionForOccurrence(instance))
        .reduce((total, instance) => {
          const amount = resolveAmount(
            instance.expense.amount,
            instance.expense.to_base ?? null
          );
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
          item.isIncome
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

  private shiftDisplayedMonth(monthDelta: number): void {
    if (!Number.isInteger(monthDelta) || monthDelta === 0) {
      return;
    }

    const currentStart = this.parseMonthStart(this.startDate());
    if (!currentStart) {
      return;
    }

    const targetStart = new Date(
      currentStart.getFullYear(),
      currentStart.getMonth() + monthDelta,
      1
    );
    const targetKey = toIsoDate(targetStart);

    if (
      targetKey > this.currentMonthStartKey ||
      targetKey === this.startDate()
    ) {
      return;
    }

    const targetRange = getCurrentMonthRange(targetStart);
    this.startDate.set(targetKey);
    this.endDate.set(toIsoDate(targetRange.end));
    this.monthProgressRatio.set(this.resolveMonthProgress(targetStart));
    this.refresh();
  }

  private resolveMonthProgress(monthStart: Date): number {
    if (this.isSameMonth(monthStart, this.currentMonthRange.start)) {
      return getMonthProgress();
    }
    return monthStart.getTime() < this.currentMonthRange.start.getTime()
      ? 1
      : 0;
  }

  private isSameMonth(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  private parseMonthStart(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return null;
    }

    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return null;
    }
    if (month < 1 || month > 12) {
      return null;
    }

    return new Date(year, month - 1, 1);
  }

  private getVisibleItemsByType(
    isIncome: boolean,
    prefs: CategoryPreferences
  ): BudgetProgress[] {
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    return this.getOrderedItemsByType(isIncome, prefs).filter(
      item => !hiddenIds.has(item.categoryId)
    );
  }

  private getHiddenItemsByType(
    isIncome: boolean,
    prefs: CategoryPreferences
  ): BudgetProgress[] {
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    return this.getOrderedItemsByType(isIncome, prefs).filter(item =>
      hiddenIds.has(item.categoryId)
    );
  }

  private getOrderedItemsByType(
    isIncome: boolean,
    prefs: CategoryPreferences
  ): BudgetProgress[] {
    const typeItems = this.budgetData().filter(
      item => item.isIncome === isIncome && !item.excludeFromBudget
    );
    const hasCategoryBudgets = typeItems.some(
      item => !item.isGroup && item.categoryId !== null
    );
    const baseItems = hasCategoryBudgets
      ? typeItems.filter(item => !item.isGroup)
      : typeItems;
    const rankedItems = rankBudgetProgress(baseItems, prefs.customOrder);

    if (!prefs.hideGroupedCategories) {
      return rankedItems;
    }

    return this.collapseGroupedCategories(rankedItems, typeItems);
  }

  private collapseGroupedCategories(
    items: BudgetProgress[],
    typeItems: BudgetProgress[]
  ): BudgetProgress[] {
    const groupById = this.buildGroupMap(typeItems);
    const emittedGroups = new Set<number>();
    const collapsed: BudgetProgress[] = [];

    for (const item of items) {
      const resolved = this.resolveCollapsedItem(
        item,
        groupById,
        emittedGroups
      );
      if (resolved) {
        collapsed.push(resolved);
      }
    }

    return collapsed;
  }

  private buildGroupMap(
    typeItems: BudgetProgress[]
  ): Map<number, BudgetProgress> {
    const groupById = new Map<number, BudgetProgress>();
    for (const candidate of typeItems) {
      if (candidate.isGroup && candidate.categoryId !== null) {
        groupById.set(candidate.categoryId, candidate);
      }
    }
    return groupById;
  }

  private resolveCollapsedItem(
    item: BudgetProgress,
    groupById: Map<number, BudgetProgress>,
    emittedGroups: Set<number>
  ): BudgetProgress | null {
    if (item.isGroup) {
      if (item.categoryId !== null) {
        emittedGroups.add(item.categoryId);
      }
      return item;
    }

    const groupId = item.groupId;
    if (groupId === null || emittedGroups.has(groupId)) {
      return groupId === null ? item : null;
    }

    const groupItem = groupById.get(groupId);
    if (groupItem) {
      emittedGroups.add(groupId);
      return groupItem;
    }
    return item;
  }

  private toDisplayError(
    error: unknown,
    normalizedError: NormalizedError
  ): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return new Error(
          'Authentication failed. Your Lunch Money API key may be missing, expired, or invalid. Use "Use different API key" to sign in again.'
        );
      }

      if (error.status === 429) {
        return new Error(
          'Lunch Money is rate-limiting requests right now. Please wait a moment and retry.'
        );
      }

      if (error.status >= 500) {
        return new Error(
          'Lunch Money is currently unavailable. Please retry in a moment.'
        );
      }
    }

    if (
      error instanceof Error &&
      error.message.trim().length > 0 &&
      error.message !== '[object Object]'
    ) {
      return error;
    }

    if (
      normalizedError.message.trim().length > 0 &&
      normalizedError.message !== '[object Object]' &&
      normalizedError.message !== '{}'
    ) {
      return new Error(normalizedError.message);
    }

    return new Error(
      'Unexpected error while loading budget data. Please retry in a moment.'
    );
  }
}
