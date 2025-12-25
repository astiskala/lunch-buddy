import {
  ChangeDetectionStrategy,
  Component,
  input,
  computed,
  inject,
  LOCALE_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecurringInstance } from '../../core/models/lunchmoney.types';
import {
  formatCurrency,
  formatCurrencyWithCode,
  resolveAmount,
  resolveDisplayCurrency,
  resolvePreferredCurrency,
} from '../../shared/utils/currency.util';
import { decodeHtmlEntities } from '../../shared/utils/text.util';
import {
  formatMonthDay,
  getWindowRange,
  isPastDate,
} from '../../shared/utils/date.util';
import {
  hasFoundTransactionForOccurrence,
  isRecurringInstancePending,
} from '../../shared/utils/recurring.util';

@Component({
  selector: 'recurring-expenses-panel',
  imports: [CommonModule],
  template: `
    @if (sortedExpenses().length > 0) {
      <div class="recurring-panel">
        <div class="panel-header">
          <h3>Upcoming recurring expenses</h3>
          <p class="total">Unassigned total: {{ totalFormatted() }}</p>
        </div>
        <div class="expenses-list">
          @for (
            entry of sortedExpenses();
            track entry.expense.id + '-' + entry.occurrenceDate.toISOString()
          ) {
            <div class="expense-item">
              <div class="expense-info">
                <div class="payee">{{ getPayee(entry) }}</div>
                @if (getDescription(entry)) {
                  <div class="description">{{ getDescription(entry) }}</div>
                }
                <div class="badges">
                  <span class="badge upcoming">
                    {{ isPastDue(entry) ? 'Due' : 'Upcoming' }}
                  </span>
                  @if (entry.expense.type === 'suggested') {
                    <span class="badge suggested">Suggested</span>
                  }
                </div>
              </div>
              <div class="expense-amount">
                <div class="amount">{{ getFormattedAmount(entry) }}</div>
                <div class="date">{{ getFormattedDate(entry) }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./recurring-expenses-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringExpensesPanelComponent {
  private readonly locale = inject(LOCALE_ID);

  readonly expenses = input.required<RecurringInstance[]>();
  readonly currency = input<string | null>(null);
  readonly defaultCurrency = input.required<string>();
  readonly referenceDate = input.required<Date>();
  readonly windowStart = input.required<string>();
  readonly windowEnd = input.required<string>();

  readonly sortedExpenses = computed(() => {
    const referenceDate = this.referenceDate();
    const windowRange = getWindowRange(this.windowStart(), this.windowEnd());
    return this.expenses()
      .filter(
        instance =>
          isRecurringInstancePending(instance, {
            referenceDate,
            includePastOccurrences: true,
            windowStart: windowRange?.start,
            windowEnd: windowRange?.end,
          }) && !hasFoundTransactionForOccurrence(instance)
      )
      .sort((a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime());
  });

  readonly totalFormatted = computed(() => {
    const total = this.sortedExpenses().reduce((sum, entry) => {
      const amount = Math.abs(
        resolveAmount(entry.expense.amount, entry.expense.to_base ?? null)
      );
      return sum + amount;
    }, 0);

    const displayCurrency = this.displayCurrency();
    return formatCurrency(total, displayCurrency, {
      fallbackCurrency: displayCurrency,
      locale: this.locale,
    });
  });

  getPayee(entry: RecurringInstance): string {
    return (
      decodeHtmlEntities(entry.expense.payee) || 'Unnamed recurring expense'
    );
  }

  getDescription(entry: RecurringInstance): string | null {
    return decodeHtmlEntities(entry.expense.description);
  }

  getFormattedAmount(entry: RecurringInstance): string {
    const value = Math.abs(
      resolveAmount(entry.expense.amount, entry.expense.to_base ?? null)
    );
    const baseCurrency = this.displayCurrency();
    const displayCurrency = resolveDisplayCurrency(
      entry.expense.currency,
      entry.expense.to_base ?? null,
      baseCurrency
    );
    return formatCurrencyWithCode(value, displayCurrency, {
      fallbackCurrency: baseCurrency,
      originalCurrency: entry.expense.currency,
      locale: this.locale,
    });
  }

  getFormattedDate(entry: RecurringInstance): string {
    return formatMonthDay(entry.occurrenceDate, this.locale);
  }

  isPastDue(entry: RecurringInstance): boolean {
    return isPastDate(entry.occurrenceDate, this.referenceDate());
  }

  private displayCurrency(): string {
    return resolvePreferredCurrency(
      [this.currency(), this.defaultCurrency()],
      'USD'
    );
  }
}
