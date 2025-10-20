import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
  output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { formatCurrency } from '../../shared/utils/currency.util';

@Component({
  selector: 'summary-hero',
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './summary-hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SummaryHeroComponent {
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
    Math.round(this.monthProgressRatio() * 100)
  );

  readonly expenseSpentPercent = computed(() => {
    const budget = this.totalExpenseBudget();
    const spent = this.totalExpenseSpent();
    return budget > 0 ? Math.round((spent / budget) * 100) : 0;
  });

  readonly expenseProjectedPercent = computed(() => {
    const budget = this.totalExpenseBudget();
    const projected = this.totalExpenseSpent() + this.totalExpenseUpcoming();
    return budget > 0 ? Math.round((projected / budget) * 100) : 0;
  });

  readonly incomeSpentPercent = computed(() => {
    const budget = this.totalIncomeBudget();
    const spent = this.totalIncomeSpent();
    return budget > 0 ? Math.round((spent / budget) * 100) : 0;
  });

  readonly incomeProjectedPercent = computed(() => {
    const budget = this.totalIncomeBudget();
    const projected = this.totalIncomeSpent() + this.totalIncomeUpcoming();
    return budget > 0 ? Math.round((projected / budget) * 100) : 0;
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
    formatCurrency(this.totalExpenseSpent(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  readonly expenseUpcomingFormatted = computed(() =>
    formatCurrency(this.totalExpenseUpcoming(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  readonly expenseRemainingFormatted = computed(() =>
    formatCurrency(this.expenseRemaining(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  readonly incomeSpentFormatted = computed(() =>
    formatCurrency(this.totalIncomeSpent(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  readonly incomeUpcomingFormatted = computed(() =>
    formatCurrency(this.totalIncomeUpcoming(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  readonly incomeRemainingFormatted = computed(() =>
    formatCurrency(this.incomeRemaining(), this.currency(), {
      fallbackCurrency: 'USD',
    })
  );

  readonly monthName = computed(() => {
    const date = new Date(this.monthStart());
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });
}
