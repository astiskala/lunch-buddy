import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
  output,
  inject,
  LOCALE_ID,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import {
  formatCurrency,
  FormatCurrencyOptions,
} from '../../shared/utils/currency.util';
import { toPercent } from '../../shared/utils/number.util';

/**
 * Represents a budget section (Expenses or Income) with all calculated metrics.
 */
export interface BudgetSection {
  readonly title: string;
  readonly spentLabel: string;
  readonly spentPercent: number;
  readonly projectedPercent: number;
  readonly remaining: number;
  readonly spentFormatted: string;
  readonly upcomingFormatted: string;
  readonly remainingFormatted: string;
}

/**
 * Calculates budget summary metrics from spent, budget, and upcoming values.
 */
interface BudgetMetrics {
  readonly spentPercent: number;
  readonly projectedPercent: number;
  readonly remaining: number;
}

const calculateBudgetMetrics = (
  spent: number,
  budget: number,
  upcoming: number,
  invertRemaining = false
): BudgetMetrics => {
  const projected = spent + upcoming;
  const spentPercent = budget > 0 ? toPercent(spent / budget) : 0;
  const projectedPercent = budget > 0 ? toPercent(projected / budget) : 0;
  let remaining = budget - projected;
  if (invertRemaining) {
    remaining = -remaining;
  }
  return { spentPercent, projectedPercent, remaining };
};

@Component({
  selector: 'summary-hero',
  imports: [MatIconModule, MatButtonModule, ProgressBarComponent],
  templateUrl: './summary-hero.component.html',
  styleUrls: ['./summary-hero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryHeroComponent {
  private readonly locale = inject(LOCALE_ID);

  readonly monthStart = input.required<string>();
  readonly canGoToNextMonth = input(false);
  readonly monthProgressRatio = input.required<number>();
  readonly totalExpenseSpent = input.required<number>();
  readonly totalExpenseBudget = input.required<number>();
  readonly totalExpenseUpcoming = input<number>(0);
  readonly totalIncomeSpent = input<number>(0);
  readonly totalIncomeBudget = input<number>(0);
  readonly totalIncomeUpcoming = input<number>(0);
  readonly currency = input<string | null>(null);

  readonly previousMonth = output();
  readonly nextMonth = output();
  readonly customize = output();
  readonly logout = output();

  readonly monthProgressPercent = computed(() =>
    toPercent(this.monthProgressRatio())
  );

  // Expense metrics (for backwards compatibility with tests)
  private readonly expenseMetrics = computed(() =>
    calculateBudgetMetrics(
      this.totalExpenseSpent(),
      this.totalExpenseBudget(),
      this.totalExpenseUpcoming()
    )
  );

  readonly expenseSpentPercent = computed(
    () => this.expenseMetrics().spentPercent
  );
  readonly expenseProjectedPercent = computed(
    () => this.expenseMetrics().projectedPercent
  );
  readonly expenseRemaining = computed(() => this.expenseMetrics().remaining);

  // Income metrics (for backwards compatibility with tests)
  private readonly incomeMetrics = computed(() =>
    calculateBudgetMetrics(
      this.totalIncomeSpent(),
      this.totalIncomeBudget(),
      this.totalIncomeUpcoming(),
      true
    )
  );

  readonly incomeSpentPercent = computed(
    () => this.incomeMetrics().spentPercent
  );
  readonly incomeProjectedPercent = computed(
    () => this.incomeMetrics().projectedPercent
  );
  readonly incomeRemaining = computed(() => this.incomeMetrics().remaining);

  /**
   * Budget sections for expense and income, ready for template iteration.
   */
  readonly budgetSections = computed((): BudgetSection[] => [
    {
      title: 'Expenses',
      spentLabel: 'Spent',
      spentPercent: this.expenseSpentPercent(),
      projectedPercent: this.expenseProjectedPercent(),
      remaining: this.expenseRemaining(),
      spentFormatted: this.formatValue(this.totalExpenseSpent()),
      upcomingFormatted: this.formatValue(this.totalExpenseUpcoming()),
      remainingFormatted: this.formatValue(this.expenseRemaining()),
    },
    {
      title: 'Income',
      spentLabel: 'Received',
      spentPercent: this.incomeSpentPercent(),
      projectedPercent: this.incomeProjectedPercent(),
      remaining: this.incomeRemaining(),
      spentFormatted: this.formatValue(this.totalIncomeSpent()),
      upcomingFormatted: this.formatValue(this.totalIncomeUpcoming()),
      remainingFormatted: this.formatValue(this.incomeRemaining()),
    },
  ]);

  readonly monthName = computed(() => {
    const date = new Date(this.monthStart());
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return formatDate(date, 'MMMM y', this.locale);
  });

  private formatValue(
    value: number,
    options: FormatCurrencyOptions = {}
  ): string {
    return formatCurrency(value, this.currency(), {
      fallbackCurrency: 'USD',
      locale: this.locale,
      ...options,
    });
  }
}
