import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';
import {
  BudgetService,
  CategoryPreferences,
} from '../../shared/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryProgressListComponent } from './category-progress-list.component';
import { SummaryHeroComponent } from './summary-hero.component';
import { RecurringExpensesPanelComponent } from './recurring-expenses-panel.component';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import {
  formatCurrency,
  resolveAmount,
} from '../../shared/utils/currency.util';
import { filterPendingInstances } from '../../shared/utils/recurring.util';

type StatusFilter = 'all' | 'over' | 'at-risk' | 'on-track';
type TabType = 'expenses' | 'income';

@Component({
  selector: 'dashboard-page',
  imports: [
    CommonModule,
    NgOptimizedImage,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    CategoryProgressListComponent,
    SummaryHeroComponent,
    RecurringExpensesPanelComponent,
    CategoryPreferencesDialogComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly budgetService = inject(BudgetService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly locale =
    typeof navigator === 'undefined' ? 'en-US' : navigator.language;

  // Local state
  protected readonly activeTab = signal<TabType>('expenses');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly showHidden = signal(false);
  protected readonly showPreferencesDialog = signal(false);

  // Signals from service
  protected readonly isLoading = this.budgetService.getIsLoading;
  protected readonly expenses = this.budgetService.getExpenses;
  protected readonly hiddenExpenses = this.budgetService.getHiddenExpenses;
  protected readonly incomes = this.budgetService.getIncomes;
  protected readonly hiddenIncomes = this.budgetService.getHiddenIncomes;
  protected readonly currency = this.budgetService.getCurrency;
  protected readonly startDate = this.budgetService.getStartDate;
  protected readonly endDate = this.budgetService.getEndDate;
  protected readonly monthProgressRatio =
    this.budgetService.getMonthProgressRatio;
  protected readonly recurringByCategory =
    this.budgetService.getRecurringByCategory;
  protected readonly errors = this.budgetService.getErrors;
  protected readonly preferences = this.budgetService.getPreferences;
  protected readonly lastRefresh = this.budgetService.getLastRefresh;
  protected readonly referenceDate = this.budgetService.getReferenceDate;

  // Computed values
  protected readonly activeItems = computed(() =>
    this.activeTab() === 'expenses' ? this.expenses() : this.incomes()
  );

  protected readonly hiddenItems = computed(() =>
    this.activeTab() === 'expenses'
      ? this.hiddenExpenses()
      : this.hiddenIncomes()
  );

  readonly filterItemsByStatus = (
    items: BudgetProgress[],
    statusFilter: StatusFilter
  ): BudgetProgress[] => {
    if (statusFilter === 'all') return items;
    return items.filter(item => item.status === statusFilter);
  };

  protected readonly filteredVisibleItems = computed(() =>
    this.filterItemsByStatus(this.activeItems(), this.statusFilter())
  );

  protected readonly filteredHiddenItems = computed(() =>
    this.filterItemsByStatus(this.hiddenItems(), this.statusFilter())
  );

  protected readonly totalExpenseSpent = computed(() => {
    let total = 0;
    for (const item of this.expenses()) {
      total += item.spent;
    }
    for (const item of this.hiddenExpenses()) {
      total += item.spent;
    }
    return total;
  });

  protected readonly totalExpenseBudget = computed(() => {
    let total = 0;
    for (const item of this.expenses()) {
      total += item.budgetAmount;
    }
    for (const item of this.hiddenExpenses()) {
      total += item.budgetAmount;
    }
    return total;
  });

  protected readonly totalIncomeSpent = computed(() => {
    let total = 0;
    for (const item of this.incomes()) {
      total += Math.abs(item.spent);
    }
    for (const item of this.hiddenIncomes()) {
      total += Math.abs(item.spent);
    }
    return total;
  });

  protected readonly totalIncomeBudget = computed(() => {
    let total = 0;
    for (const item of this.incomes()) {
      total += Math.abs(item.budgetAmount);
    }
    for (const item of this.hiddenIncomes()) {
      total += Math.abs(item.budgetAmount);
    }
    return total;
  });

  protected readonly totalExpenseUpcoming = computed(() => {
    const recurring = this.recurringByCategory();
    const referenceDate = this.referenceDate();
    const windowRange = this.getWindowRange();
    const allExpenses = [...this.expenses(), ...this.hiddenExpenses()];
    const expenseMap = new Map(allExpenses.map(exp => [exp.categoryId, exp]));

    let total = 0;
    for (const [categoryId, instances] of recurring.assigned.entries()) {
      const pendingInstances = filterPendingInstances(instances, {
        referenceDate,
        windowRange: windowRange ?? undefined,
      });
      if (pendingInstances.length === 0) {
        continue;
      }
      const category = expenseMap.get(categoryId);
      if (category && !category.isIncome) {
        for (const inst of pendingInstances) {
          total += Math.abs(
            resolveAmount(inst.expense.amount, inst.expense.to_base ?? null)
          );
        }
      }
    }
    return total;
  });

  protected readonly totalIncomeUpcoming = computed(() => {
    const recurring = this.recurringByCategory();
    const referenceDate = this.referenceDate();
    const windowRange = this.getWindowRange();
    const allIncomes = [...this.incomes(), ...this.hiddenIncomes()];
    const incomeMap = new Map(allIncomes.map(inc => [inc.categoryId, inc]));

    let total = 0;
    for (const [categoryId, instances] of recurring.assigned.entries()) {
      const pendingInstances = filterPendingInstances(instances, {
        referenceDate,
        windowRange: windowRange ?? undefined,
      });
      if (pendingInstances.length === 0) {
        continue;
      }
      const category = incomeMap.get(categoryId);
      if (category?.isIncome) {
        for (const inst of pendingInstances) {
          total += Math.abs(
            resolveAmount(inst.expense.amount, inst.expense.to_base ?? null)
          );
        }
      }
    }
    return total;
  });

  protected readonly statusCounts = computed(() => {
    const items = this.activeItems();
    return {
      over: items.filter(item => item.status === 'over').length,
      atRisk: items.filter(item => item.status === 'at-risk').length,
      onTrack: items.filter(item => item.status === 'on-track').length,
    };
  });

  protected readonly hiddenTotal = computed(() =>
    this.filteredHiddenItems().reduce((sum, item) => sum + item.spent, 0)
  );

  protected readonly hiddenLabel = computed(() =>
    this.activeTab() === 'expenses' ? 'categories' : 'income categories'
  );

  protected readonly hiddenTotalFormatted = computed(() =>
    formatCurrency(this.hiddenTotal(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  protected readonly visibleEmptyMessage = computed(() => {
    const tab = this.activeTab();
    const filterDesc = this.getFilterDescription();
    const hasLoaded = this.hasLoadedOnce();

    if (tab === 'expenses') {
      if (filterDesc) {
        return `No expense categories are currently ${filterDesc}.`;
      }
      return hasLoaded
        ? 'No expense categories available. Configure your budgets in your account.'
        : '';
    }

    if (filterDesc) {
      return `No income categories are currently ${filterDesc}.`;
    }
    return hasLoaded ? 'No income categories available this month.' : '';
  });

  protected readonly hiddenEmptyMessage = computed(() => {
    const filterDesc = this.getFilterDescription();
    return filterDesc
      ? `No hidden ${this.hiddenLabel()} are currently ${filterDesc}.`
      : `No hidden ${this.hiddenLabel()}.`;
  });

  protected readonly hasLoadedOnce = computed(() => {
    const lastRefresh = this.lastRefresh();
    const expensesLength = this.expenses().length;
    const incomesLength = this.incomes().length;
    const isLoading = this.isLoading();
    // Consider it loaded if: we're not currently loading AND (we have a refresh timestamp OR we have data)
    // This handles both: cached data with timestamp, and successful load with empty results
    return (
      !isLoading &&
      (lastRefresh !== null || expensesLength > 0 || incomesLength > 0)
    );
  });

  protected readonly showInitialLoading = computed(
    () => this.isLoading() && !this.hasLoadedOnce()
  );

  protected readonly isRefreshing = computed(
    () => this.isLoading() && this.hasLoadedOnce()
  );

  protected readonly lastRefreshText = computed(() => {
    const timestamp = this.lastRefresh();
    if (!timestamp) {
      return 'Waiting for first sync';
    }

    const formatter = new Intl.DateTimeFormat(this.locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return `Last updated ${formatter.format(timestamp)}`;
  });

  private getFilterDescription(): string | null {
    switch (this.statusFilter()) {
      case 'over':
        return 'over budget';
      case 'at-risk':
        return 'at risk';
      case 'on-track':
        return 'on track';
      default:
        return null;
    }
  }

  handleTabChange(tab: TabType): void {
    this.activeTab.set(tab);
    this.showHidden.set(false);
    this.statusFilter.set('all');
  }

  handleStatusFilterChange(status: 'over' | 'at-risk' | 'on-track'): void {
    this.statusFilter.update(current => (current === status ? 'all' : status));
    this.showHidden.set(false);
  }

  toggleHidden(): void {
    this.showHidden.update(v => !v);
  }

  openPreferencesDialog(): void {
    this.showPreferencesDialog.set(true);
  }

  closePreferencesDialog(): void {
    this.showPreferencesDialog.set(false);
  }

  handlePreferencesChange(preferences: CategoryPreferences): void {
    this.budgetService.updatePreferences(() => preferences);
  }

  refresh(): void {
    this.budgetService.refresh();
  }

  async logout(): Promise<void> {
    try {
      this.authService.clearApiKey();
    } finally {
      await this.router.navigate(['/login']);
    }
  }

  private getWindowRange(): { start: Date; end: Date } | null {
    const start = new Date(this.startDate());
    const end = new Date(this.endDate());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
}
