import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
  inject,
  LOCALE_ID,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
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
import { CustomPeriodDialogComponent } from './custom-period-dialog.component';
import { formatCurrency } from '../../shared/utils/currency.util';

type StatusFilter = 'all' | 'over' | 'at-risk' | 'on-track';
type TabType = 'expenses' | 'income';

@Component({
  selector: 'dashboard-page',
  imports: [
    NgOptimizedImage,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    CategoryProgressListComponent,
    SummaryHeroComponent,
    RecurringExpensesPanelComponent,
    CategoryPreferencesDialogComponent,
    CustomPeriodDialogComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrls: ['./dashboard-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly budgetService = inject(BudgetService);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  // Local UI state.
  protected readonly activeTab = signal<TabType>('expenses');
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly showHidden = signal(false);
  protected readonly showPreferencesDialog = signal(false);
  protected readonly showCustomPeriodDialog = signal(false);

  // Signals provided by the budget service.
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
  protected readonly canNavigateToNextMonth =
    this.budgetService.getCanNavigateToNextMonth;
  protected readonly periodMode = this.budgetService.getPeriodMode;
  protected readonly nonAlignedPeriodRequired =
    this.budgetService.getNonAlignedPeriodRequired;
  protected readonly recurringByCategory =
    this.budgetService.getRecurringByCategory;
  protected readonly errors = this.budgetService.getErrors;
  protected readonly preferences = this.budgetService.getPreferences;
  protected readonly lastRefresh = this.budgetService.getLastRefresh;
  protected readonly referenceDate = this.budgetService.getReferenceDate;

  // Derived view values.
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

  protected readonly expenseTotals = this.budgetService.getExpenseTotals;
  protected readonly incomeTotals = this.budgetService.getIncomeTotals;

  protected readonly statusCounts = computed(() => {
    const items = this.activeItems();
    return {
      over: items.filter(item => item.status === 'over').length,
      atRisk: items.filter(item => item.status === 'at-risk').length,
      onTrack: items.filter(item => item.status === 'on-track').length,
    };
  });

  protected readonly hiddenTotal = computed(() => {
    const isIncome = this.activeTab() === 'income';
    return this.filteredHiddenItems().reduce(
      (sum, item) => sum + (isIncome ? Math.abs(item.spent) : item.spent),
      0
    );
  });

  protected readonly hiddenLabel = computed(() =>
    this.activeTab() === 'expenses' ? 'categories' : 'income categories'
  );

  protected readonly hiddenTotalFormatted = computed(() =>
    formatCurrency(this.hiddenTotal(), this.currency(), {
      fallbackCurrency: 'USD',
      locale: this.locale,
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
    // Consider the view loaded when fetching is complete and we have either:
    // a refresh timestamp or any loaded category data.
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

  protected readonly customPeriodDialogOpen = computed(
    () => this.nonAlignedPeriodRequired() || this.showCustomPeriodDialog()
  );
  protected readonly showCustomPeriodSetting = computed(
    () => this.periodMode() === 'non-aligned'
  );

  private getFilterDescription(): string | null {
    switch (this.statusFilter()) {
      case 'over': {
        return 'over budget';
      }
      case 'at-risk': {
        return 'at risk';
      }
      case 'on-track': {
        return 'on track';
      }
      default: {
        return null;
      }
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

  openCustomPeriodDialogFromSettings(): void {
    this.showPreferencesDialog.set(false);
    this.showCustomPeriodDialog.set(true);
  }

  handlePreferencesChange(preferences: CategoryPreferences): void {
    this.budgetService.updatePreferences(() => preferences);
  }

  refresh(): void {
    this.budgetService.refresh();
  }

  goToPreviousMonth(): void {
    this.showHidden.set(false);
    this.budgetService.goToPreviousPeriod();
  }

  goToNextMonth(): void {
    this.showHidden.set(false);
    this.budgetService.goToNextPeriod();
  }

  handleCustomPeriodSelected(period: { start: string; end: string }): void {
    this.showCustomPeriodDialog.set(false);
    this.budgetService.setCustomPeriod(period.start, period.end);
  }

  dismissCustomPeriodDialog(): void {
    this.showCustomPeriodDialog.set(false);
    this.budgetService.dismissCustomPeriodPrompt();
  }

  async logout(): Promise<void> {
    try {
      await this.authService.clearApiKey();
    } finally {
      await this.router.navigate(['/login']);
    }
  }
}
