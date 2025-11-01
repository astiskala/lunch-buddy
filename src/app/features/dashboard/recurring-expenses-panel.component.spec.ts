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

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter and sort expenses by occurrence date', () => {
    const mockExpenses: RecurringInstance[] = [
      {
        expense: {
          id: 2,
          payee: 'Later Expense',
          description: null,
          amount: '-20.00',
          currency: 'USD',
          billing_date: '2025-11-20',
          type: 'cleared',
          cadence: 'monthly',
          start_date: '2025-01-01',
          end_date: null,
          created_at: '2025-01-01',
          original_name: null,
          source: 'manual',
          plaid_account_id: null,
          asset_id: null,
          category_id: null,
        },
        occurrenceDate: new Date('2025-11-20'),
      },
      {
        expense: {
          id: 1,
          payee: 'Earlier Expense',
          description: null,
          amount: '-10.00',
          currency: 'USD',
          billing_date: '2025-11-15',
          type: 'cleared',
          cadence: 'monthly',
          start_date: '2025-01-01',
          end_date: null,
          created_at: '2025-01-01',
          original_name: null,
          source: 'manual',
          plaid_account_id: null,
          asset_id: null,
          category_id: null,
        },
        occurrenceDate: new Date('2025-11-15'),
      },
    ];

    fixture.componentRef.setInput('expenses', mockExpenses);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));
    fixture.detectChanges();

    const sorted = component.sortedExpenses();
    expect(sorted.length).toBe(2);
    expect(sorted[0].expense.id).toBe(1); // Earlier comes first
    expect(sorted[1].expense.id).toBe(2);
  });

  it('should calculate total formatted amount', () => {
    const mockExpenses: RecurringInstance[] = [
      {
        expense: {
          id: 1,
          payee: 'Test',
          description: null,
          amount: '-15.50',
          currency: 'USD',
          billing_date: '2025-11-15',
          type: 'cleared',
          cadence: 'monthly',
          start_date: '2025-01-01',
          end_date: null,
          created_at: '2025-01-01',
          original_name: null,
          source: 'manual',
          plaid_account_id: null,
          asset_id: null,
          category_id: null,
        },
        occurrenceDate: new Date('2025-11-15'),
      },
      {
        expense: {
          id: 2,
          payee: 'Test2',
          description: null,
          amount: '-10.50',
          currency: 'USD',
          billing_date: '2025-11-20',
          type: 'cleared',
          cadence: 'monthly',
          start_date: '2025-01-01',
          end_date: null,
          created_at: '2025-01-01',
          original_name: null,
          source: 'manual',
          plaid_account_id: null,
          asset_id: null,
          category_id: null,
        },
        occurrenceDate: new Date('2025-11-20'),
      },
    ];

    fixture.componentRef.setInput('expenses', mockExpenses);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));

    const total = component.totalFormatted();
    expect(total).toContain('26'); // 15.50 + 10.50
  });

  it('should get payee name', () => {
    const mockExpense: RecurringInstance = {
      expense: {
        id: 1,
        payee: 'Netflix',
        description: null,
        amount: '-15.00',
        currency: 'USD',
        billing_date: '2025-11-15',
        type: 'cleared',
        cadence: 'monthly',
        start_date: '2025-01-01',
        end_date: null,
        created_at: '2025-01-01',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
      },
      occurrenceDate: new Date('2025-11-15'),
    };

    expect(component.getPayee(mockExpense)).toBe('Netflix');
  });

  it('should return default text for empty payee', () => {
    const mockExpense: RecurringInstance = {
      expense: {
        id: 1,
        payee: '',
        description: null,
        amount: '-15.00',
        currency: 'USD',
        billing_date: '2025-11-15',
        type: 'cleared',
        cadence: 'monthly',
        start_date: '2025-01-01',
        end_date: null,
        created_at: '2025-01-01',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
      },
      occurrenceDate: new Date('2025-11-15'),
    };

    expect(component.getPayee(mockExpense)).toBe('Unnamed recurring expense');
  });

  it('should format date correctly', () => {
    const mockExpense: RecurringInstance = {
      expense: {
        id: 1,
        payee: 'Test',
        description: null,
        amount: '-15.00',
        currency: 'USD',
        billing_date: '2025-11-15',
        type: 'cleared',
        cadence: 'monthly',
        start_date: '2025-01-01',
        end_date: null,
        created_at: '2025-01-01',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
      },
      occurrenceDate: new Date('2025-11-15'),
    };

    expect(component.getFormattedDate(mockExpense)).toBe('Nov 15');
  });

  it('should get description when available', () => {
    const mockExpense: RecurringInstance = {
      expense: {
        id: 1,
        payee: 'Test',
        description: 'Monthly Subscription',
        amount: '-15.00',
        currency: 'USD',
        billing_date: '2025-11-15',
        type: 'cleared',
        cadence: 'monthly',
        start_date: '2025-01-01',
        end_date: null,
        created_at: '2025-01-01',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
      },
      occurrenceDate: new Date('2025-11-15'),
    };

    expect(component.getDescription(mockExpense)).toBe('Monthly Subscription');
  });

  it('should return null for null description', () => {
    const mockExpense: RecurringInstance = {
      expense: {
        id: 1,
        payee: 'Test',
        description: null,
        amount: '-15.00',
        currency: 'USD',
        billing_date: '2025-11-15',
        type: 'cleared',
        cadence: 'monthly',
        start_date: '2025-01-01',
        end_date: null,
        created_at: '2025-01-01',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
      },
      occurrenceDate: new Date('2025-11-15'),
    };

    expect(component.getDescription(mockExpense)).toBeNull();
  });

  it('should format amount with currency', () => {
    const mockExpense: RecurringInstance = {
      expense: {
        id: 1,
        payee: 'Test',
        description: null,
        amount: '-25.99',
        currency: 'EUR',
        billing_date: '2025-11-15',
        type: 'cleared',
        cadence: 'monthly',
        start_date: '2025-01-01',
        end_date: null,
        created_at: '2025-01-01',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: null,
      },
      occurrenceDate: new Date('2025-11-15'),
    };

    fixture.componentRef.setInput('defaultCurrency', 'USD');
    const formatted = component.getFormattedAmount(mockExpense);
    expect(formatted).toContain('25.99');
  });

  it('should handle empty expenses list', () => {
    fixture.componentRef.setInput('expenses', []);
    fixture.componentRef.setInput('currency', 'USD');
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-11-01'));
    fixture.detectChanges();

    expect(component.sortedExpenses().length).toBe(0);
    expect(component.totalFormatted()).toContain('0');
  });
});
