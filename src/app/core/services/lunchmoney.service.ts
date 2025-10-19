import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  LunchMoneyUser,
  LunchMoneyCategory,
  BudgetSummaryItem,
  TransactionsResponse,
  RecurringExpense,
} from '../models/lunchmoney.types';
import { environment } from '../../../environments/environment';

const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/+$/, '');

const LUNCH_MONEY_API_BASE = normalizeBaseUrl(
  environment.lunchmoneyApiBase,
);

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
      this.createRequestOptions(),
    );
  }

  /**
   * Get all categories
   */
  getCategories(): Observable<LunchMoneyCategory[]> {
    return this.http
      .get<{ categories: LunchMoneyCategory[] }>(
        `${LUNCH_MONEY_API_BASE}/categories`,
        this.createRequestOptions(),
      )
      .pipe(map((response) => response.categories));
  }

  /**
   * Get budget summary for a specific date range
   */
  getBudgetSummary(startDate: string, endDate: string): Observable<BudgetSummaryItem[]> {
    const params = new HttpParams().set('start_date', startDate).set('end_date', endDate);

    return this.http.get<BudgetSummaryItem[]>(
      `${LUNCH_MONEY_API_BASE}/budgets`,
      this.createRequestOptions(params),
    );
  }

  /**
   * Get recurring expenses
   */
  getRecurringExpenses(monthStart: string): Observable<RecurringExpense[]> {
    const params = new HttpParams().set('start_date', monthStart).set('debit_as_negative', 'true');

    return this.http
      .get<{
        recurring_expenses: RecurringExpense[];
      }>(
        `${LUNCH_MONEY_API_BASE}/recurring_expenses`,
        this.createRequestOptions(params),
      )
      .pipe(map((response) => response.recurring_expenses));
  }

  /**
   * Get transactions for a category
   */
  getCategoryTransactions(
    categoryId: number,
    startDate: string,
    endDate: string,
    options?: { includeAllTransactions?: boolean },
  ): Observable<TransactionsResponse> {
    let params = new HttpParams()
      .set('category_id', categoryId.toString())
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('debit_as_negative', 'true');

    const includeAll = options?.includeAllTransactions ?? true;
    if (!includeAll) {
      params = params.set('status', 'cleared');
    }

    return this.http.get<TransactionsResponse>(
      `${LUNCH_MONEY_API_BASE}/transactions`,
      this.createRequestOptions(params),
    );
  }
}
