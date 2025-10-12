import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { CategoryCardComponent } from './category-card.component';
import { BudgetProgress } from '../../core/models/lunchmoney.types';

describe('CategoryCardComponent', () => {
  let component: CategoryCardComponent;
  let fixture: ComponentFixture<CategoryCardComponent>;

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
    status: 'on-track'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCardComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient()
      ]
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
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.progress-bar')).toBeTruthy();
  });

  it('should show correct status class', () => {
    fixture.componentRef.setInput('item', mockItem);
    fixture.componentRef.setInput('startDate', '2025-10-01');
    fixture.componentRef.setInput('endDate', '2025-10-31');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('defaultCurrency', 'USD');
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
    fixture.componentRef.setInput('recurringExpenses', []);
    fixture.detectChanges();

    expect(component['showDetails']()).toBeFalse();

    const card = fixture.nativeElement.querySelector('.category-card') as HTMLElement;
    card.click();
    fixture.detectChanges();

    expect(component['showDetails']()).toBeTrue();
  });
});
