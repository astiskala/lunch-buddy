import { ChangeDetectionStrategy, Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecurringInstance } from '../../core/models/lunchmoney.types';
import { formatCurrency } from '../../shared/utils/currency.util';
import { decodeHtmlEntities } from '../../shared/utils/text.util';

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
          @for (entry of sortedExpenses(); track entry.expense.id + '-' + entry.expense.billing_date) {
            <div class="expense-item">
              <div class="expense-info">
                <div class="payee">{{ getPayee(entry) }}</div>
                @if (getDescription(entry)) {
                  <div class="description">{{ getDescription(entry) }}</div>
                }
                <div class="badges">
                  <span class="badge upcoming">Upcoming</span>
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
  styles: [`
    .recurring-panel {
      background: var(--color-surface);
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      overflow: hidden;
      border: 1px solid rgba(68, 149, 140, 0.15);
    }

    .panel-header {
      background: var(--gradient-secondary);
      color: #1a202c;
      padding: 20px 24px;

      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1a202c;
      }

      .total {
        margin: 0;
        font-size: 14px;
        opacity: 0.85;
      }
    }

    .expenses-list {
      padding: 8px;
    }

    .expense-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      border-bottom: 1px solid var(--color-border);

      &:last-child {
        border-bottom: none;
      }
    }

    .expense-info {
      flex: 1;
      min-width: 0;

      .payee {
        font-weight: 600;
        color: var(--color-text-primary);
        margin-bottom: 4px;
      }

      .description {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-bottom: 8px;
      }

      .badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .badge {
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;

        &.upcoming {
          background: var(--color-secondary-light);
          color: var(--color-secondary-dark);
        }

        &.suggested {
          background: rgba(68, 149, 140, 0.15);
          color: var(--color-primary-dark);
        }
      }
    }

    .expense-amount {
      text-align: right;
      margin-left: 16px;

      .amount {
        font-weight: 700;
        color: var(--color-text-primary);
        font-size: 16px;
        margin-bottom: 4px;
      }

      .date {
        font-size: 12px;
        color: var(--color-text-muted);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringExpensesPanelComponent {
  readonly expenses = input.required<RecurringInstance[]>();
  readonly currency = input<string | null>(null);
  readonly defaultCurrency = input.required<string>();

  readonly sortedExpenses = computed(() => {
    return [...this.expenses()].sort(
      (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
    );
  });

  readonly totalFormatted = computed(() => {
    const total = this.sortedExpenses().reduce((sum, entry) => {
      const amount = Math.abs(parseFloat(entry.expense.amount));
      return sum + amount;
    }, 0);

    return formatCurrency(total, this.currency(), {
      fallbackCurrency: this.defaultCurrency(),
    });
  });

  getPayee(entry: RecurringInstance): string {
    return decodeHtmlEntities(entry.expense.payee) ?? 'Unnamed recurring expense';
  }

  getDescription(entry: RecurringInstance): string | null {
    return decodeHtmlEntities(entry.expense.description);
  }

  getFormattedAmount(entry: RecurringInstance): string {
    const value = Math.abs(parseFloat(entry.expense.amount));
    return formatCurrency(value, entry.expense.currency ?? this.currency(), {
      fallbackCurrency: this.defaultCurrency(),
    });
  }

  getFormattedDate(entry: RecurringInstance): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = entry.occurrenceDate;
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }
}
