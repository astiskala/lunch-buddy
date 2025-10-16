import { Injectable, inject, signal, computed } from '@angular/core';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import {
  BudgetProgress,
  BudgetSummaryItem,
  RecurringExpense,
  RecurringInstance,
} from '../../core/models/lunchmoney.types';
import { buildBudgetProgress, rankBudgetProgress } from '../utils/budget.util';
import {
  deriveReferenceDate,
  getCurrentMonthRange,
  getMonthProgress,
  toIsoDate,
} from '../utils/date.util';
import { getRecurringDate } from '../utils/recurring.util';
import { BackgroundSyncService } from '../../core/services/background-sync.service';
import { LoggerService } from '../../core/services/logger.service';

export interface CategoryPreferences {
  customOrder: number[];
  hiddenCategoryIds: number[];
  warnAtRatio: number;
  notificationsEnabled: boolean;
}

const defaultCategoryPreferences: CategoryPreferences = {
  customOrder: [],
  hiddenCategoryIds: [],
  warnAtRatio: 0.85,
  notificationsEnabled: false,
};

const PREFERENCES_KEY = 'lunchbuddy.categoryPreferences';
const LAST_REFRESH_KEY = 'lunchbuddy.lastRefresh';
const BUDGET_CACHE_PREFIX = 'lunchbuddy.cache.budget';
const RECURRING_CACHE_PREFIX = 'lunchbuddy.cache.recurring';

interface BudgetCacheEntry {
  monthKey: string;
  timestamp: string;
  summaries: BudgetSummaryItem[];
}

