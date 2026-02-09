import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import {
  LunchMoneyUser,
  LunchMoneyCategory,
  BudgetSummaryResult,
  TransactionsResponse,
  RecurringExpense,
  RecurringItemResponse,
  SummaryResponse,
} from '../models/lunchmoney.types';
import { environment } from '../../../environments/environment';
import {
  mergeSummaryWithCategories,
  extractPeriods,
} from '../../shared/utils/budget.util';

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

  getUser(): Observable<LunchMoneyUser> {
    return this.http.get<LunchMoneyUser>(
      `${LUNCH_MONEY_API_BASE}/me`,
      this.createRequestOptions()
    );
  }

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

  getBudgetSummary(
    startDate: string,
    endDate: string
  ): Observable<BudgetSummaryResult> {
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
      map(({ summary, categories }) => ({
        aligned: summary.aligned,
        items: mergeSummaryWithCategories(summary, categories),
        periods: extractPeriods(summary),
      }))
    );
  }

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

    // Set category_id for specific categories.
    // For uncategorized (null), filter client-side after fetching.
    if (categoryId !== null) {
      params = params.set('category_id', categoryId.toString());
    }

    const includeAll = options?.includeAllTransactions ?? true;
    if (!includeAll) {
      // Filter to cleared status to exclude pending and unreviewed transactions.
      params = params.set('status', 'cleared');
    }

    return this.http
      .get<TransactionsResponse>(
        `${LUNCH_MONEY_API_BASE}/transactions`,
        this.createRequestOptions(params)
      )
      .pipe(
        map(response => {
          // Filter uncategorized transactions client-side.
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
