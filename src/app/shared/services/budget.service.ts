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

@Injectable({
  providedIn: 'root',
})
export class BudgetService {
  private lunchMoneyService = inject(LunchMoneyService);

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
  protected readonly lastRefresh = signal<Date | null>(loadLastRefresh());
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
    this.loadBudgetData();
    this.loadRecurringExpenses();
  }

  private loadPreferences(): CategoryPreferences {
    try {
      const stored = localStorage.getItem(PREFERENCES_KEY);
      if (stored) {
        return { ...defaultCategoryPreferences, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load preferences', error);
    }
    return defaultCategoryPreferences;
  }

  private savePreferences(prefs: CategoryPreferences): void {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save preferences', error);
    }
  }

  updatePreferences(updater: (current: CategoryPreferences) => CategoryPreferences): void {
    const updated = updater(this.preferences());
    this.preferences.set(updated);
    this.savePreferences(updated);
  }

  loadBudgetData(): void {
    this.isLoading.set(true);
    this.errors.set([]);

    this.lunchMoneyService.getBudgetSummary(this.startDate(), this.endDate()).subscribe({
      next: (summaries: BudgetSummaryItem[]) => {
        const monthKey = this.monthKey;
        const monthProgress = this.monthProgressRatio();
        const warnAtRatio = this.preferences().warnAtRatio;

        const progress = summaries
          .map((summary: BudgetSummaryItem) =>
            buildBudgetProgress(summary, monthKey, monthProgress, warnAtRatio),
          )
          .filter((item: BudgetProgress) => !item.excludeFromBudget && !item.isGroup);

        this.budgetData.set(progress);
        this.isLoading.set(false);

        if (canUseNavigator() ? navigator.onLine : true) {
          const timestamp = new Date();
          this.lastRefresh.set(timestamp);
          persistLastRefresh(timestamp);
        }
      },
      error: (error: Error) => {
        this.errors.set([error]);
        this.isLoading.set(false);
      },
    });
  }

  loadRecurringExpenses(): void {
    this.isRecurringLoading.set(true);

    this.lunchMoneyService.getRecurringExpenses(this.startDate()).subscribe({
      next: (expenses: RecurringExpense[]) => {
        this.recurringExpenses.set(expenses);
        this.isRecurringLoading.set(false);
      },
      error: (error: Error) => {
        console.error('Failed to load recurring expenses', error);
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
}

const LAST_REFRESH_KEY = 'lunchbuddy.lastRefresh';

function loadLastRefresh(): Date | null {
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
    console.error('Failed to read last refresh timestamp', error);
    return null;
  }
}

function persistLastRefresh(timestamp: Date): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LAST_REFRESH_KEY, timestamp.toISOString());
  } catch (error) {
    console.error('Failed to store last refresh timestamp', error);
  }
}

function canUseNavigator(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean';
}
