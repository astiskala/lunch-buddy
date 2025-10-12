import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SummaryHeroComponent } from './summary-hero.component';

describe('SummaryHeroComponent', () => {
  let component: SummaryHeroComponent;
  let fixture: ComponentFixture<SummaryHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SummaryHeroComponent],
      providers: [provideZonelessChangeDetection()]
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

  it('should handle zero budget', () => {
    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 0);
    fixture.detectChanges();

    expect(component.expenseSpentPercent()).toBe(0);
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
    component.customize.subscribe(() => emitted = true);

    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.customize-btn') as HTMLButtonElement;
    button.click();

    expect(emitted).toBeTrue();
  });

  it('should emit logout event when button clicked', () => {
    let emitted = false;
    component.logout.subscribe(() => emitted = true);

    fixture.componentRef.setInput('monthStart', '2025-10-01');
    fixture.componentRef.setInput('monthProgressRatio', 0.5);
    fixture.componentRef.setInput('totalExpenseSpent', 500);
    fixture.componentRef.setInput('totalExpenseBudget', 1000);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.logout-btn') as HTMLButtonElement;
    button.click();

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
