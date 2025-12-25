import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { RecurringExpensesPanelComponent } from './recurring-expenses-panel.component';
import { RecurringInstance } from '../../core/models/lunchmoney.types';

describe('RecurringExpensesPanelComponent', () => {
  let component: RecurringExpensesPanelComponent;
  let fixture: ComponentFixture<RecurringExpensesPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurringExpensesPanelComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(RecurringExpensesPanelComponent);
    component = fixture.componentInstance;
  });

  const buildInstance = (
    id: number,
    occurrence: string,
    overrides?: Partial<RecurringInstance['expense']>
  ): RecurringInstance => ({
    expense: {
      id,
      payee: 'Test',
      description: null,
      amount: '-10.00',
      to_base:
        overrides?.to_base ?? Number.parseFloat(overrides?.amount ?? '-10.00'),
      currency: 'USD',
      anchor_date: occurrence,
      next_occurrence: occurrence,
      type: 'cleared',
      status: 'reviewed',
      cadence: 'monthly',
      start_date: '2025-01-01',
      end_date: null,
      category_id: null,
      ...overrides,
    },
    occurrenceDate: new Date(occurrence),
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter and sort expenses by occurrence date', () => {
    const mockExpenses: RecurringInstance[] = [
      buildInstance(2, '2025-11-20', {
        payee: 'Later Expense',
        amount: '-20.00',
      }),
      buildInstance(1, '2025-11-15', {
        payee: 'Earlier Expense',
        amount: '-10.00',
      }),
    ];

    fixture.componentRef.setInput('expenses', mockExpenses);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));
    fixture.componentRef.setInput('windowStart', '2025-11-01');
    fixture.componentRef.setInput('windowEnd', '2025-11-30');
    fixture.detectChanges();

    const sorted = component.sortedExpenses();
    expect(sorted.length).toBe(2);
    expect(sorted[0].expense.id).toBe(1); // Earlier comes first
    expect(sorted[1].expense.id).toBe(2);
  });

  it('should calculate total formatted amount', () => {
    const mockExpenses: RecurringInstance[] = [
      buildInstance(1, '2025-11-15', { amount: '-15.50' }),
      buildInstance(2, '2025-11-20', { amount: '-10.50' }),
    ];

    fixture.componentRef.setInput('expenses', mockExpenses);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));
    fixture.componentRef.setInput('windowStart', '2025-11-01');
    fixture.componentRef.setInput('windowEnd', '2025-11-30');

    const total = component.totalFormatted();
    expect(total).toContain('26'); // 15.50 + 10.50
  });

  it('includes occurrences earlier in the current window', () => {
    const mockExpenses: RecurringInstance[] = [
      buildInstance(3, '2025-11-05', {
        amount: '-12.00',
        to_base: -12,
        payee: 'Nest Aware',
      }),
    ];

    fixture.componentRef.setInput('expenses', mockExpenses);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-10'));
    fixture.componentRef.setInput('windowStart', '2025-11-01');
    fixture.componentRef.setInput('windowEnd', '2025-11-30');
    fixture.detectChanges();

    expect(component.sortedExpenses().length).toBe(1);
    expect(component.totalFormatted()).toContain('12');
  });

  it('should get payee name', () => {
    const mockExpense = buildInstance(1, '2025-11-15', {
      payee: 'Netflix',
    });

    expect(component.getPayee(mockExpense)).toBe('Netflix');
  });

  it('should return default text for empty payee', () => {
    const mockExpense = buildInstance(1, '2025-11-15', {
      payee: '',
    });

    expect(component.getPayee(mockExpense)).toBe('Unnamed recurring expense');
  });

  it('should format date correctly', () => {
    const mockExpense = buildInstance(1, '2025-11-15');

    expect(component.getFormattedDate(mockExpense)).toBe('Nov 15');
  });

  it('should get description when available', () => {
    const mockExpense = buildInstance(1, '2025-11-15', {
      description: 'Monthly Subscription',
    });

    expect(component.getDescription(mockExpense)).toBe('Monthly Subscription');
  });

  it('should return null for null description', () => {
    const mockExpense = buildInstance(1, '2025-11-15', {
      description: null,
    });

    expect(component.getDescription(mockExpense)).toBeNull();
  });

  it('should format amount with currency', () => {
    const mockExpense = buildInstance(1, '2025-11-15', {
      amount: '-25.99',
      currency: 'EUR',
    });

    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('windowStart', '2025-11-01');
    fixture.componentRef.setInput('windowEnd', '2025-11-30');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));
    const formatted = component.getFormattedAmount(mockExpense);
    expect(formatted).toContain('25.99');
    expect(formatted).toContain('USD');
    expect(formatted).not.toContain('EUR');
  });

  it('should handle empty expenses list', () => {
    fixture.componentRef.setInput('expenses', []);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));
    fixture.componentRef.setInput('windowStart', '2025-11-01');
    fixture.componentRef.setInput('windowEnd', '2025-11-30');
    fixture.detectChanges();

    expect(component.sortedExpenses().length).toBe(0);
    expect(component.totalFormatted()).toContain('0');
  });

  it('filters out expenses with found transactions', () => {
    const mockExpenses: RecurringInstance[] = [
      buildInstance(3, '2025-11-10', {
        amount: '-12.00',
      }),
    ];
    mockExpenses[0].expense.found_transactions = [
      { date: '2025-11-10', transaction_id: 555 },
    ];

    fixture.componentRef.setInput('expenses', mockExpenses);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-12'));
    fixture.componentRef.setInput('windowStart', '2025-11-01');
    fixture.componentRef.setInput('windowEnd', '2025-11-30');
    fixture.detectChanges();

    expect(component.sortedExpenses().length).toBe(0);
  });
});
