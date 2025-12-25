import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
  output,
  inject,
  LOCALE_ID,
} from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import {
  formatCurrency,
  FormatCurrencyOptions,
} from '../../shared/utils/currency.util';
import { toPercent } from '../../shared/utils/number.util';

@Component({
  selector: 'summary-hero',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './summary-hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryHeroComponent {
  private readonly locale = inject(LOCALE_ID);

  readonly monthStart = input.required<string>();
  readonly monthProgressRatio = input.required<number>();
  readonly totalExpenseSpent = input.required<number>();
  readonly totalExpenseBudget = input.required<number>();
  readonly totalExpenseUpcoming = input<number>(0);
  readonly totalIncomeSpent = input<number>(0);
  readonly totalIncomeBudget = input<number>(0);
  readonly totalIncomeUpcoming = input<number>(0);
  readonly currency = input<string | null>(null);

  readonly customize = output();
  readonly logout = output();

  readonly monthProgressPercent = computed(() =>
    toPercent(this.monthProgressRatio())
  );

  readonly expenseSpentPercent = computed(() => {
    const budget = this.totalExpenseBudget();
    const spent = this.totalExpenseSpent();
    return budget > 0 ? toPercent(spent / budget) : 0;
  });

  readonly expenseProjectedPercent = computed(() => {
    const budget = this.totalExpenseBudget();
    const projected = this.totalExpenseSpent() + this.totalExpenseUpcoming();
    return budget > 0 ? toPercent(projected / budget) : 0;
  });

  readonly incomeSpentPercent = computed(() => {
    const budget = this.totalIncomeBudget();
    const spent = this.totalIncomeSpent();
    return budget > 0 ? toPercent(spent / budget) : 0;
  });

  readonly incomeProjectedPercent = computed(() => {
    const budget = this.totalIncomeBudget();
    const projected = this.totalIncomeSpent() + this.totalIncomeUpcoming();
    return budget > 0 ? toPercent(projected / budget) : 0;
  });

  readonly expenseRemaining = computed(
    () =>
      this.totalExpenseBudget() -
      (this.totalExpenseSpent() + this.totalExpenseUpcoming())
  );

  readonly incomeRemaining = computed(() => {
    const remaining =
      this.totalIncomeBudget() -
      (this.totalIncomeSpent() + this.totalIncomeUpcoming());
    // Invert sign for income categories
    return -remaining;
  });

  readonly expenseSpentFormatted = computed(() =>
    this.formatValue(this.totalExpenseSpent())
  );

  readonly expenseUpcomingFormatted = computed(() =>
    this.formatValue(this.totalExpenseUpcoming())
  );

  readonly expenseRemainingFormatted = computed(() =>
    this.formatValue(this.expenseRemaining())
  );

  readonly incomeSpentFormatted = computed(() =>
    this.formatValue(this.totalIncomeSpent())
  );

  readonly incomeUpcomingFormatted = computed(() =>
    this.formatValue(this.totalIncomeUpcoming())
  );

  readonly incomeRemainingFormatted = computed(() =>
    this.formatValue(this.incomeRemaining())
  );

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
