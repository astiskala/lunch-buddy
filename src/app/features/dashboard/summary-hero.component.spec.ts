import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SummaryHeroComponent } from './summary-hero.component';

describe('SummaryHeroComponent', () => {
  it('should invert sign for income remaining in header', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 0);
    fixture.componentRef.setInput('totalExpenseBudget', 0);
    fixture.componentRef.setInput('totalIncomeBudget', 2000);
    fixture.componentRef.setInput('totalIncomeSpent', 1200);
    fixture.componentRef.setInput('totalIncomeUpcoming', 300);
    fixture.detectChanges();
    // Should invert sign
    expect(component.incomeRemaining()).toBe(-500);
  });
  let component: SummaryHeroComponent;
  let fixture: ComponentFixture<SummaryHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryHeroComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(SummaryHeroComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate expense spent percent', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    expect(component.expenseSpentPercent()).toBe(50);
  });

  it('should calculate expense projected percent with upcoming', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.componentRef.setInput('totalExpenseUpcoming', 300);
    fixture.detectChanges();

    expect(component.expenseProjectedPercent()).toBe(80);
  });

  it('should subtract upcoming from expense remaining', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.componentRef.setInput('totalExpenseSpent', 400);
    fixture.componentRef.setInput('totalExpenseUpcoming', 250);
    fixture.detectChanges();

    expect(component.expenseRemaining()).toBe(350);
  });

  it('should handle zero budget', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 0);
    fixture.detectChanges();

    expect(component.expenseSpentPercent()).toBe(0);
  });

  it('should subtract upcoming from income remaining', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 0);
    fixture.componentRef.setInput('totalExpenseBudget', 0);
    fixture.componentRef.setInput('totalIncomeBudget', 2000);
    fixture.componentRef.setInput('totalIncomeSpent', 1200);
    fixture.componentRef.setInput('totalIncomeUpcoming', 300);
    fixture.detectChanges();

    expect(component.incomeRemaining()).toBe(-500);
  });

  it('should calculate month progress percent', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.75);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    expect(component.monthProgressPercent()).toBe(75);
  });

  it('should emit customize event when button clicked', () => {
    let emitted = false;
    component.customize.subscribe(() => (emitted = true));

    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const hostElement = fixture.nativeElement as HTMLElement;
    const button =
      hostElement.querySelector<HTMLButtonElement>('.customize-btn');
    expect(button).not.toBeNull();
    button?.click();

    expect(emitted).toBeTrue();
  });

  it('should emit previousMonth event when previous button clicked', () => {
    let emitted = false;
    component.previousMonth.subscribe(() => (emitted = true));

    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const hostElement = fixture.nativeElement as HTMLElement;
    const button = hostElement.querySelector<HTMLButtonElement>(
      'button[aria-label="View previous month"]'
    );
    expect(button).not.toBeNull();
    button?.click();

    expect(emitted).toBeTrue();
  });

  it('should emit nextMonth event when enabled and clicked', () => {
    let emitted = false;
    component.nextMonth.subscribe(() => (emitted = true));

    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('canGoToNextMonth', true);
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const hostElement = fixture.nativeElement as HTMLElement;
    const button = hostElement.querySelector<HTMLButtonElement>(
      'button[aria-label="View next month"]'
    );
    expect(button).not.toBeNull();
    expect(button?.disabled).toBeFalse();
    button?.click();

    expect(emitted).toBeTrue();
  });

  it('should hide next month button when viewing current month', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const hostElement = fixture.nativeElement as HTMLElement;
    const button = hostElement.querySelector<HTMLButtonElement>(
      'button[aria-label="View next month"]'
    );
    expect(button).toBeNull();
  });

  it('should emit logout event when button clicked', () => {
    let emitted = false;
    component.logout.subscribe(() => (emitted = true));

    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const hostElement = fixture.nativeElement as HTMLElement;
    const button = hostElement.querySelector<HTMLButtonElement>('.logout-btn');
    expect(button).not.toBeNull();
    button?.click();

    expect(emitted).toBeTrue();
  });

  it('should display month name', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('October');
  });
});
