import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoryCardComponent } from './category-card.component';
import {
  BudgetProgress,
  RecurringInstance,
  Transaction,
} from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { of } from 'rxjs';

describe('CategoryCardComponent', () => {
  interface TestActivityEntry {
    id: string;
    kind: 'transaction' | 'upcoming';
    date: Date | null;
    label: string;
    notes: string | null;
    amount: number;
    currency: string | null;
  }

  interface ComponentInputs {
    item: BudgetProgress;
    startDate?: string;
    endDate?: string;
    monthProgressRatio?: number;
    defaultCurrency?: string;
    referenceDate?: Date;
    recurringExpenses?: RecurringInstance[];
    includeAllTransactions?: boolean;
  }

  const setupComponent = (
    fixture: ComponentFixture<CategoryCardComponent>,
    inputs: ComponentInputs
  ): void => {
    fixture.componentRef.setInput('item', inputs.item);
    fixture.componentRef.setInput(
      'startDate',
      inputs.startDate ?? '2025-10-01'
    );
    fixture.componentRef.setInput('endDate', inputs.endDate ?? '2025-10-31');
    fixture.componentRef.setInput(
      'monthProgressRatio',
      inputs.monthProgressRatio ?? 0.5
    );
    fixture.componentRef.setInput(
      'defaultCurrency',
      inputs.defaultCurrency ?? 'USD'
    );
    fixture.componentRef.setInput(
      'referenceDate',
      inputs.referenceDate ?? new Date('2025-10-10T00:00:00.000Z')
    );
    fixture.componentRef.setInput(
      'recurringExpenses',
      inputs.recurringExpenses ?? []
    );
    if (inputs.includeAllTransactions !== undefined) {
      fixture.componentRef.setInput(
        'includeAllTransactions',
        inputs.includeAllTransactions
      );
    }
    fixture.detectChanges();
  };

  const buildTransaction = (overrides: Partial<Transaction>): Transaction => ({
    id: 1,
    date: '2025-10-01',
    amount: '-10.00',
    currency: 'usd',
    to_base: -10,
    payee: 'Test',
    category_id: null,
    plaid_account_id: null,
    manual_account_id: null,
    external_id: null,
    tag_ids: [],
    notes: null,
    recurring_id: null,
    status: 'reviewed',
    is_pending: false,
    created_at: '2025-10-01T00:00:00Z',
    updated_at: '2025-10-01T00:00:00Z',
    is_parent: false,
    parent_id: null,
    is_group: false,
    group_id: null,
    children: [],
    plaid_metadata: null,
    custom_metadata: null,
    files: [],
    source: null,
    ...overrides,
  });

  it('should only show uncategorised income transactions in income group', () => {
    const incomeTxn = buildTransaction({
      id: 301,
      date: '2025-10-19',
      amount: '1641.88',
      currency: 'sgd',
      to_base: -1641.88,
      payee: 'DBS',
      notes: 'Credit Card Payment',
    });
    const expenseTxn = buildTransaction({
      id: 302,
      date: '2025-10-19',
      amount: '100.00',
      currency: 'sgd',
      to_base: 100,
      payee: 'Food',
      notes: 'Lunch',
    });
    const incomeItem: BudgetProgress = {
      ...mockItem,
      isIncome: true,
      spent: -1641.88,
      budgetAmount: 2000,
      transactionList: [incomeTxn],
      categoryName: 'Uncategorised Income',
    };
    const expenseItem: BudgetProgress = {
      ...mockItem,
      isIncome: false,
      spent: 100,
      budgetAmount: 2000,
      transactionList: [expenseTxn],
      categoryName: 'Uncategorised Expenses',
    };
    setupComponent(fixture, {
      item: incomeItem,
      defaultCurrency: 'SGD',
      referenceDate: new Date('2025-10-19T00:00:00.000Z'),
    });
    expect(component.activityEntries().length).toBe(1);
    expect(component.activityEntries()[0].amount).toBeCloseTo(1641.88, 2);
    setupComponent(fixture, {
      item: expenseItem,
      defaultCurrency: 'SGD',
      referenceDate: new Date('2025-10-19T00:00:00.000Z'),
    });
    expect(component.activityEntries().length).toBe(1);
    expect(component.activityEntries()[0].amount).toBeCloseTo(100, 2);
  });
  let component: CategoryCardComponent;
  let fixture: ComponentFixture<CategoryCardComponent>;
  let mockLunchmoneyService: jasmine.SpyObj<LunchMoneyService>;

  const mockItem: BudgetProgress = {
    categoryId: 1,
    categoryName: 'Groceries',
    categoryGroupName: null,
    groupId: null,
    isGroup: false,
    isIncome: false,
    excludeFromBudget: false,
    budgetAmount: 1000,
    budgetCurrency: 'USD',
    spent: 500,
    remaining: 500,
    monthKey: '2025-10',
    numTransactions: 5,
    isAutomated: false,
    recurringTotal: 300,
    recurringItems: [],
    progressRatio: 0.5,
    status: 'on-track',
  };

  beforeEach(async () => {
    mockLunchmoneyService = jasmine.createSpyObj<LunchMoneyService>(
      'LunchMoneyService',
      ['getCategoryTransactions']
    );
    mockLunchmoneyService.getCategoryTransactions.and.returnValue(
      of({ transactions: [], total: 0, has_more: false })
    );

    await TestBed.configureTestingModule({
      imports: [CategoryCardComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: LunchMoneyService,
          useValue: mockLunchmoneyService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display category name', () => {
    setupComponent(fixture, { item: mockItem });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Groceries');
  });

  it('should display budget information', () => {
    setupComponent(fixture, { item: mockItem });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.progress-bar')).toBeTruthy();
  });

  it('should show received label for income categories', () => {
    const incomeItem: BudgetProgress = {
      ...mockItem,
      isIncome: true,
      spent: -650,
      budgetAmount: 1000,
    };

    setupComponent(fixture, { item: incomeItem });

    const compiled = fixture.nativeElement as HTMLElement;
    const label = (
      compiled.querySelector('.metrics .metric .label')?.textContent ?? ''
    ).trim();
    expect(label).toBe('Received');
    const value =
      compiled.querySelector('.metrics .metric .value')?.textContent ?? '';
    expect(value).toContain('$650.00');
  });

  it('should compute remaining using absolute values for income categories', () => {
    const incomeItem: BudgetProgress = {
      ...mockItem,
      isIncome: true,
      spent: -400,
      budgetAmount: 1000,
    };

    setupComponent(fixture, { item: incomeItem });

    // Should invert sign for income
    expect(component.remainingAfterUpcoming()).toBeCloseTo(-600, 5);
  });

  it('should show correct status class', () => {
    setupComponent(fixture, { item: mockItem });

    const compiled = fixture.nativeElement as HTMLElement;
    expect(
      compiled.querySelector('.category-card[data-status="on-track"]')
    ).toBeTruthy();
  });

  it('should calculate month progress percent', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.75);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput(
      'referenceDate',
      new Date('2025-10-10T00:00:00.000Z')
    );
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    expect(component.monthProgressPercent()).toBe(75);
  });

  it('should show expenses in red and income in green', () => {
    const expenseEntry: TestActivityEntry = {
      id: 'txn-1',
      kind: 'transaction',
      date: new Date('2025-10-01T00:00:00.000Z'),
      label: 'Dinner',
      notes: null,
      amount: 42,
      currency: 'USD',
    };

    const incomeEntry: TestActivityEntry = {
      ...expenseEntry,
      id: 'txn-2',
      label: 'Paycheck',
      amount: -42,
    };

    const upcomingEntry: TestActivityEntry = {
      ...expenseEntry,
      kind: 'upcoming',
    };

    expect(component.getAmountColor(expenseEntry)).toBe('error');
    expect(component.getAmountColor(incomeEntry)).toBe('success');
    expect(component.getAmountColor(upcomingEntry)).toBe('warning');
  });

  it('should toggle details when clicked', () => {
    setupComponent(fixture, { item: mockItem });

    expect(component.showDetails()).toBeFalse();

    const hostElement = fixture.nativeElement as HTMLElement;
    const card = hostElement.querySelector<HTMLElement>('.category-card');
    expect(card).not.toBeNull();
    card?.click();
    fixture.detectChanges();

    expect(component.showDetails()).toBeTrue();
  });

  it('should collapse when clicking details on expanded card', () => {
    setupComponent(fixture, { item: mockItem });

    const hostElement = fixture.nativeElement as HTMLElement;
    const card = hostElement.querySelector<HTMLElement>('.category-card');
    expect(card).not.toBeNull();
    card?.click();
    fixture.detectChanges();

    const details = hostElement.querySelector<HTMLElement>('.details');
    expect(details).not.toBeNull();
    details?.click();
    fixture.detectChanges();

    expect(component.showDetails()).toBeFalse();
  });

  it('includes cleared recurring instances from the current window in upcoming totals', () => {
    const createInstance = (
      id: number,
      type: 'cleared' | 'suggested',
      amount: string,
      payee: string
    ): RecurringInstance => ({
      expense: {
        id,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee,
        amount,
        to_base: Number.parseFloat(amount),
        currency: 'USD',
        description: null,
        anchor_date: '2025-10-15',
        next_occurrence: '2025-10-15',
        type,
        status: type === 'cleared' ? 'reviewed' : 'suggested',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-10-15T00:00:00.000Z'),
    });

    const instances = [
      createInstance(1, 'suggested', '300', 'Ministry of Manpower'),
      createInstance(2, 'cleared', '900', 'Nelda Aguinaldo'),
    ];

    setupComponent(fixture, {
      item: mockItem,
      referenceDate: new Date('2025-10-20T00:00:00.000Z'),
      recurringExpenses: instances,
    });

    expect(component.upcomingRecurringTotal()).toBeCloseTo(1200);

    const upcomingEntries = component
      .activityEntries()
      .filter(entry => entry.kind === 'upcoming');
    expect(upcomingEntries.length).toBe(2);
  });

  it('shows past-window recurring instances as due when not yet charged', () => {
    const pastInstance: RecurringInstance = {
      expense: {
        id: 9,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Nest Aware',
        amount: '12.00',
        to_base: 12,
        currency: 'USD',
        description: null,
        anchor_date: '2025-10-05',
        next_occurrence: '2025-10-05',
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-10-05T00:00:00.000Z'),
    };

    setupComponent(fixture, {
      item: mockItem,
      referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      recurringExpenses: [pastInstance],
      includeAllTransactions: true,
    });

    // Expand details to render activity
    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const badgeText =
      hostElement.querySelector<HTMLElement>('.badge.upcoming')?.textContent ??
      '';
    expect(badgeText).toContain('Due');

    const amountColor =
      hostElement.querySelector<HTMLElement>('.activity-amount')?.dataset[
        'color'
      ];
    expect(amountColor).toBe('warning');
  });

  it('omits recurring entries that already have a matching charged transaction', () => {
    const recurringId = 55;
    const chargedTxn = buildTransaction({
      id: 999,
      amount: '12.00',
      to_base: 12,
      recurring_id: recurringId,
      date: '2025-10-05',
      payee: 'Nest Aware',
    });

    const chargedInstance: RecurringInstance = {
      expense: {
        id: recurringId,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Nest Aware',
        amount: '12.00',
        to_base: 12,
        currency: 'USD',
        description: null,
        anchor_date: '2025-10-05',
        next_occurrence: '2025-10-05',
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-10-05T00:00:00.000Z'),
    };

    const itemWithTxn: BudgetProgress = {
      ...mockItem,
      transactionList: [chargedTxn],
    };

    setupComponent(fixture, {
      item: itemWithTxn,
      referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    // Expand details to render activity
    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const upcomingBadges = hostElement.querySelectorAll('.badge.upcoming');
    expect(upcomingBadges.length).toBe(0);

    const activityEntries = component.activityEntries();
    expect(
      activityEntries.filter(entry => entry.kind === 'upcoming').length
    ).toBe(0);
    expect(
      activityEntries.filter(entry => entry.kind === 'transaction').length
    ).toBe(1);
  });

  it('omits recurring entries when a matching transaction exists without a recurring id', () => {
    const chargedTxn = buildTransaction({
      id: 1000,
      amount: '15.00',
      to_base: 15,
      recurring_id: null,
      date: '2025-10-06',
      payee: 'Nest Aware',
    });

    const chargedInstance: RecurringInstance = {
      expense: {
        id: 77,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Nest Aware',
        amount: '15.00',
        to_base: 15,
        currency: 'USD',
        description: null,
        anchor_date: '2025-10-06',
        next_occurrence: '2025-10-06',
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-10-06T00:00:00.000Z'),
    };

    const itemWithTxn: BudgetProgress = {
      ...mockItem,
      transactionList: [chargedTxn],
    };

    setupComponent(fixture, {
      item: itemWithTxn,
      referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const upcomingBadges = hostElement.querySelectorAll('.badge.upcoming');
    expect(upcomingBadges.length).toBe(0);

    const activityEntries = component.activityEntries();
    expect(
      activityEntries.filter(entry => entry.kind === 'upcoming').length
    ).toBe(0);
    expect(
      activityEntries.filter(entry => entry.kind === 'transaction').length
    ).toBe(1);
  });

  it('omits recurring entries when transaction recurring_id is a string', () => {
    const recurringId = '1966261';
    const chargedTxn = buildTransaction({
      id: 1234,
      amount: '15.00',
      to_base: 12.85,
      recurring_id: recurringId as unknown as number, // simulate stringly value
      date: '2025-12-05',
      payee: 'Google',
    });

    const chargedInstance: RecurringInstance = {
      expense: {
        id: Number(recurringId),
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Google',
        amount: '11.50',
        to_base: 12.85,
        currency: 'SGD',
        description: 'Nest Aware',
        anchor_date: '2025-12-05',
        next_occurrence: '2025-12-05',
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-12-05T00:00:00.000Z'),
    };

    const itemWithTxn: BudgetProgress = {
      ...mockItem,
      transactionList: [chargedTxn],
    };

    setupComponent(fixture, {
      item: itemWithTxn,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      monthProgressRatio: 0.5,
      defaultCurrency: 'USD',
      referenceDate: new Date('2025-12-10T00:00:00.000Z'),
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const upcomingBadges = hostElement.querySelectorAll('.badge.upcoming');
    expect(upcomingBadges.length).toBe(0);

    const activityEntries = component.activityEntries();
    expect(
      activityEntries.filter(entry => entry.kind === 'upcoming').length
    ).toBe(0);
    expect(
      activityEntries.filter(entry => entry.kind === 'transaction').length
    ).toBe(1);
  });

  it('matches transactions to recurring entries when amounts differ due to currency', () => {
    const chargedTxn = buildTransaction({
      id: 2001,
      amount: '15.00',
      to_base: 12.85,
      recurring_id: null,
      date: '2025-12-05',
      payee: 'Google',
    });

    const chargedInstance: RecurringInstance = {
      expense: {
        id: 9999,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Google',
        amount: '11.50',
        to_base: 11.5,
        currency: 'SGD',
        description: 'Nest Aware',
        anchor_date: '2025-12-05',
        next_occurrence: '2025-12-05',
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-12-05T00:00:00.000Z'),
    };

    const itemWithTxn: BudgetProgress = {
      ...mockItem,
      transactionList: [chargedTxn],
    };

    setupComponent(fixture, {
      item: itemWithTxn,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      monthProgressRatio: 0.5,
      defaultCurrency: 'USD',
      referenceDate: new Date('2025-12-10T00:00:00.000Z'),
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const upcomingBadges = hostElement.querySelectorAll('.badge.upcoming');
    expect(upcomingBadges.length).toBe(0);
    const activityEntries = component.activityEntries();
    expect(
      activityEntries.filter(entry => entry.kind === 'upcoming').length
    ).toBe(0);
    expect(
      activityEntries.filter(entry => entry.kind === 'transaction').length
    ).toBe(1);
  });

  it('treats found transactions as charged and hides upcoming entry', () => {
    const chargedInstance: RecurringInstance = {
      expense: {
        id: 8888,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Google',
        amount: '11.50',
        to_base: 11.5,
        currency: 'SGD',
        description: 'Nest Aware',
        anchor_date: '2025-12-05',
        next_occurrence: '2025-12-05',
        found_transactions: [
          { date: '2025-12-05', transaction_id: 2328343028 },
        ],
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-12-05T00:00:00.000Z'),
    };

    setupComponent(fixture, {
      item: mockItem,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      monthProgressRatio: 0.5,
      defaultCurrency: 'USD',
      referenceDate: new Date('2025-12-10T00:00:00.000Z'),
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const upcomingBadges = hostElement.querySelectorAll('.badge.upcoming');
    expect(upcomingBadges.length).toBe(0);
    expect(
      component.activityEntries().filter(entry => entry.kind === 'upcoming')
        .length
    ).toBe(0);
  });

  it('renders found transactions as regular activity when no fetched txn exists', () => {
    const chargedInstance: RecurringInstance = {
      expense: {
        id: 4242,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Google',
        amount: '11.50',
        to_base: 11.5,
        currency: 'SGD',
        description: 'Nest Aware',
        anchor_date: '2025-12-05',
        next_occurrence: '2025-12-05',
        found_transactions: [
          { date: '2025-12-05', transaction_id: 2328343028 },
        ],
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-12-05T00:00:00.000Z'),
    };

    setupComponent(fixture, {
      item: mockItem,
      startDate: '2025-12-01',
      endDate: '2025-12-31',
      monthProgressRatio: 0.5,
      defaultCurrency: 'USD',
      referenceDate: new Date('2025-12-10T00:00:00.000Z'),
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = fixture.nativeElement as HTMLElement;
    hostElement.querySelector<HTMLElement>('.category-card')?.click();
    fixture.detectChanges();

    const activityEntries = component.activityEntries();
    expect(
      activityEntries.filter(entry => entry.kind === 'upcoming').length
    ).toBe(0);
    expect(
      activityEntries.filter(entry => entry.kind === 'transaction').length
    ).toBe(1);
    const badge = hostElement.querySelector<HTMLElement>('.badge.upcoming');
    expect(badge).toBeNull();
  });

  it('should retain future cleared instances as upcoming', () => {
    const futureCleared: RecurringInstance = {
      expense: {
        id: 5,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Upcoming Tax',
        amount: '200',
        to_base: 200,
        currency: 'USD',
        description: null,
        anchor_date: '2025-10-25',
        next_occurrence: '2025-10-25',
        type: 'cleared',
        status: 'reviewed',
        category_id: mockItem.categoryId,
      },
      occurrenceDate: new Date('2025-10-25T00:00:00.000Z'),
    };

    setupComponent(fixture, {
      item: mockItem,
      startDate: '2025-10-01',
      endDate: '2025-10-31',
      monthProgressRatio: 0.5,
      defaultCurrency: 'USD',
      referenceDate: new Date('2025-10-05T00:00:00.000Z'),
      recurringExpenses: [futureCleared],
    });

    expect(component.upcomingRecurringTotal()).toBeCloseTo(200);
    const upcomingEntries = component
      .activityEntries()
      .filter(entry => entry.kind === 'upcoming');
    expect(upcomingEntries.length).toBe(1);
    expect(upcomingEntries[0].label).toContain('Upcoming Tax');
  });
});
