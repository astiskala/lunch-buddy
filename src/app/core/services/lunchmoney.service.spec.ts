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
  const baseUrl = 'https://api.lunchmoney.dev/v2';

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
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      api_key_label: null,
      account_id: 1,
      budget_name: 'Primary',
      primary_currency: 'usd',
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
        archived_at: null,
        updated_at: '2025-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        is_group: false,
        group_id: null,
        order: 1,
        collapsed: false,
      },
    ];

    service.getCategories().subscribe(categories => {
      expect(categories).toEqual(mockCategories);
    });

    const req = httpMock.expectOne(`${baseUrl}/categories?format=flattened`);
    expect(req.request.method).toBe('GET');
    req.flush({ categories: mockCategories });
  });

  it('should merge summary data with categories', () => {
    const mockCategories = [
      {
        id: 1,
        name: 'Food',
        description: null,
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        archived: false,
        archived_at: null,
        updated_at: '2025-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        is_group: false,
        group_id: null,
        order: 1,
        collapsed: false,
      },
    ];
    const mockSummary = {
      aligned: true,
      categories: [
        {
          category_id: 1,
          totals: {
            other_activity: 100,
            recurring_activity: 50,
            budgeted: 300,
            available: 150,
            recurring_remaining: 0,
            recurring_expected: 20,
          },
          occurrences: [
            {
              current: true,
              start_date: '2025-11-01',
              end_date: '2025-11-30',
              other_activity: 100,
              recurring_activity: 50,
              budgeted: 300,
              budgeted_amount: '300.0000',
              budgeted_currency: 'usd',
              notes: null,
            },
          ],
        },
      ],
    };

    service.getBudgetSummary('2025-11-01', '2025-11-30').subscribe(budget => {
      expect(budget).toEqual([
        {
          category_id: 1,
          category_name: 'Food',
          category_group_name: null,
          group_id: null,
          is_group: false,
          is_income: false,
          exclude_from_budget: false,
          exclude_from_totals: false,
          totals: mockSummary.categories[0].totals,
          occurrence: mockSummary.categories[0].occurrences[0],
          order: 1,
          archived: false,
        },
      ]);
    });

    const requests = httpMock.match(() => true);
    expect(requests.length).toBe(2);

    const summaryReq = requests.find(req =>
      req.request.urlWithParams.startsWith(`${baseUrl}/summary`)
    );
    const categoriesReq = requests.find(req =>
      req.request.urlWithParams.startsWith(`${baseUrl}/categories`)
    );

    expect(summaryReq).toBeDefined();
    expect(categoriesReq).toBeDefined();

    categoriesReq?.flush({ categories: mockCategories });
    summaryReq?.flush(mockSummary);
  });

  it('should get recurring expenses', () => {
    const mockRecurring = {
      recurring_items: [
        {
          id: 1,
          description: 'Streaming',
          status: 'reviewed' as const,
          transaction_criteria: {
            start_date: '2025-01-01',
            end_date: null,
            granularity: 'month' as const,
            quantity: 1,
            anchor_date: '2025-11-15',
            payee: 'Netflix',
            amount: '-15.99',
            to_base: -15.99,
            currency: 'usd',
            plaid_account_id: null,
            manual_account_id: null,
          },
          overrides: {
            payee: 'Netflix',
            notes: null,
            category_id: null,
          },
          matches: {
            expected_occurrence_dates: ['2025-11-15'],
          },
        },
      ],
    };

    service
      .getRecurringExpenses('2025-11-01', '2025-11-30')
      .subscribe(expenses => {
        expect(expenses).toEqual([
          {
            id: 1,
            start_date: '2025-01-01',
            end_date: null,
            cadence: '1 month',
            status: 'reviewed',
            payee: 'Netflix',
            amount: '-15.99',
            currency: 'usd',
            description: 'Streaming',
            anchor_date: '2025-11-15',
            next_occurrence: '2025-11-15',
            type: 'cleared',
            category_id: null,
          },
        ]);
      });

    const req = httpMock.expectOne(
      `${baseUrl}/recurring_items?start_date=2025-11-01&end_date=2025-11-30`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockRecurring);
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
          to_base: -10,
          payee: 'Coffee',
          category_id: null,
          notes: null,
          recurring_id: null,
          plaid_account_id: null,
          manual_account_id: null,
          external_id: null,
          tag_ids: [],
          status: 'reviewed' as const,
          is_pending: false,
          created_at: '2025-11-01T00:00:00Z',
          updated_at: '2025-11-01T00:00:00Z',
          is_parent: false,
          parent_id: null,
          is_group: false,
          group_id: null,
          children: [],
          files: [],
          source: null,
        },
        {
          id: 2,
          date: '2025-11-02',
          amount: '-20.00',
          currency: 'USD',
          to_base: -20,
          payee: 'Groceries',
          category_id: 5,
          notes: null,
          recurring_id: null,
          plaid_account_id: null,
          manual_account_id: null,
          external_id: null,
          tag_ids: [],
          status: 'reviewed' as const,
          is_pending: false,
          created_at: '2025-11-02T00:00:00Z',
          updated_at: '2025-11-02T00:00:00Z',
          is_parent: false,
          parent_id: null,
          is_group: false,
          group_id: null,
          children: [],
          files: [],
          source: null,
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
    expect(req.request.params.get('status')).toBe('reviewed');
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
