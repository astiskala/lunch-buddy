import {
  ChangeDetectionStrategy,
  Component,
  signal,
  input,
  computed,
  inject,
  effect,
  LOCALE_ID,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import {
  BudgetProgress,
  RecurringInstance,
  Transaction,
} from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { LoggerService } from '../../core/services/logger.service';
import { OfflineService } from '../../core/services/offline.service';
import {
  formatCurrency,
  FormatCurrencyOptions,
  normalizeCurrencyCode,
  resolveAmount,
  resolveDisplayCurrency,
} from '../../shared/utils/currency.util';
import { decodeHtmlEntities } from '../../shared/utils/text.util';
import {
  formatMonthDay,
  getWindowRange,
  isPastDate,
  startOfDay,
} from '../../shared/utils/date.util';
import { toPercent } from '../../shared/utils/number.util';
import {
  hasFoundTransactionForOccurrence,
  isRecurringInstancePending,
} from '../../shared/utils/recurring.util';

interface ActivityEntry {
  id: string;
  kind: 'transaction' | 'upcoming';
  date: Date | null;
  label: string;
  notes: string | null;
  amount: number;
  currency: string | null;
  originalCurrency?: string | null;
  originalAmount?: number | null;
}

interface ActivityGroup {
  id: string;
  label: string;
  entries: ActivityEntry[];
}

/**
 * Relative tolerance threshold for amount comparison when matching recurring expenses to transactions.
 * If the absolute amount difference is less than this percentage of the recurring amount,
 * the amounts are considered to align.
 */
const AMOUNT_RELATIVE_TOLERANCE = 0.2;

@Component({
  selector: 'category-card',
  imports: [
    CommonModule,
    MatIconModule,
    ProgressBarComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './category-card.component.html',
  styleUrls: ['./category-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCardComponent {
  readonly lunchMoneyService = inject(LunchMoneyService);
  readonly logger = inject(LoggerService);
  readonly offlineService = inject(OfflineService);
  private readonly locale = inject(LOCALE_ID);

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
    this.formatValue(this.item().budgetAmount, this.item().budgetCurrency)
  );

  readonly spentLabelText = computed(() =>
    this.item().isIncome ? 'Received' : 'Spent'
  );

  readonly spentLabel = computed(() => {
    const item = this.item();
    const amount = item.isIncome ? Math.abs(item.spent) : item.spent;
    return this.formatValue(amount, item.budgetCurrency);
  });

  readonly progressValue = computed(() =>
    toPercent(this.item().progressRatio, { min: 0, max: 100 })
  );

  readonly hasBudget = computed(() => Math.abs(this.item().budgetAmount) > 0);

  readonly monthProgressPercent = computed(() =>
    toPercent(this.monthProgressRatio())
  );

  readonly statusColor = computed(() => {
    const st = this.item().status;
    if (st === 'over') return 'error';
    if (st === 'at-risk') return 'warning';
    return 'success';
  });

  readonly activityEntries = computed(() => {
    const txns = this.getTransactions();
    const recurring = this.recurringExpenses();
    const recurrenceContext = this.buildRecurrenceContext(txns);

    const transactionEntries = this.convertTransactionsToEntries(txns);
    const foundEntries = this.buildFoundTransactionEntries(
      recurring,
      txns,
      recurrenceContext.windowRange
    );
    const recurringEntries = this.convertRecurringToEntries({
      recurring,
      context: recurrenceContext,
    });

    const entries = [
      ...transactionEntries,
      ...foundEntries,
      ...recurringEntries,
    ];
    return this.sortEntriesByDateDescending(entries);
  });

  readonly activityGroups = computed(() => {
    const groups: ActivityGroup[] = [];
    for (const entry of this.activityEntries()) {
      const key = this.getActivityGroupKey(entry.date);
      const current = groups.at(-1);
      if (current?.id === key) {
        current.entries.push(entry);
      } else {
        groups.push({
          id: key,
          label: this.formatDate(entry.date),
          entries: [entry],
        });
      }
    }
    return groups;
  });

  readonly upcomingRecurringTotal = computed(() => {
    const recurring = this.recurringExpenses();
    const txns = this.getTransactions();
    const recurrenceContext = this.buildRecurrenceContext(txns);

    let total = 0;

    for (const instance of recurring) {
      if (!this.shouldIncludeRecurringInstance(instance, recurrenceContext)) {
        continue;
      }

      const amount = resolveAmount(
        instance.expense.amount,
        instance.expense.to_base ?? null
      );
      total += Math.abs(amount);
    }

    return total;
  });

  readonly upcomingLabel = computed(() =>
    this.formatValue(
      this.upcomingRecurringTotal(),
      this.normalizedDefaultCurrency()
    )
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
    this.formatValue(
      Math.abs(this.remainingAfterUpcoming()),
      this.item().budgetCurrency
    )
  );

  readonly projectedValue = computed(() => {
    const item = this.item();
    const upcoming = this.upcomingRecurringTotal();
    const projectedRatio = item.budgetAmount
      ? Math.min(1, Math.max(0, (item.spent + upcoming) / item.budgetAmount))
      : 0;
    return toPercent(projectedRatio);
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
    const isIncomeCategory = this.isIncomeCategory();
    return transactions.map(transaction => {
      const rawAmount = resolveAmount(
        transaction.amount,
        transaction.to_base ?? null
      );
      const amount = isIncomeCategory ? Math.abs(rawAmount) : rawAmount;
      const date = new Date(transaction.date);
      const rawLabel = transaction.payee;
      const label = decodeHtmlEntities(rawLabel) || 'Unknown payee';
      const notes = transaction.notes
        ? decodeHtmlEntities(transaction.notes)
        : null;
      const originalAmount = this.parseAmountValue(transaction.amount);
      const displayCurrency = this.resolveEntryCurrency(
        transaction.currency,
        transaction.to_base ?? null
      );

      return {
        id: `txn-${transaction.id.toString()}`,
        kind: 'transaction',
        date: Number.isNaN(date.getTime()) ? null : date,
        label,
        notes,
        amount,
        currency: displayCurrency,
        originalCurrency: transaction.currency,
        originalAmount,
      };
    });
  }

  private getRecordedRecurringIds(transactions: Transaction[]): Set<string> {
    const recordedIds = new Set<string>();
    for (const transaction of transactions) {
      const id = this.normalizeRecurringId(transaction.recurring_id);
      if (id) {
        recordedIds.add(id);
      }
    }
    return recordedIds;
  }

  private convertRecurringToEntries(params: {
    recurring: RecurringInstance[];
    context: {
      referenceDate: Date;
      windowRange: { start: Date; end: Date } | null;
      recordedRecurringIds: Set<string>;
      transactions: Transaction[];
    };
  }): ActivityEntry[] {
    const { recurring, context } = params;
    const entries: ActivityEntry[] = [];
    const isIncomeCategory = this.isIncomeCategory();

    for (const instance of recurring) {
      if (!this.shouldIncludeRecurringInstance(instance, context)) {
        continue;
      }
      const base = this.buildRecurringEntryBase(instance, isIncomeCategory);

      entries.push({
        id: `recurring-${instance.expense.id.toString()}`,
        kind: 'upcoming',
        date: instance.occurrenceDate,
        ...base,
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
    return this.formatValue(value, entry.currency);
  }

  formatOriginalAmount(entry: ActivityEntry): string {
    const originalAmount = entry.originalAmount;
    if (originalAmount === null || originalAmount === undefined) {
      return '';
    }
    const originalCurrency = normalizeCurrencyCode(entry.originalCurrency);
    return this.formatValue(Math.abs(originalAmount), originalCurrency, {
      currencyDisplay: 'code',
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '—';
    return formatMonthDay(date, this.locale);
  }

  getAmountColor(entry: ActivityEntry): string {
    if (entry.kind === 'upcoming') return 'warning';
    const isIncomeCategory = this.isIncomeCategory();
    if (isIncomeCategory) {
      return entry.amount >= 0 ? 'success' : 'error';
    }
    return entry.amount >= 0 ? 'error' : 'success';
  }

  getUpcomingLabel(entry: ActivityEntry): string {
    return this.isPastDue(entry) ? 'Due' : 'Upcoming';
  }

  shouldShowUpcomingBadge(entry: ActivityEntry): boolean {
    return entry.kind === 'upcoming';
  }

  shouldShowOriginalAmount(entry: ActivityEntry): boolean {
    const originalCurrency = normalizeCurrencyCode(entry.originalCurrency);
    const displayCurrency = normalizeCurrencyCode(entry.currency);
    if (!originalCurrency || !displayCurrency) {
      return false;
    }
    if (originalCurrency === displayCurrency) {
      return false;
    }
    return entry.originalAmount !== null && entry.originalAmount !== undefined;
  }

  private isPastDue(entry: ActivityEntry): boolean {
    if (entry.kind !== 'upcoming' || !entry.date) {
      return false;
    }
    return isPastDate(entry.date, this.referenceDate());
  }

  private safeItem(): BudgetProgress | null {
    try {
      return this.item();
    } catch {
      return null;
    }
  }

  private buildFoundTransactionEntries(
    recurring: RecurringInstance[],
    transactions: Transaction[],
    windowRange: { start: Date; end: Date } | null
  ): ActivityEntry[] {
    const entries: ActivityEntry[] = [];
    const isIncomeCategory = this.isIncomeCategory();

    for (const instance of recurring) {
      const found = instance.expense.found_transactions;
      if (!found || found.length === 0) {
        continue;
      }
      const base = this.buildRecurringEntryBase(instance, isIncomeCategory);

      for (const entry of found) {
        const entryDate = this.toFoundEntryDate(entry.date, windowRange);
        if (!entryDate) {
          continue;
        }
        if (this.isDuplicateTransaction(entry.transaction_id, transactions)) {
          continue;
        }
        entries.push({
          id: `found-${instance.expense.id.toString()}-${entry.transaction_id.toString()}`,
          kind: 'transaction',
          date: entryDate,
          ...base,
        });
      }
    }

    return entries;
  }

  private hasMatchingTransaction(
    instance: RecurringInstance,
    transactions: Transaction[],
    options?: { skipFoundCheck?: boolean }
  ): boolean {
    if (
      !options?.skipFoundCheck &&
      hasFoundTransactionForOccurrence(instance)
    ) {
      return true;
    }

    const occurrence = startOfDay(instance.occurrenceDate);
    const recurringAmount = Math.abs(
      resolveAmount(instance.expense.amount, instance.expense.to_base ?? null)
    );
    const recurringPayee = this.normalizeText(instance.expense.payee);
    const recurringId = this.normalizeRecurringId(instance.expense.id);
    const tenDaysMs = 10 * 24 * 60 * 60 * 1000;

    for (const txn of transactions) {
      if (this.matchesRecurringId(recurringId, txn)) {
        return true;
      }

      if (!this.isTransactionDateRelevant(txn, occurrence, tenDaysMs)) {
        continue;
      }

      const txnPayee = this.normalizeTransactionPayee(txn);
      const payeeMatches = this.payeesAlign(recurringPayee, txnPayee);
      if (!txn.is_pending && payeeMatches) {
        return true;
      }

      const amountsClose = this.amountsAlign(recurringAmount, txn, 0.01);
      const hasPayeeConflict =
        recurringPayee !== null && txnPayee !== null && !payeeMatches;
      if (!txn.is_pending && !hasPayeeConflict && amountsClose) {
        return true;
      }
    }

    return false;
  }

  private normalizeText(value: string | null): string | null {
    if (!value) return null;
    const normalized = decodeHtmlEntities(value).trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeRecurringId(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      return null;
    }
    return num.toString();
  }

  private shouldIncludeRecurringInstance(
    instance: RecurringInstance,
    context: {
      referenceDate: Date;
      windowRange: { start: Date; end: Date } | null;
      recordedRecurringIds: Set<string>;
      transactions: Transaction[];
    }
  ): boolean {
    if (
      !isRecurringInstancePending(instance, {
        referenceDate: context.referenceDate,
        includePastOccurrences: true,
        windowStart: context.windowRange?.start,
        windowEnd: context.windowRange?.end,
      }) ||
      hasFoundTransactionForOccurrence(instance)
    ) {
      return false;
    }

    const normalizedId = this.normalizeRecurringId(instance.expense.id);
    if (
      (normalizedId && context.recordedRecurringIds.has(normalizedId)) ||
      this.hasMatchingTransaction(instance, context.transactions)
    ) {
      return false;
    }

    return true;
  }

  private isWithinWindowRange(
    date: Date,
    windowRange: { start: Date; end: Date } | null
  ): boolean {
    if (!windowRange) {
      return true;
    }
    const time = date.getTime();
    return (
      time >= windowRange.start.getTime() && time <= windowRange.end.getTime()
    );
  }

  private toFoundEntryDate(
    dateValue: string,
    windowRange: { start: Date; end: Date } | null
  ): Date | null {
    const entryDate = new Date(dateValue);
    if (Number.isNaN(entryDate.getTime())) {
      return null;
    }
    if (!this.isWithinWindowRange(entryDate, windowRange)) {
      return null;
    }
    return entryDate;
  }

  private isDuplicateTransaction(
    transactionId: number,
    transactions: Transaction[]
  ): boolean {
    return transactions.some(txn => txn.id === transactionId);
  }

  private matchesRecurringId(
    recurringId: string | null,
    txn: Transaction
  ): boolean {
    const txnRecurringId = this.normalizeRecurringId(txn.recurring_id);
    return Boolean(
      recurringId && txnRecurringId && recurringId === txnRecurringId
    );
  }

  private isDateUsable(date: Date): boolean {
    return !Number.isNaN(date.getTime());
  }

  private isTransactionDateRelevant(
    txn: Transaction,
    occurrence: Date,
    toleranceMs: number
  ): boolean {
    const txnDate = startOfDay(new Date(txn.date));
    return (
      this.isDateUsable(txnDate) &&
      this.isWithinDateTolerance(txnDate, occurrence, toleranceMs)
    );
  }

  private isWithinDateTolerance(
    txnDate: Date,
    occurrence: Date,
    toleranceMs: number
  ): boolean {
    const diff = Math.abs(txnDate.getTime() - occurrence.getTime());
    return diff <= toleranceMs;
  }

  private normalizeTransactionPayee(txn: Transaction): string | null {
    const candidates: (string | null)[] = [
      txn.payee,
      this.getFallbackString(txn, 'display_name'),
      this.getFallbackString(txn, 'original_name'),
      this.getFallbackString(txn, 'recurring_payee'),
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeText(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return null;
  }

  private payeesAlign(
    recurringPayee: string | null,
    txnPayee: string | null
  ): boolean {
    return Boolean(
      recurringPayee &&
      txnPayee &&
      (recurringPayee === txnPayee ||
        recurringPayee.includes(txnPayee) ||
        txnPayee.includes(recurringPayee))
    );
  }

  private amountsAlign(
    recurringAmount: number,
    txn: Transaction,
    tolerance: number
  ): boolean {
    const txnAmount = Math.abs(resolveAmount(txn.amount, txn.to_base ?? null));
    const amountDelta = Math.abs(txnAmount - recurringAmount);
    const relativeTolerance = Math.max(
      tolerance,
      recurringAmount * AMOUNT_RELATIVE_TOLERANCE
    );
    return amountDelta <= relativeTolerance;
  }

  private getFallbackString(
    txn: Transaction,
    key: 'display_name' | 'original_name' | 'recurring_payee'
  ): string | null {
    const candidate: unknown = (txn as unknown as Record<string, unknown>)[key];
    return typeof candidate === 'string' ? candidate : null;
  }

  private normalizedDefaultCurrency(): string {
    return normalizeCurrencyCode(this.defaultCurrency()) ?? 'USD';
  }

  private parseAmountValue(value: string | null | undefined): number | null {
    if (typeof value !== 'string') {
      return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveEntryCurrency(
    originalCurrency: string | null,
    toBase: number | null
  ): string {
    return resolveDisplayCurrency(
      originalCurrency,
      toBase,
      this.normalizedDefaultCurrency()
    );
  }

  private getActivityGroupKey(date: Date | null): string {
    if (!date) return 'unknown';
    return startOfDay(date).toDateString();
  }

  private formatValue(
    value: number,
    currency: string | null,
    options: FormatCurrencyOptions = {}
  ): string {
    return formatCurrency(value, currency, {
      fallbackCurrency: this.defaultCurrency(),
      locale: this.locale,
      ...options,
    });
  }

  private getTransactions(): Transaction[] {
    const item = this.item();
    return Array.isArray(item.transactionList)
      ? item.transactionList
      : this.transactions();
  }

  private buildRecurrenceContext(transactions: Transaction[]): {
    referenceDate: Date;
    windowRange: { start: Date; end: Date } | null;
    recordedRecurringIds: Set<string>;
    transactions: Transaction[];
  } {
    return {
      referenceDate: this.referenceDate(),
      windowRange: getWindowRange(this.startDate(), this.endDate()),
      recordedRecurringIds: this.getRecordedRecurringIds(transactions),
      transactions,
    };
  }

  private buildRecurringEntryBase(
    instance: RecurringInstance,
    isIncomeCategory: boolean
  ): Omit<ActivityEntry, 'id' | 'kind' | 'date'> {
    const rawAmount = resolveAmount(
      instance.expense.amount,
      instance.expense.to_base ?? null
    );
    const amount = isIncomeCategory ? Math.abs(rawAmount) : rawAmount;
    const payee = decodeHtmlEntities(instance.expense.payee).trim();
    const label = payee.length > 0 ? payee : 'Recurring expense';
    const notes = decodeHtmlEntities(instance.expense.description);
    const originalAmount = this.parseAmountValue(instance.expense.amount);
    const displayCurrency = this.resolveEntryCurrency(
      instance.expense.currency,
      instance.expense.to_base ?? null
    );

    return {
      label,
      notes,
      amount,
      currency: displayCurrency,
      originalCurrency: instance.expense.currency,
      originalAmount,
    };
  }

  private isIncomeCategory(): boolean {
    return this.safeItem()?.isIncome ?? false;
  }
}