interface RecurringCacheEntry {
  monthStart: string;
  timestamp: string;
  expenses: RecurringExpense[];
}

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private lunchMoneyService = inject(LunchMoneyService);
  private backgroundSyncService = inject(BackgroundSyncService);
  private logger = inject(LoggerService);

  // Month information
  private monthRange = getCurrentMonthRange();
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
  protected readonly preferences = signal<CategoryPreferences>(this.loadPreferences());

  // Computed values
  protected readonly expenses = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter((item) => !item.isIncome && !hiddenIds.has(item.categoryId));
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly hiddenExpenses = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter((item) => !item.isIncome && hiddenIds.has(item.categoryId));
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly incomes = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter((item) => item.isIncome && !hiddenIds.has(item.categoryId));
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly hiddenIncomes = computed(() => {
    const data = this.budgetData();
    const prefs = this.preferences();
    const hiddenIds = new Set(prefs.hiddenCategoryIds);
    const items = data.filter((item) => item.isIncome && hiddenIds.has(item.categoryId));
    return rankBudgetProgress(items, prefs.customOrder);
  });

  protected readonly currency = computed(() => {
    const data = this.budgetData();
    const firstExpense = data.find((item) => !item.isIncome && item.budgetCurrency);
    if (firstExpense?.budgetCurrency) {
      return firstExpense.budgetCurrency;
    }
    const firstIncome = data.find((item) => item.isIncome && item.budgetCurrency);
    return firstIncome?.budgetCurrency ?? null;
  });

  protected readonly referenceDate = computed(() =>
    deriveReferenceDate(this.startDate(), this.endDate()),
  );

  // Recurring expenses by category
  protected readonly recurringByCategory = computed(() => {
    const assigned = new Map<number, RecurringInstance[]>();
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
      list.sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
    }
    unassigned.sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());

    return { assigned, unassigned };
  });

  constructor() {
    this.restoreCachedBudgetData();
    this.restoreCachedRecurringExpenses();
    this.loadBudgetData();
    this.loadRecurringExpenses();
    this.syncBackgroundPreferences();
  }

  private loadPreferences(): CategoryPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return { ...defaultCategoryPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      this.logger.error('Failed to load preferences', error);
    }
    return defaultCategoryPreferences;
  }

  private savePreferences(prefs: CategoryPreferences): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error) {
      this.logger.error('Failed to save preferences', error);
    }
  }

  updatePreferences(updater: (current: CategoryPreferences) => CategoryPreferences): void {
    const updated = updater(this.preferences());
    this.preferences.set(updated);
    this.savePreferences(updated);
    this.syncBackgroundPreferences();
  }

  loadBudgetData(): void {
    const hasCachedData = this.budgetData().length > 0;
    this.isLoading.set(!hasCachedData);
    this.errors.set([]);

    this.lunchMoneyService.getBudgetSummary(this.startDate(), this.endDate()).subscribe({
      next: (summaries: BudgetSummaryItem[]) => {
        this.persistBudgetCache(summaries);
        const progress = this.buildBudgetProgressFromSummaries(summaries);
        this.budgetData.set(progress);
        this.isLoading.set(false);
        this.syncBackgroundPreferences();

        if (this.canUseNavigator() ? navigator.onLine : true) {
          const timestamp = new Date();
          this.lastRefresh.set(timestamp);
          this.persistLastRefresh(timestamp);
        }
      },
      error: (error: Error) => {
        this.logger.error('Failed to refresh budget data', error);
        const hasExistingData = this.budgetData().length > 0;
        this.errors.set(hasExistingData ? [] : [error]);
        this.isLoading.set(false);
      },
    });
  }

  loadRecurringExpenses(): void {
    const hasCachedRecurring = this.recurringExpenses().length > 0;
    this.isRecurringLoading.set(!hasCachedRecurring);

    this.lunchMoneyService.getRecurringExpenses(this.startDate()).subscribe({
      next: (expenses: RecurringExpense[]) => {
        this.recurringExpenses.set(expenses);
        this.persistRecurringCache(expenses);
        this.isRecurringLoading.set(false);
      },
      error: (error: Error) => {
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
    summaries: BudgetSummaryItem[],
  ): BudgetProgress[] {
    const monthKey = this.monthKey;
    const monthProgress = this.monthProgressRatio();
    const warnAtRatio = this.preferences().warnAtRatio;

    return summaries
      .map((summary: BudgetSummaryItem) =>
        buildBudgetProgress(summary, monthKey, monthProgress, warnAtRatio),
      )
      .filter((item: BudgetProgress) => !item.excludeFromBudget && !item.isGroup);
  }

  private restoreCachedBudgetData(): void {
    const cacheKey = this.getBudgetCacheKey();
    const entry = this.readCache<BudgetCacheEntry>(cacheKey);
    if (!entry || entry.monthKey !== this.monthKey || !Array.isArray(entry.summaries)) {
      return;
    }

    const progress = this.buildBudgetProgressFromSummaries(entry.summaries);
    if (!progress.length) {
      return;
    }

    this.budgetData.set(progress);
    this.isLoading.set(false);
  }

  private restoreCachedRecurringExpenses(): void {
    const cacheKey = this.getRecurringCacheKey();
    const entry = this.readCache<RecurringCacheEntry>(cacheKey);
    if (!entry || entry.monthStart !== this.startDate() || !Array.isArray(entry.expenses)) {
      return;
    }

    if (!entry.expenses.length) {
      return;
    }

    this.recurringExpenses.set(entry.expenses);
    this.isRecurringLoading.set(false);
  }

  private persistBudgetCache(summaries: BudgetSummaryItem[]): void {
    const cacheKey = this.getBudgetCacheKey();
    const payload: BudgetCacheEntry = {
      monthKey: this.monthKey,
      timestamp: new Date().toISOString(),
      summaries,
    };
    this.writeCache(cacheKey, payload);
  }

  private persistRecurringCache(expenses: RecurringExpense[]): void {
    const cacheKey = this.getRecurringCacheKey();
    const payload: RecurringCacheEntry = {
      monthStart: this.startDate(),
      timestamp: new Date().toISOString(),
      expenses,
    };
    this.writeCache(cacheKey, payload);
  }

  private getBudgetCacheKey(): string {
    return `${BUDGET_CACHE_PREFIX}:${this.startDate()}:${this.endDate()}`;
  }

  private getRecurringCacheKey(): string {
    return `${RECURRING_CACHE_PREFIX}:${this.startDate()}`;
  }

  private readCache<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.error(`Failed to read cache for ${key}`, error as Error);
      return null;
    }
  }

  private writeCache<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      this.logger.error(`Failed to write cache for ${key}`, error as Error);
    }
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
      .catch((error) => this.logger.error('Failed to sync background preferences', error));
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
    } catch (error) {
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
    } catch (error) {
      this.logger.error('Failed to store last refresh timestamp', error);
    }
  }

  private canUseNavigator(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean';
  }
}
