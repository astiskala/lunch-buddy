import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  LunchMoneyUser,
  LunchMoneyCategory,
  BudgetSummaryItem,
  TransactionsResponse,
  RecurringExpense,
  RecurringItemResponse,
  SummaryCategory,
  SummaryCategoryOccurrence,
  SummaryCategoryTotals,
  SummaryResponse,
} from '../models/lunchmoney.types';
import { environment } from '../../../environments/environment';

const normalizeBaseUrl = (baseUrl: string): string => {
  let url = baseUrl;
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  return url;
};

const LUNCH_MONEY_API_BASE = normalizeBaseUrl(environment.lunchmoneyApiBase);

@Injectable({
  providedIn: 'root',
})
export class LunchMoneyService {
  private readonly http = inject(HttpClient);
  private readonly noCacheHeaders = new HttpHeaders({
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'If-Modified-Since': '0',
  });

  private createRequestOptions(params?: HttpParams) {
    return {
      headers: this.noCacheHeaders,
      params,
    };
  }

  /**
   * Get user information
   */
  getUser(): Observable<LunchMoneyUser> {
    return this.http.get<LunchMoneyUser>(
      `${LUNCH_MONEY_API_BASE}/me`,
      this.createRequestOptions()
    );
  }

  /**
   * Get all categories
   */
  getCategories(): Observable<LunchMoneyCategory[]> {
    return this.http
      .get<{
        categories: LunchMoneyCategory[];
      }>(
        `${LUNCH_MONEY_API_BASE}/categories`,
        this.createRequestOptions(new HttpParams().set('format', 'flattened'))
      )
      .pipe(map(response => response.categories));
  }

  /**
   * Get budget summary for a specific date range
   */
  getBudgetSummary(
    startDate: string,
    endDate: string
  ): Observable<BudgetSummaryItem[]> {
    const summaryParams = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('include_occurrences', 'true')
      .set('include_exclude_from_budgets', 'true');

    const summary$ = this.http.get<SummaryResponse>(
      `${LUNCH_MONEY_API_BASE}/summary`,
      this.createRequestOptions(summaryParams)
    );
    const categories$ = this.getCategories();

    return forkJoin({ summary: summary$, categories: categories$ }).pipe(
      map(({ summary, categories }) =>
        this.mergeSummaryWithCategories(summary, categories)
      )
    );
  }

  /**
   * Get recurring expenses
   */
  getRecurringExpenses(
    startDate: string,
    endDate: string
  ): Observable<RecurringExpense[]> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);

    return this.http
      .get<{
        recurring_items: RecurringItemResponse[];
      }>(
        `${LUNCH_MONEY_API_BASE}/recurring_items`,
        this.createRequestOptions(params)
      )
      .pipe(
        map(response =>
          response.recurring_items.map(item => this.toRecurringExpense(item))
        )
      );
  }

  /**
   * Get transactions for a category
   */
  getCategoryTransactions(
    categoryId: number | null,
    startDate: string,
    endDate: string,
    options?: { includeAllTransactions?: boolean }
  ): Observable<TransactionsResponse> {
    let params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('include_pending', 'true');

    // For specific categories, set the category_id filter
    // For uncategorized (null), we'll filter client-side after fetching
    if (categoryId !== null) {
      params = params.set('category_id', categoryId.toString());
    }

    const includeAll = options?.includeAllTransactions ?? true;
    if (!includeAll) {
      // Filter to 'cleared' status (API query parameter) to exclude pending/unreviewed transactions
      params = params.set('status', 'cleared');
    }

    return this.http
      .get<TransactionsResponse>(
        `${LUNCH_MONEY_API_BASE}/transactions`,
        this.createRequestOptions(params)
      )
      .pipe(
        map(response => {
          // If querying for uncategorized transactions, filter client-side
          if (categoryId === null) {
            return {
              ...response,
              transactions: response.transactions.filter(
                txn => txn.category_id === null
              ),
            };
          }
          return response;
        })
      );
  }

  private mergeSummaryWithCategories(
    summary: SummaryResponse,
    categories: LunchMoneyCategory[]
  ): BudgetSummaryItem[] {
    const categoryMap = new Map<number, LunchMoneyCategory>();
    const groupNameMap = new Map<number, string>();

    for (const category of categories) {
      categoryMap.set(category.id, category);
      if (category.is_group) {
        groupNameMap.set(category.id, category.name);
      }
    }

    const seen = new Set<number>();
    const items: BudgetSummaryItem[] = summary.categories.map(category => {
      const metadata = categoryMap.get(category.category_id);
      seen.add(category.category_id);
      return this.toBudgetSummaryItem(category, metadata, groupNameMap);
    });

    for (const category of categories) {
      if (seen.has(category.id)) {
        continue;
      }
      items.push(
        this.toBudgetSummaryItem(
          {
            category_id: category.id,
            totals: this.emptyTotals(),
          },
          category,
          groupNameMap
        )
      );
    }

    return items;
  }

  private toBudgetSummaryItem(
    summary: SummaryCategory,
    metadata: LunchMoneyCategory | undefined,
    groupNameMap: Map<number, string>
  ): BudgetSummaryItem {
    const occurrence = this.pickOccurrence(summary.occurrences);
    const groupId = metadata?.group_id ?? null;
    const categoryGroupName =
      groupId === null ? null : (groupNameMap.get(groupId) ?? null);

    return {
      category_id: summary.category_id,
      category_name: metadata?.name ?? 'Uncategorized',
      category_group_name: categoryGroupName,
      group_id: groupId,
      is_group: metadata?.is_group ?? false,
      is_income: metadata?.is_income ?? false,
      exclude_from_budget: metadata?.exclude_from_budget ?? false,
      exclude_from_totals: metadata?.exclude_from_totals ?? false,
      totals: summary.totals,
      occurrence,
      order: metadata?.order ?? null,
      archived: metadata?.archived ?? false,
    };
  }

  private pickOccurrence(
    occurrences?: SummaryCategoryOccurrence[]
  ): SummaryCategoryOccurrence | undefined {
    if (!occurrences || occurrences.length === 0) {
      return undefined;
    }
    return occurrences.find(item => item.current) ?? occurrences[0];
  }

  private emptyTotals(): SummaryCategoryTotals {
    return {
      other_activity: 0,
      recurring_activity: 0,
      budgeted: null,
      available: null,
      recurring_remaining: 0,
      recurring_expected: 0,
    };
  }

  private toRecurringExpense(item: RecurringItemResponse): RecurringExpense {
    const criteria = item.transaction_criteria;
    const overrides = item.overrides;
    const matches = item.matches;
    const quantity = criteria.quantity;
    const cadence = `${String(quantity)} ${criteria.granularity}`;

    const overridePayee = overrides?.payee?.trim();
    const criteriaPayee = criteria.payee?.trim();
    let payee = 'Unknown payee';
    if (overridePayee && overridePayee.length > 0) {
      payee = overridePayee;
    } else if (criteriaPayee && criteriaPayee.length > 0) {
      payee = criteriaPayee;
    }

    return {
      id: item.id,
      start_date: criteria.start_date,
      end_date: criteria.end_date,
      cadence,
      status: item.status,
      payee,
      amount: criteria.amount,
      to_base: criteria.to_base,
      currency: criteria.currency,
      description: item.description ?? overrides?.notes ?? null,
      anchor_date: criteria.anchor_date,
      next_occurrence: matches?.expected_occurrence_dates?.[0] ?? null,
      found_transactions: matches?.found_transactions ?? [],
      type: item.status === 'reviewed' ? 'cleared' : 'suggested',
      category_id: overrides?.category_id ?? null,
    };
  }
}
