import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  DestroyRef,
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Router } from '@angular/router';
import { BudgetService, CategoryPreferences } from '../../shared/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { CategoryProgressListComponent } from './category-progress-list.component';
import { SummaryHeroComponent } from './summary-hero.component';
import { RecurringExpensesPanelComponent } from './recurring-expenses-panel.component';
import { CategoryPreferencesDialogComponent } from './category-preferences-dialog.component';
import { formatCurrency } from '../../shared/utils/currency.util';
import { isRecurringInstancePending } from '../../shared/utils/recurring.util';

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
  private budgetService = inject(BudgetService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private readonly locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  // Local state
  protected readonly activeTab = signal<TabType>('expenses');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly showHidden = signal(false);
  protected readonly showPreferencesDialog = signal(false);
  protected readonly isOffline = signal<boolean>(!isNavigatorOnline());

  // Signals from service
  protected readonly isLoading = this.budgetService.getIsLoading;
  protected readonly expenses = this.budgetService.getExpenses;
  protected readonly hiddenExpenses = this.budgetService.getHiddenExpenses;
  protected readonly incomes = this.budgetService.getIncomes;
  protected readonly hiddenIncomes = this.budgetService.getHiddenIncomes;
  protected readonly currency = this.budgetService.getCurrency;
  protected readonly startDate = this.budgetService.getStartDate;
  protected readonly endDate = this.budgetService.getEndDate;
  protected readonly monthProgressRatio = this.budgetService.getMonthProgressRatio;
  protected readonly recurringByCategory = this.budgetService.getRecurringByCategory;
  protected readonly errors = this.budgetService.getErrors;
  protected readonly preferences = this.budgetService.getPreferences;
  protected readonly lastRefresh = this.budgetService.getLastRefresh;
  protected readonly referenceDate = this.budgetService.getReferenceDate;

  // Computed values
  protected readonly activeItems = computed(() =>
    this.activeTab() === 'expenses' ? this.expenses() : this.incomes(),
  );

  protected readonly hiddenItems = computed(() =>
    this.activeTab() === 'expenses' ? this.hiddenExpenses() : this.hiddenIncomes(),
  );

  private filterItemsByStatus = (items: BudgetProgress[], statusFilter: StatusFilter): BudgetProgress[] => {
    if (statusFilter === 'all') return items;
    return items.filter((item) => item.status === statusFilter);
  };

  protected readonly filteredVisibleItems = computed(() =>
    this.filterItemsByStatus(this.activeItems(), this.statusFilter()),
  );

  protected readonly filteredHiddenItems = computed(() =>
    this.filterItemsByStatus(this.hiddenItems(), this.statusFilter()),
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
    const allExpenses = [...this.expenses(), ...this.hiddenExpenses()];
    const expenseMap = new Map(allExpenses.map(exp => [exp.categoryId, exp]));
    
    let total = 0;
    for (const [categoryId, instances] of recurring.assigned.entries()) {
      const pendingInstances = instances.filter((instance) =>
        isRecurringInstancePending(instance, { referenceDate }),
      );
      if (pendingInstances.length === 0) {
        continue;
      }
      const category = expenseMap.get(categoryId);
      if (category && !category.isIncome) {
        for (const inst of pendingInstances) {
          total += Math.abs(parseFloat(inst.expense.amount));
        }
      }
    }
    return total;
  });

  protected readonly totalIncomeUpcoming = computed(() => {
    const recurring = this.recurringByCategory();
    const referenceDate = this.referenceDate();
    const allIncomes = [...this.incomes(), ...this.hiddenIncomes()];
    const incomeMap = new Map(allIncomes.map(inc => [inc.categoryId, inc]));
    
    let total = 0;
    for (const [categoryId, instances] of recurring.assigned.entries()) {
      const pendingInstances = instances.filter((instance) =>
        isRecurringInstancePending(instance, { referenceDate }),
      );
      if (pendingInstances.length === 0) {
        continue;
      }
      const category = incomeMap.get(categoryId);
      if (category && category.isIncome) {
        for (const inst of pendingInstances) {
          total += Math.abs(parseFloat(inst.expense.amount));
        }
      }
    }
    return total;
  });

  protected readonly statusCounts = computed(() => {
    const items = this.activeItems();
    return {
      over: items.filter((item) => item.status === 'over').length,
      atRisk: items.filter((item) => item.status === 'at-risk').length,
      onTrack: items.filter((item) => item.status === 'on-track').length,
    };
  });

  protected readonly hiddenTotal = computed(() =>
    this.filteredHiddenItems().reduce((sum, item) => sum + item.spent, 0),
  );

  protected readonly hiddenLabel = computed(() =>
    this.activeTab() === 'expenses' ? 'categories' : 'income categories',
  );

  protected readonly hiddenTotalFormatted = computed(() =>
    formatCurrency(this.hiddenTotal(), this.currency(), { fallbackCurrency: 'USD' }),
  );

  protected readonly visibleEmptyMessage = computed(() => {
    const tab = this.activeTab();
    const filterDesc = this.getFilterDescription();

    if (tab === 'expenses') {
      return filterDesc
        ? `No expense categories are currently ${filterDesc}.`
        : 'No expense categories available. Configure your budgets in your account.';
    } else {
      return filterDesc
        ? `No income categories are currently ${filterDesc}.`
        : 'No income categories available this month.';
    }
  });

  protected readonly hiddenEmptyMessage = computed(() => {
    const filterDesc = this.getFilterDescription();
    return filterDesc
      ? `No hidden ${this.hiddenLabel()} are currently ${filterDesc}.`
      : `No hidden ${this.hiddenLabel()}.`;
  });

  protected readonly hasLoadedOnce = computed(
    () => this.lastRefresh() !== null || this.expenses().length > 0 || this.incomes().length > 0,
  );

  protected readonly showInitialLoading = computed(() => this.isLoading() && !this.hasLoadedOnce());
  protected readonly isRefreshing = computed(() => this.isLoading() && this.hasLoadedOnce());

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

  constructor() {
    if (typeof window !== 'undefined') {
      const handleOnline = () => this.isOffline.set(false);
      const handleOffline = () => this.isOffline.set(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      });
    }
  }

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

  handleTabChange(tab: TabType | string): void {
    if (tab !== 'expenses' && tab !== 'income') {
      return;
    }

    this.activeTab.set(tab);
    this.showHidden.set(false);
    this.statusFilter.set('all');
  }

  handleStatusFilterChange(status: 'over' | 'at-risk' | 'on-track'): void {
    this.statusFilter.update((current) => (current === status ? 'all' : status));
    this.showHidden.set(false);
  }

  toggleHidden(): void {
    this.showHidden.update((v) => !v);
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
      await this.authService.clearApiKey();
    } finally {
      await this.router.navigate(['/login']);
    }
  }
}

function isNavigatorOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
