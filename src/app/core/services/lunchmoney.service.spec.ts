import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { LunchMoneyService } from './lunchmoney.service';

describe('LunchMoneyService', () => {
  let service: LunchMoneyService;
  let httpMock: HttpTestingController;
  const baseUrl = 'https://dev.lunchmoney.app/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        LunchMoneyService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
      ],
    });
    service = TestBed.inject(LunchMoneyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get user information', () => {
    const mockUser = {
      user_id: 1,
      user_name: 'Test User',
      user_email: 'test@example.com',
      api_key_label: null,
      account_id: 1,
      default_currency: 'USD',
    };

    service.getUser().subscribe(user => {
      expect(user).toEqual(mockUser);
    });

    const req = httpMock.expectOne(`${baseUrl}/me`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Cache-Control')).toBe(true);
    req.flush(mockUser);
  });

  it('should get categories', () => {
    const mockCategories = [
      {
        id: 1,
        name: 'Groceries',
        description: null,
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        archived: false,
        archived_on: null,
        updated_at: null,
        created_at: null,
        is_group: false,
        group_id: null,
        order: 1,
      },
    ];

    service.getCategories().subscribe(categories => {
      expect(categories).toEqual(mockCategories);
    });

    const req = httpMock.expectOne(`${baseUrl}/categories`);
    expect(req.request.method).toBe('GET');
    req.flush({ categories: mockCategories });
  });

  it('should get budget summary with date range', () => {
    const mockBudget = [
      {
        category_name: 'Food',
        category_id: 1,
        category_group_name: null,
        group_id: null,
        is_group: false,
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        order: 1,
        archived: false,
        data: {},
        config: null,
        recurring: null,
      },
    ];

    service.getBudgetSummary('2025-11-01', '2025-11-30').subscribe(budget => {
      expect(budget).toEqual(mockBudget);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/budgets?start_date=2025-11-01&end_date=2025-11-30`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockBudget);
  });

  it('should get recurring expenses', () => {
    const mockRecurring = [
      {
        id: 1,
        start_date: '2025-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Netflix',
        amount: '-15.99',
        currency: 'USD',
        description: 'Streaming',
        billing_date: '2025-11-15',
        type: 'cleared' as const,
        original_name: null,
        source: 'manual' as const,
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
        created_at: '2025-01-01',
      },
    ];

    service.getRecurringExpenses('2025-11-01').subscribe(expenses => {
      expect(expenses).toEqual(mockRecurring);
    });

    const req = httpMock.expectOne(
      `${baseUrl}/recurring_expenses?start_date=2025-11-01&debit_as_negative=true`
    );
    expect(req.request.method).toBe('GET');
    req.flush({ recurring_expenses: mockRecurring });
  });

  it('should include no-cache headers in all requests', () => {
    service.getUser().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/me`);
    expect(req.request.headers.get('Cache-Control')).toBe(
      'no-cache, no-store, max-age=0, must-revalidate'
    );
    expect(req.request.headers.get('Pragma')).toBe('no-cache');
    expect(req.request.headers.get('Expires')).toBe('0');
    expect(req.request.headers.get('If-Modified-Since')).toBe('0');
    req.flush({});
  });

  it('should filter uncategorized transactions client-side', () => {
    const mockResponse = {
      transactions: [
        {
          id: 1,
          date: '2025-11-01',
          amount: '-10.00',
          currency: 'USD',
          payee: 'Coffee',
          category_id: null,
          notes: null,
          recurring_id: null,
          recurring_payee: null,
          recurring_description: null,
          tags: [],
        },
        {
          id: 2,
          date: '2025-11-02',
          amount: '-20.00',
          currency: 'USD',
          payee: 'Groceries',
          category_id: 5,
          notes: null,
          recurring_id: null,
          recurring_payee: null,
          recurring_description: null,
          tags: [],
        },
      ],
      has_more: false,
    };

    service
      .getCategoryTransactions(null, '2025-11-01', '2025-11-30')
      .subscribe(response => {
        expect(response.transactions.length).toBe(1);
        expect(response.transactions[0].id).toBe(1);
        expect(response.has_more).toBe(false);
      });

    const req = httpMock.expectOne(request => {
      return request.url === `${baseUrl}/transactions`;
    });

    expect(req.request.params.get('start_date')).toBe('2025-11-01');
    expect(req.request.params.get('end_date')).toBe('2025-11-30');
    expect(req.request.params.get('debit_as_negative')).toBe('true');
    expect(req.request.params.has('category_id')).toBeFalse();
    req.flush(mockResponse);
  });

  it('should request only cleared transactions when includeAllTransactions is false', () => {
    const mockResponse = {
      transactions: [],
      has_more: false,
    };

    service
      .getCategoryTransactions(5, '2025-11-01', '2025-11-30', {
        includeAllTransactions: false,
      })
      .subscribe(response => {
        expect(response.transactions).toEqual([]);
      });

    const req = httpMock.expectOne(request => {
      return request.url === `${baseUrl}/transactions`;
    });

    expect(req.request.params.get('category_id')).toBe('5');
    expect(req.request.params.get('status')).toBe('cleared');
    req.flush(mockResponse);
  });

  it('should surface HTTP errors to the caller', () => {
    const expectedStatus = 500;
    let capturedError: HttpErrorResponse | undefined;

    service.getUser().subscribe({
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          capturedError = error;
        }
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/me`);
    req.flush('error', {
      status: expectedStatus,
      statusText: 'Server Error',
    });

    expect(capturedError).toBeDefined();
    expect(capturedError?.status).toBe(expectedStatus);
  });
});
