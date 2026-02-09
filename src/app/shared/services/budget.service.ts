import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, switchMap, catchError, map } from 'rxjs';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import {
  Transaction,
  BudgetPeriod,
  BudgetProgress,
  BudgetSummaryItem,
  BudgetSummaryResult,
  PeriodMode,
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
  getPeriodProgress,
  getWindowRange,
  shiftPeriod,
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
const CUSTOM_PERIOD_KEY = 'lunchbuddy.customPeriod';
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

  // Month state.
  private readonly currentMonthRange = getCurrentMonthRange();
  private readonly currentMonthStartKey = toIsoDate(
    this.currentMonthRange.start
  );
  protected readonly startDate = signal(this.currentMonthStartKey);
  protected readonly endDate = signal(toIsoDate(this.currentMonthRange.end));
  protected readonly monthProgressRatio = signal(getMonthProgress());

  // Period state.
  protected readonly periodMode = signal<PeriodMode>('monthly');
  protected readonly detectedPeriods = signal<BudgetPeriod[]>([]);
  protected readonly activePeriodIndex = signal(0);
  protected readonly nonAlignedPeriodRequired = signal(false);
  private pendingSubMonthlyPeriod: BudgetPeriod | null = null;
  protected readonly canNavigateToNextMonth = computed(() => {
    const mode = this.periodMode();
    if (mode === 'monthly') {
      return this.startDate() < this.currentMonthStartKey;
    }

    const todayKey = toIsoDate(new Date());

    if (mode === 'sub-monthly') {
      const periods = this.detectedPeriods();
      if (periods.length === 0) {
        return false;
      }

      const activeIndex = this.activePeriodIndex();
      if (activeIndex < periods.length - 1) {
        return true;
      }

      const anchor = periods[periods.length - 1];
      const shifted = shiftPeriod(anchor.startDate, anchor.endDate, 1);
      return shifted !== null && shifted.start <= todayKey;
    }

    const shifted = shiftPeriod(this.startDate(), this.endDate(), 1);
    return shifted !== null && shifted.start <= todayKey;
  });

  // Data state.
  protected readonly budgetData = signal<BudgetProgress[]>([]);
  protected readonly recurringExpenses = signal<RecurringExpense[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isRecurringLoading = signal(false);
  protected readonly lastRefresh = signal<Date | null>(this.loadLastRefresh());
  protected readonly errors = signal<Error[]>([]);

  // User preferences.
  protected readonly preferences = signal<CategoryPreferences>(
    this.loadPreferences()
  );

  // Derived values.
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

  // Recurring expenses grouped by category.
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

    // Sort each list by occurrence date.
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
    this.restoreSavedCustomPeriod();
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
      periodMode: this.periodMode(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
    });

    this.lunchMoneyService
      .getBudgetSummary(startDate, endDate)
      .pipe(
        switchMap((result: BudgetSummaryResult) => {
          if (this.periodMode() === 'monthly') {
            const periodSwitch = this.detectPeriodMode(result);
            if (periodSwitch) {
              return periodSwitch;
            }

            if (this.nonAlignedPeriodRequired()) {
              return of([]);
            }
          }
          return this.buildBudgetProgressFromSummaries(result.items);
        })
      )
      .subscribe({
        next: (progress: BudgetProgress[]) => {
          this.diagnostics.log(
            'info',
            'budget',
            'Budget data loaded successfully',
            {
              categoryCount: progress.length,
              periodMode: this.periodMode(),
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

  goToPreviousPeriod(): void {
    const mode = this.periodMode();
    if (mode === 'monthly') {
      this.shiftDisplayedMonth(-1);
    } else if (mode === 'sub-monthly') {
      this.shiftSubMonthlyPeriod(-1);
    } else {
      this.shiftCustomPeriod(-1);
    }
  }

  goToNextPeriod(): void {
    const mode = this.periodMode();
    if (mode === 'monthly') {
      this.shiftDisplayedMonth(1);
    } else if (mode === 'sub-monthly') {
      this.shiftSubMonthlyPeriod(1);
    } else {
      this.shiftCustomPeriod(1);
    }
  }

  goToPreviousMonth(): void {
    this.goToPreviousPeriod();
  }

  goToNextMonth(): void {
    this.goToNextPeriod();
  }

  setCustomPeriod(start: string, end: string): void {
    if (!start || !end || start > end) {
      return;
    }

    this.periodMode.set('non-aligned');
    this.detectedPeriods.set([]);
    this.activePeriodIndex.set(0);
    this.nonAlignedPeriodRequired.set(false);
    this.pendingSubMonthlyPeriod = null;
    this.startDate.set(start);
    this.endDate.set(end);
    this.monthProgressRatio.set(getPeriodProgress(start, end));
    this.saveCustomPeriod(start, end);
    this.refresh();
  }

  dismissCustomPeriodPrompt(): void {
    this.nonAlignedPeriodRequired.set(false);
  }

  // Expose readonly signals for component consumers.
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
  getPeriodMode = this.periodMode;
  getNonAlignedPeriodRequired = this.nonAlignedPeriodRequired;
  getSavedCustomPeriod = (): { start: string; end: string } | null =>
    this.loadCustomPeriod();

  private buildBudgetProgressFromSummaries(
    summaries: BudgetSummaryItem[]
  ): Observable<BudgetProgress[]> {
    const monthKey = this.startDate();
    const monthProgress = this.monthProgressRatio();
    const includeAll = this.preferences().includeAllTransactions;
    const filterBudgetableItems = (items: BudgetProgress[]): BudgetProgress[] =>
      items.filter(item => !item.excludeFromBudget);

    // Separate uncategorized summaries from regular category summaries.
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

    // Use one API call for all uncategorized transactions.
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
            // Ignore zero amounts.
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

  private loadCustomPeriod(): { start: string; end: string } | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(CUSTOM_PERIOD_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as { start?: string; end?: string };
      if (
        typeof parsed.start === 'string' &&
        typeof parsed.end === 'string' &&
        parsed.start &&
        parsed.end &&
        parsed.start <= parsed.end
      ) {
        return { start: parsed.start, end: parsed.end };
      }
      return null;
    } catch (error: unknown) {
      this.logger.error('Failed to load custom period', error);
      return null;
    }
  }

  private saveCustomPeriod(start: string, end: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(CUSTOM_PERIOD_KEY, JSON.stringify({ start, end }));
    } catch (error: unknown) {
      this.logger.error('Failed to save custom period', error);
    }
  }

  private restoreSavedCustomPeriod(): void {
    const saved = this.loadCustomPeriod();
    if (!saved) {
      return;
    }
    this.periodMode.set('non-aligned');
    this.startDate.set(saved.start);
    this.endDate.set(saved.end);
    this.monthProgressRatio.set(getPeriodProgress(saved.start, saved.end));
  }

  private canUseNavigator(): boolean {
    return (
      typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    );
  }

  private detectPeriodMode(
    result: BudgetSummaryResult
  ): Observable<BudgetProgress[]> | null {
    if (!result.aligned) {
      this.pendingSubMonthlyPeriod = null;

      // If a custom period is saved, apply it automatically.
      const savedPeriod = this.loadCustomPeriod();
      if (savedPeriod) {
        this.periodMode.set('non-aligned');
        this.detectedPeriods.set([]);
        this.activePeriodIndex.set(0);
        this.nonAlignedPeriodRequired.set(false);
        this.startDate.set(savedPeriod.start);
        this.endDate.set(savedPeriod.end);
        this.monthProgressRatio.set(
          getPeriodProgress(savedPeriod.start, savedPeriod.end)
        );
        return this.lunchMoneyService
          .getBudgetSummary(savedPeriod.start, savedPeriod.end)
          .pipe(
            switchMap((narrowResult: BudgetSummaryResult) =>
              this.buildBudgetProgressFromSummaries(narrowResult.items)
            )
          );
      }

      this.periodMode.set('non-aligned');
      this.detectedPeriods.set([]);
      this.activePeriodIndex.set(0);
      this.nonAlignedPeriodRequired.set(true);
      return null;
    }

    if (result.periods.length > 1) {
      this.periodMode.set('sub-monthly');
      this.nonAlignedPeriodRequired.set(false);
      this.detectedPeriods.set(result.periods);
      const currentIndex = this.resolveActivePeriodIndex(result.periods);
      this.activePeriodIndex.set(currentIndex);

      const period = result.periods[currentIndex];
      this.startDate.set(period.startDate);
      this.endDate.set(period.endDate);
      this.monthProgressRatio.set(
        getPeriodProgress(period.startDate, period.endDate)
      );

      // Re-fetch with narrowed dates for accurate totals.
      return this.lunchMoneyService
        .getBudgetSummary(period.startDate, period.endDate)
        .pipe(
          switchMap((narrowResult: BudgetSummaryResult) =>
            this.buildBudgetProgressFromSummaries(narrowResult.items)
          )
        );
    }

    this.pendingSubMonthlyPeriod = null;

    return null;
  }

  private resolveActivePeriodIndex(periods: BudgetPeriod[]): number {
    const pendingPeriod = this.pendingSubMonthlyPeriod;
    this.pendingSubMonthlyPeriod = null;

    if (pendingPeriod) {
      const pendingIndex = this.findMatchingPeriodIndex(periods, pendingPeriod);
      if (pendingIndex >= 0) {
        return pendingIndex;
      }
    }

    return this.findCurrentPeriodIndex(periods);
  }

  private findMatchingPeriodIndex(
    periods: BudgetPeriod[],
    period: BudgetPeriod
  ): number {
    return periods.findIndex(
      candidate =>
        candidate.startDate === period.startDate &&
        candidate.endDate === period.endDate
    );
  }

  private findCurrentPeriodIndex(periods: BudgetPeriod[]): number {
    const today = toIsoDate(new Date());
    const index = periods.findIndex(
      p => today >= p.startDate && today <= p.endDate
    );
    return Math.max(index, 0);
  }

  private shiftSubMonthlyPeriod(direction: -1 | 1): void {
    const periods = this.detectedPeriods();
    const currentIdx = this.activePeriodIndex();
    const nextIdx = currentIdx + direction;

    if (nextIdx >= 0 && nextIdx < periods.length) {
      // Navigate within detected periods.
      this.activePeriodIndex.set(nextIdx);
      const period = periods[nextIdx];
      this.startDate.set(period.startDate);
      this.endDate.set(period.endDate);
      this.monthProgressRatio.set(
        getPeriodProgress(period.startDate, period.endDate)
      );
      this.refresh();
    } else {
      // Cross month boundary: discover periods for the adjacent month.
      this.discoverAdjacentMonthPeriods(direction);
    }
  }

  private discoverAdjacentMonthPeriods(direction: -1 | 1): void {
    const currentPeriods = this.detectedPeriods();
    if (currentPeriods.length === 0) {
      return;
    }

    const anchor =
      direction === -1
        ? currentPeriods[0]
        : currentPeriods[currentPeriods.length - 1];

    // Shift to adjacent period using period length.
    const shifted = shiftPeriod(anchor.startDate, anchor.endDate, direction);
    if (!shifted) {
      return;
    }

    // Set dates to the shifted period and reset to monthly mode
    // so the next load will re-detect periods.
    this.periodMode.set('monthly');
    this.detectedPeriods.set([]);
    this.activePeriodIndex.set(0);
    this.nonAlignedPeriodRequired.set(false);
    this.pendingSubMonthlyPeriod = {
      startDate: shifted.start,
      endDate: shifted.end,
    };

    // Make a full-month discovery request.
    const shiftedDate = new Date(
      Number.parseInt(shifted.start.slice(0, 4), 10),
      Number.parseInt(shifted.start.slice(5, 7), 10) - 1,
      1
    );
    const monthRange = getCurrentMonthRange(shiftedDate);
    const monthStart = toIsoDate(monthRange.start);
    const monthEnd = toIsoDate(monthRange.end);

    this.startDate.set(monthStart);
    this.endDate.set(monthEnd);
    this.monthProgressRatio.set(this.resolveMonthProgress(monthRange.start));
    this.refresh();
  }

  private shiftCustomPeriod(direction: -1 | 1): void {
    const shifted = shiftPeriod(this.startDate(), this.endDate(), direction);
    if (!shifted) {
      return;
    }

    const todayKey = toIsoDate(new Date());

    // Prevent navigating into future periods when moving forward.
    if (direction === 1 && shifted.start > todayKey) {
      return;
    }

    this.startDate.set(shifted.start);
    this.endDate.set(shifted.end);
    this.monthProgressRatio.set(getPeriodProgress(shifted.start, shifted.end));
    this.saveCustomPeriod(shifted.start, shifted.end);
    this.refresh();
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
