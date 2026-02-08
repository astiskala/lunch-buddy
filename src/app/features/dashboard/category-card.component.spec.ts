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
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';

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
  let mockLunchmoneyService: SpyObj<LunchMoneyService>;
  const decemberWindowInputs = {
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    monthProgressRatio: 0.5,
    defaultCurrency: 'USD',
    referenceDate: new Date('2025-12-10T00:00:00.000Z'),
  } as const;

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

  const buildRecurringInstance = (
    expenseOverrides: Partial<RecurringInstance['expense']> = {},
    occurrenceDate = new Date('2025-10-05T00:00:00.000Z')
  ): RecurringInstance => {
    const occurrenceIsoDate = occurrenceDate.toISOString().slice(0, 10);
    const type = expenseOverrides.type ?? 'cleared';
    const status =
      expenseOverrides.status ??
      (type === 'cleared' ? 'reviewed' : 'suggested');

    return {
      expense: {
        id: 1,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Nest Aware',
        amount: '12.00',
        to_base: 12,
        currency: 'USD',
        description: null,
        anchor_date: occurrenceIsoDate,
        next_occurrence: occurrenceIsoDate,
        category_id: mockItem.categoryId,
        ...expenseOverrides,
        type,
        status,
      },
      occurrenceDate,
    };
  };

  const expandCard = (): HTMLElement => {
    const hostElement = fixture.nativeElement as HTMLElement;
    const card = hostElement.querySelector<HTMLElement>('.category-card');
    expect(card).not.toBeNull();
    card?.click();
    fixture.detectChanges();
    return hostElement;
  };

  const expectOnlyTransactionEntries = (hostElement: HTMLElement): void => {
    expect(hostElement.querySelectorAll('.badge.upcoming').length).toBe(0);

    const activityEntries = component.activityEntries();
    expect(
      activityEntries.filter(entry => entry.kind === 'upcoming').length
    ).toBe(0);
    expect(
      activityEntries.filter(entry => entry.kind === 'transaction').length
    ).toBe(1);
  };

  const setupChargedRecurringScenario = (options: {
    transaction: Partial<Transaction>;
    recurringExpense: Partial<RecurringInstance['expense']>;
    occurrenceDate?: Date;
    inputs?: Omit<
      ComponentInputs,
      'item' | 'recurringExpenses' | 'includeAllTransactions'
    >;
  }): HTMLElement => {
    const itemWithTransaction: BudgetProgress = {
      ...mockItem,
      transactionList: [buildTransaction(options.transaction)],
    };

    setupComponent(fixture, {
      item: itemWithTransaction,
      recurringExpenses: [
        buildRecurringInstance(
          options.recurringExpense,
          options.occurrenceDate ?? new Date('2025-10-05T00:00:00.000Z')
        ),
      ],
      includeAllTransactions: true,
      ...options.inputs,
    });

    return expandCard();
  };

  beforeEach(async () => {
    mockLunchmoneyService = createSpyObj<LunchMoneyService>(
      'LunchMoneyService',
      ['getCategoryTransactions']
    );
    mockLunchmoneyService.getCategoryTransactions.mockReturnValue(
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
    expect(compiled.querySelector('app-progress-bar')).toBeTruthy();
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
    setupComponent(fixture, {
      item: mockItem,
      monthProgressRatio: 0.75,
    });

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

    const upcomingEntry: TestActivityEntry = {
      ...expenseEntry,
      kind: 'upcoming',
    };

    setupComponent(fixture, { item: mockItem });
    expect(component.getAmountColor(expenseEntry)).toBe('error');

    const incomeItem: BudgetProgress = {
      ...mockItem,
      isIncome: true,
    };
    const incomeEntry: TestActivityEntry = {
      ...expenseEntry,
      id: 'txn-2',
      label: 'Paycheck',
      amount: 42,
    };
    setupComponent(fixture, { item: incomeItem });
    expect(component.getAmountColor(incomeEntry)).toBe('success');
    expect(component.getAmountColor(upcomingEntry)).toBe('warning');
  });

  it('groups activity entries by date', () => {
    const txn1 = buildTransaction({
      id: 10,
      date: '2025-10-05',
      amount: '-12.00',
      to_base: -12,
    });
    const txn2 = buildTransaction({
      id: 11,
      date: '2025-10-05',
      amount: '-5.00',
      to_base: -5,
    });
    const txn3 = buildTransaction({
      id: 12,
      date: '2025-10-02',
      amount: '-8.00',
      to_base: -8,
    });

    const itemWithTxns: BudgetProgress = {
      ...mockItem,
      transactionList: [txn1, txn2, txn3],
    };

    setupComponent(fixture, {
      item: itemWithTxns,
      referenceDate: new Date('2025-10-10T00:00:00.000Z'),
    });

    const groups = component.activityGroups();
    expect(groups.length).toBe(2);
    expect(groups[0].entries.length).toBe(2);
    expect(groups[1].entries.length).toBe(1);

    const firstGroupDates = new Set(
      groups[0].entries.map(entry => entry.date?.getTime() ?? 0)
    );
    expect(firstGroupDates.size).toBe(1);

    const groupTimes = groups.map(
      group => group.entries[0].date?.getTime() ?? -Infinity
    );
    expect(groupTimes[0]).toBeGreaterThan(groupTimes[1]);
  });

  it('shows original amount when transaction currency differs', () => {
    const foreignTxn = buildTransaction({
      id: 55,
      date: '2025-10-03',
      amount: '-20.00',
      currency: 'SGD',
      to_base: -15,
    });

    const itemWithTxn: BudgetProgress = {
      ...mockItem,
      transactionList: [foreignTxn],
    };

    setupComponent(fixture, {
      item: itemWithTxn,
      defaultCurrency: 'AUD',
      referenceDate: new Date('2025-10-10T00:00:00.000Z'),
    });

    const entry = component.activityEntries()[0];
    expect(component.shouldShowOriginalAmount(entry)).toBe(true);
    const formatted = component.formatOriginalAmount(entry);
    expect(formatted).toContain('SGD');
  });

  it('should toggle details when clicked', () => {
    setupComponent(fixture, { item: mockItem });

    expect(component.showDetails()).toBe(false);

    const hostElement = fixture.nativeElement as HTMLElement;
    const card = hostElement.querySelector<HTMLElement>('.category-card');
    expect(card).not.toBeNull();
    card?.click();
    fixture.detectChanges();

    expect(component.showDetails()).toBe(true);
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

    expect(component.showDetails()).toBe(false);
  });

  it('includes cleared recurring instances from the current window in upcoming totals', () => {
    const occurrenceDate = new Date('2025-10-15T00:00:00.000Z');
    const instances = [
      buildRecurringInstance(
        {
          id: 1,
          type: 'suggested',
          amount: '300',
          to_base: 300,
          payee: 'Ministry of Manpower',
        },
        occurrenceDate
      ),
      buildRecurringInstance(
        {
          id: 2,
          type: 'cleared',
          amount: '900',
          to_base: 900,
          payee: 'Nelda Aguinaldo',
        },
        occurrenceDate
      ),
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
    const pastInstance = buildRecurringInstance(
      {
        id: 9,
        payee: 'Nest Aware',
        amount: '12.00',
        to_base: 12,
      },
      new Date('2025-10-05T00:00:00.000Z')
    );

    setupComponent(fixture, {
      item: mockItem,
      referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      recurringExpenses: [pastInstance],
      includeAllTransactions: true,
    });

    const hostElement = expandCard();

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
    const hostElement = setupChargedRecurringScenario({
      transaction: {
        id: 999,
        amount: '12.00',
        to_base: 12,
        recurring_id: recurringId,
        date: '2025-10-05',
        payee: 'Nest Aware',
      },
      recurringExpense: {
        id: recurringId,
        payee: 'Nest Aware',
        amount: '12.00',
        to_base: 12,
      },
      occurrenceDate: new Date('2025-10-05T00:00:00.000Z'),
      inputs: {
        referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      },
    });

    expectOnlyTransactionEntries(hostElement);
  });

  it('omits recurring entries when a matching transaction exists without a recurring id', () => {
    const hostElement = setupChargedRecurringScenario({
      transaction: {
        id: 1000,
        amount: '15.00',
        to_base: 15,
        recurring_id: null,
        date: '2025-10-06',
        payee: 'Nest Aware',
      },
      recurringExpense: {
        id: 77,
        payee: 'Nest Aware',
        amount: '15.00',
        to_base: 15,
      },
      occurrenceDate: new Date('2025-10-06T00:00:00.000Z'),
      inputs: {
        referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      },
    });

    expectOnlyTransactionEntries(hostElement);
  });

  it('omits recurring entries when transaction recurring_id is a string', () => {
    const recurringId = '1966261';
    const hostElement = setupChargedRecurringScenario({
      transaction: {
        id: 1234,
        amount: '15.00',
        to_base: 12.85,
        recurring_id: recurringId as unknown as number, // simulate stringly value
        date: '2025-12-05',
        payee: 'Google',
      },
      recurringExpense: {
        id: Number(recurringId),
        payee: 'Google',
        amount: '11.50',
        to_base: 12.85,
        currency: 'SGD',
        description: 'Nest Aware',
      },
      occurrenceDate: new Date('2025-12-05T00:00:00.000Z'),
      inputs: decemberWindowInputs,
    });

    expectOnlyTransactionEntries(hostElement);
  });

  it('matches transactions to recurring entries when amounts differ due to currency', () => {
    const hostElement = setupChargedRecurringScenario({
      transaction: {
        id: 2001,
        amount: '15.00',
        to_base: 12.85,
        recurring_id: null,
        date: '2025-12-05',
        payee: 'Google',
      },
      recurringExpense: {
        id: 9999,
        payee: 'Google',
        amount: '11.50',
        to_base: 11.5,
        currency: 'SGD',
        description: 'Nest Aware',
      },
      occurrenceDate: new Date('2025-12-05T00:00:00.000Z'),
      inputs: decemberWindowInputs,
    });

    expectOnlyTransactionEntries(hostElement);
  });

  it('treats found transactions as charged and hides upcoming entry', () => {
    const chargedInstance = buildRecurringInstance(
      {
        id: 8888,
        payee: 'Google',
        amount: '11.50',
        to_base: 11.5,
        currency: 'SGD',
        description: 'Nest Aware',
        found_transactions: [
          { date: '2025-12-05', transaction_id: 2328343028 },
        ],
      },
      new Date('2025-12-05T00:00:00.000Z')
    );

    setupComponent(fixture, {
      item: mockItem,
      ...decemberWindowInputs,
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = expandCard();

    const upcomingBadges = hostElement.querySelectorAll('.badge.upcoming');
    expect(upcomingBadges.length).toBe(0);
    expect(
      component.activityEntries().filter(entry => entry.kind === 'upcoming')
        .length
    ).toBe(0);
  });

  it('renders found transactions as regular activity when no fetched txn exists', () => {
    const chargedInstance = buildRecurringInstance(
      {
        id: 4242,
        payee: 'Google',
        amount: '11.50',
        to_base: 11.5,
        currency: 'SGD',
        description: 'Nest Aware',
        found_transactions: [
          { date: '2025-12-05', transaction_id: 2328343028 },
        ],
      },
      new Date('2025-12-05T00:00:00.000Z')
    );

    setupComponent(fixture, {
      item: mockItem,
      ...decemberWindowInputs,
      recurringExpenses: [chargedInstance],
      includeAllTransactions: true,
    });

    const hostElement = expandCard();

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
    const futureCleared = buildRecurringInstance(
      {
        id: 5,
        payee: 'Upcoming Tax',
        amount: '200',
        to_base: 200,
      },
      new Date('2025-10-25T00:00:00.000Z')
    );

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
