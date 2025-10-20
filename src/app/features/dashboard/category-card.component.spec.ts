import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoryCardComponent } from './category-card.component';
import {
  BudgetProgress,
  RecurringInstance,
} from '../../core/models/lunchmoney.types';
import { LunchMoneyService } from '../../core/services/lunchmoney.service';
import { of } from 'rxjs';

describe('CategoryCardComponent', () => {
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
    mockLunchmoneyService = jasmine.createSpyObj<LunchMoneyService>('LunchMoneyService', [
      'getCategoryTransactions',
    ]);
    mockLunchmoneyService.getCategoryTransactions.and.returnValue(
      of({ transactions: [], total: 0, has_more: false }),
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
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h3')?.textContent).toContain('Groceries');
  });

  it('should display budget information', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

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

    fixture.componentRef.setInput('item', incomeItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const label = (compiled.querySelector('.metrics .metric .label')?.textContent || '').trim();
    expect(label).toBe('Received');
    const value = compiled.querySelector('.metrics .metric .value')?.textContent || '';
    expect(value).toContain('$650.00');
  });

  it('should compute remaining using absolute values for income categories', () => {
    const incomeItem: BudgetProgress = {
      ...mockItem,
      isIncome: true,
      spent: -400,
      budgetAmount: 1000,
    };

    fixture.componentRef.setInput('item', incomeItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    expect(component.remainingAfterUpcoming()).toBeCloseTo(600, 5);
  });

  it('should show correct status class', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.category-card[data-status="on-track"]')).toBeTruthy();
  });

  it('should calculate month progress percent', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.75);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    expect(component.monthProgressPercent()).toBe(75);
  });

  it('should toggle details when clicked', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    expect(component['showDetails']()).toBeFalse();

    const hostElement = fixture.nativeElement as HTMLElement;
    const card = hostElement.querySelector<HTMLElement>('.category-card');
    expect(card).not.toBeNull();
    card?.click();
    fixture.detectChanges();

    expect(component['showDetails']()).toBeTrue();
  });

  it('should collapse when clicking details on expanded card', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-10T00:00:00.000Z'));
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    const hostElement = fixture.nativeElement as HTMLElement;
    const card = hostElement.querySelector<HTMLElement>('.category-card');
    expect(card).not.toBeNull();
    card?.click();
    fixture.detectChanges();

    const details = hostElement.querySelector<HTMLElement>('.details');
    expect(details).not.toBeNull();
    details?.click();
    fixture.detectChanges();

    expect(component['showDetails']()).toBeFalse();
  });

  it('should exclude cleared recurring instances from upcoming totals', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-20T00:00:00.000Z'));

    const createInstance = (
      id: number,
      type: 'cleared' | 'suggested',
      amount: string,
      payee: string,
    ): RecurringInstance => ({
      expense: {
        id,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee,
        amount,
        currency: 'USD',
        description: null,
        billing_date: '15',
        next_occurrence: '2025-10-15',
        type,
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: mockItem.categoryId,
        created_at: '2024-01-01',
      },
      occurrenceDate: new Date('2025-10-15T00:00:00.000Z'),
    });

    fixture.componentRef.setInput('recurringExpenses', [
      createInstance(1, 'suggested', '300', 'Ministry of Manpower'),
      createInstance(2, 'cleared', '900', 'Nelda Aguinaldo'),
    ]);

    fixture.detectChanges();

    expect(component.upcomingRecurringTotal()).toBeCloseTo(300);

    const upcomingEntries = component.activityEntries().filter((entry) => entry.kind === 'upcoming');
    expect(upcomingEntries.length).toBe(1);
    expect(upcomingEntries[0].label).toContain('Ministry of Manpower');
  });

  it('should retain future cleared instances as upcoming', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
    fixture.componentRef.setInput('referenceDate', new Date('2025-10-05T00:00:00.000Z'));

    const futureCleared: RecurringInstance = {
      expense: {
        id: 5,
        start_date: '2024-01-01',
        end_date: null,
        cadence: 'monthly',
        payee: 'Upcoming Tax',
        amount: '200',
        currency: 'USD',
        description: null,
        billing_date: '25',
        next_occurrence: '2025-10-25',
        type: 'cleared',
        original_name: null,
        source: 'manual',
        plaid_account_id: null,
        asset_id: null,
        category_id: mockItem.categoryId,
        created_at: '2024-01-01',
      },
      occurrenceDate: new Date('2025-10-25T00:00:00.000Z'),
    };

    fixture.componentRef.setInput('recurringExpenses', [futureCleared]);

    fixture.detectChanges();

    expect(component.upcomingRecurringTotal()).toBeCloseTo(200);
    const upcomingEntries = component.activityEntries().filter((entry) => entry.kind === 'upcoming');
    expect(upcomingEntries.length).toBe(1);
    expect(upcomingEntries[0].label).toContain('Upcoming Tax');
  });
});
