import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  LunchMoneyUser,
  LunchMoneyCategory,
  BudgetSummaryItem,
  TransactionsResponse,
  RecurringExpense,
} from '../models/lunchmoney.types';

const LUNCH_MONEY_API_BASE = 'https://dev.lunchmoney.app/v1';

@Injectable({
  providedIn: 'root',
})
export class LunchMoneyService {
  private http = inject(HttpClient);

  /**
   * Get user information
   */
  getUser(): Observable<LunchMoneyUser> {
    return this.http.get<LunchMoneyUser>(`${LUNCH_MONEY_API_BASE}/me`);
  }

  /**
   * Get all categories
   */
  getCategories(): Observable<LunchMoneyCategory[]> {
    return this.http.get<{ categories: LunchMoneyCategory[] }>(
      `${LUNCH_MONEY_API_BASE}/categories`
    ).pipe(
      map(response => response.categories)
    );
  }

  /**
   * Get budget summary for a specific date range
   */
  getBudgetSummary(startDate: string, endDate: string): Observable<BudgetSummaryItem[]> {
    const params = new HttpParams()
      .set('start_date', startDate)
      .set('end_date', endDate);

    return this.http.get<BudgetSummaryItem[]>(`${LUNCH_MONEY_API_BASE}/budgets`, {
      params,
    });
  }

  /**
   * Get recurring expenses
   */
  getRecurringExpenses(monthStart: string): Observable<RecurringExpense[]> {
    const params = new HttpParams()
      .set('start_date', monthStart)
      .set('debit_as_negative', 'true');

    return this.http.get<{ recurring_expenses: RecurringExpense[] }>(
      `${LUNCH_MONEY_API_BASE}/recurring_expenses`,
      { params }
    ).pipe(
      map(response => response.recurring_expenses)
    );
  }

  /**
   * Get transactions for a category
   */
  getCategoryTransactions(
    categoryId: number,
    startDate: string,
    endDate: string
  ): Observable<TransactionsResponse> {
    const params = new HttpParams()
      .set('category_id', categoryId.toString())
      .set('start_date', startDate)
      .set('end_date', endDate)
      .set('debit_as_negative', 'true')
      .set('status', 'cleared');

    return this.http.get<TransactionsResponse>(
      `${LUNCH_MONEY_API_BASE}/transactions`,
      { params }
    );
  }
}

