import {
  ChangeDetectionStrategy,
  Component,
  signal,
  input,
  computed,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import {
  BudgetProgress,
  RecurringInstance,
  Transaction,
} from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { LoggerService } from '../../core/services/logger.service';
import { OfflineService } from '../../core/services/offline.service';
import { formatCurrency } from '../../shared/utils/currency.util';
import { decodeHtmlEntities } from '../../shared/utils/text.util';
import { isRecurringInstancePending } from '../../shared/utils/recurring.util';

interface ActivityEntry {
  id: string;
  kind: 'transaction' | 'upcoming';
  date: Date | null;
  label: string;
  notes: string | null;
  amount: number;
  currency: string | null;
}

@Component({
  selector: 'category-card',
  imports: [CommonModule, MatIconModule],
  templateUrl: './category-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCardComponent {
  readonly lunchMoneyService = inject(LunchMoneyService);
  readonly logger = inject(LoggerService);
  readonly offlineService = inject(OfflineService);

  readonly item = input.required<BudgetProgress>();
  readonly defaultCurrency = input.required<string>();
  readonly recurringExpenses = input<RecurringInstance[]>([]);
  readonly startDate = input.required<string>();
  readonly endDate = input.required<string>();
  readonly monthProgressRatio = input<number>(0);
  readonly referenceDate = input.required<Date>();
  readonly includeAllTransactions = input(true);

  readonly showDetails = signal(false);
  readonly transactions = signal<Transaction[]>([]);
  readonly isLoadingTransactions = signal(false);
  readonly transactionsLoadError = signal(false);

  protected readonly isOffline = this.offlineService.getOfflineStatus();
  private lastIncludeAllTransactions: boolean | null = null;

  constructor() {
    effect(() => {
      if (!this.showDetails()) {
        return;
      }

      const includeAll = this.includeAllTransactions();
      if (this.lastIncludeAllTransactions === includeAll) {
        return;
      }

      if (this.isLoadingTransactions()) {
        return;
      }

      this.loadTransactions();
    });
  }

  readonly budgetLabel = computed(() =>
    formatCurrency(this.item().budgetAmount, this.item().budgetCurrency, {
      fallbackCurrency: this.defaultCurrency(),
    })
  );

  readonly spentLabelText = computed(() =>
    this.item().isIncome ? 'Received' : 'Spent'
  );

  readonly spentLabel = computed(() => {
    const item = this.item();
    const amount = item.isIncome ? Math.abs(item.spent) : item.spent;
    return formatCurrency(amount, item.budgetCurrency, {
      fallbackCurrency: this.defaultCurrency(),
    });
  });

  readonly progressValue = computed(() =>
    Math.min(100, Math.max(0, Math.round(this.item().progressRatio * 100)))
  );

  readonly hasBudget = computed(() => Math.abs(this.item().budgetAmount) > 0);

  readonly monthProgressPercent = computed(() =>
    Math.round(this.monthProgressRatio() * 100)
  );

  readonly statusColor = computed(() => {
    const st = this.item().status;
    if (st === 'over') return 'error';
    if (st === 'at-risk') return 'warning';
    return 'success';
  });

  readonly activityEntries = computed(() => {
    const item = this.item();
    const txns = Array.isArray(item.transactionList)
      ? item.transactionList
      : this.transactions();
    const recurring = this.recurringExpenses();
    const referenceDate = this.referenceDate();

    const transactionEntries = this.convertTransactionsToEntries(txns);
    const recordedRecurringIds = this.getRecordedRecurringIds(txns);
    const recurringEntries = this.convertRecurringToEntries(
      recurring,
      referenceDate,
      recordedRecurringIds
    );

    const entries = [...transactionEntries, ...recurringEntries];
    return this.sortEntriesByDateDescending(entries);
  });

  readonly upcomingRecurringTotal = computed(() => {
    const recurring = this.recurringExpenses();
    const txns = this.transactions();
    const referenceDate = this.referenceDate();

    const recordedRecurringIds = new Set<number>();
    for (const transaction of txns) {
      if (transaction.recurring_id) {
        recordedRecurringIds.add(transaction.recurring_id);
      }
    }

    let total = 0;

    for (const instance of recurring) {
      if (!isRecurringInstancePending(instance, { referenceDate })) {
        continue;
      }
      if (recordedRecurringIds.has(instance.expense.id)) {
        continue;
      }

      total += Math.abs(Number.parseFloat(instance.expense.amount));
    }

    return total;
  });

  readonly upcomingLabel = computed(() =>
    formatCurrency(this.upcomingRecurringTotal(), this.item().budgetCurrency, {
      fallbackCurrency: this.defaultCurrency(),
    })
  );

  readonly remainingAfterUpcoming = computed(() => {
    const item = this.item();
    const upcoming = this.upcomingRecurringTotal();
    const actualSpent = item.isIncome ? Math.abs(item.spent) : item.spent;
    let remaining = item.budgetAmount
      ? item.budgetAmount - actualSpent - upcoming
      : item.remaining - upcoming;
    // For income categories, invert sign
    if (item.isIncome) {
      remaining = -remaining;
    }
    return remaining;
  });

  readonly remainingAfterUpcomingLabel = computed(() =>
    formatCurrency(
      Math.abs(this.remainingAfterUpcoming()),
      this.item().budgetCurrency,
      {
        fallbackCurrency: this.defaultCurrency(),
      }
    )
  );

  readonly projectedValue = computed(() => {
    const item = this.item();
    const upcoming = this.upcomingRecurringTotal();
    const projectedRatio = item.budgetAmount
      ? Math.min(1, Math.max(0, (item.spent + upcoming) / item.budgetAmount))
      : 0;
    return Math.round(projectedRatio * 100);
  });

  toggleDetails(): void {
    const newState = !this.showDetails();
    this.showDetails.set(newState);
  }

  retryLoadTransactions(): void {
    this.loadTransactions();
  }

  private loadTransactions(): void {
    const includeAll = this.includeAllTransactions();
    this.lastIncludeAllTransactions = includeAll;

    this.isLoadingTransactions.set(true);
    this.transactionsLoadError.set(false);

    this.lunchMoneyService
      .getCategoryTransactions(
        this.item().categoryId,
        this.startDate(),
        this.endDate(),
        {
          includeAllTransactions: includeAll,
        }
      )
      .subscribe({
        next: response => {
          this.transactions.set(response.transactions);
          this.isLoadingTransactions.set(false);
          this.transactionsLoadError.set(false);
        },
        error: (error: unknown) => {
          this.logger.error('Failed to load transactions', error);
          this.isLoadingTransactions.set(false);
          this.transactionsLoadError.set(true);
        },
      });
  }

  private convertTransactionsToEntries(
    transactions: Transaction[]
  ): ActivityEntry[] {
    return transactions.map(transaction => {
      const amount = Number.parseFloat(transaction.amount);
      const date = new Date(transaction.date);
      const rawLabel = transaction.payee;
      let label = decodeHtmlEntities(rawLabel);
      if (!label || !label.trim()) {
        // Fallback to display_name if available, otherwise use a default
        label = transaction['display_name']
          ? decodeHtmlEntities(transaction['display_name'])
          : 'Unknown payee';
      }
      const notes = transaction.notes
        ? decodeHtmlEntities(transaction.notes)
        : null;

      return {
        id: `txn-${transaction.id.toString()}`,
        kind: 'transaction',
        date: Number.isNaN(date.getTime()) ? null : date,
        label,
        notes,
        amount,
        currency: transaction.currency,
      };
    });
  }

  private getRecordedRecurringIds(transactions: Transaction[]): Set<number> {
    const recordedIds = new Set<number>();
    for (const transaction of transactions) {
      if (transaction.recurring_id) {
        recordedIds.add(transaction.recurring_id);
      }
    }
    return recordedIds;
  }

  private convertRecurringToEntries(
    recurring: RecurringInstance[],
    referenceDate: Date,
    recordedRecurringIds: Set<number>
  ): ActivityEntry[] {
    const entries: ActivityEntry[] = [];

    for (const instance of recurring) {
      if (!isRecurringInstancePending(instance, { referenceDate })) {
        continue;
      }
      if (recordedRecurringIds.has(instance.expense.id)) {
        continue;
      }

      const amount = Number.parseFloat(instance.expense.amount);
      const payee = decodeHtmlEntities(instance.expense.payee).trim();
      const label = payee.length > 0 ? payee : 'Recurring expense';
      const notes = decodeHtmlEntities(instance.expense.description);

      entries.push({
        id: `recurring-${instance.expense.id.toString()}`,
        kind: 'upcoming',
        date: instance.occurrenceDate,
        label,
        notes,
        amount,
        currency: instance.expense.currency,
      });
    }

    return entries;
  }

  private sortEntriesByDateDescending(
    entries: ActivityEntry[]
  ): ActivityEntry[] {
    return entries.sort((a, b) => {
      const timeA = a.date ? a.date.getTime() : -Infinity;
      const timeB = b.date ? b.date.getTime() : -Infinity;
      return timeB - timeA;
    });
  }

  formatAmount(entry: ActivityEntry): string {
    const value = Math.abs(entry.amount);
    return formatCurrency(value, entry.currency, {
      fallbackCurrency: this.defaultCurrency(),
    });
  }

  formatDate(entry: ActivityEntry): string {
    if (!entry.date) return '—';
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${months[entry.date.getMonth()]} ${entry.date.getDate().toString()}`;
  }

  getAmountColor(entry: ActivityEntry): string {
    if (entry.kind === 'upcoming') return 'warning';
    return entry.amount < 0 ? 'error' : 'success';
  }
}
