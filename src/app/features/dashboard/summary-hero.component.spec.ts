import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SummaryHeroComponent } from './summary-hero.component';

interface SummaryHeroInputs {
  monthStart: string;
  monthProgressRatio: number;
  totalExpenseSpent: number;
  totalExpenseBudget: number;
  totalExpenseUpcoming: number;
  totalIncomeSpent: number;
  totalIncomeBudget: number;
  totalIncomeUpcoming: number;
  canGoToNextMonth: boolean;
}

describe('SummaryHeroComponent', () => {
  let component: SummaryHeroComponent;
  let fixture: ComponentFixture<SummaryHeroComponent>;

  const DEFAULT_INPUTS: SummaryHeroInputs = {
    monthStart: '2025-10-01',
    monthProgressRatio: 0.5,
    totalExpenseSpent: 500,
    totalExpenseBudget: 1000,
    totalExpenseUpcoming: 0,
    totalIncomeSpent: 0,
    totalIncomeBudget: 0,
    totalIncomeUpcoming: 0,
    canGoToNextMonth: false,
  };

  const render = (overrides: Partial<SummaryHeroInputs> = {}): void => {
    const nextInputs = { ...DEFAULT_INPUTS, ...overrides };

    fixture.componentRef.setInput('monthStart', nextInputs.monthStart);
    fixture.componentRef.setInput(
      'monthProgressRatio',
      nextInputs.monthProgressRatio
    );
    fixture.componentRef.setInput(
      'totalExpenseSpent',
      nextInputs.totalExpenseSpent
    );
    fixture.componentRef.setInput(
      'totalExpenseBudget',
      nextInputs.totalExpenseBudget
    );
    fixture.componentRef.setInput(
      'totalExpenseUpcoming',
      nextInputs.totalExpenseUpcoming
    );
    fixture.componentRef.setInput(
      'totalIncomeSpent',
      nextInputs.totalIncomeSpent
    );
    fixture.componentRef.setInput(
      'totalIncomeBudget',
      nextInputs.totalIncomeBudget
    );
    fixture.componentRef.setInput(
      'totalIncomeUpcoming',
      nextInputs.totalIncomeUpcoming
    );
    fixture.componentRef.setInput(
      'canGoToNextMonth',
      nextInputs.canGoToNextMonth
    );

    fixture.detectChanges();
  };

  const queryButton = (selector: string): HTMLButtonElement | null => {
    const hostElement = fixture.nativeElement as HTMLElement;
    return hostElement.querySelector<HTMLButtonElement>(selector);
  };

  const expectEventEmitted = (
    subscribe: (listener: () => void) => void,
    buttonSelector: string,
    overrides: Partial<SummaryHeroInputs> = {}
  ): void => {
    let emitted = false;
    subscribe(() => {
      emitted = true;
    });

    render(overrides);

    const button = queryButton(buttonSelector);
    expect(button).not.toBeNull();
    button?.click();

    expect(emitted).toBe(true);
  };

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
    render();
    expect(component.expenseSpentPercent()).toBe(50);
  });

  it('should calculate expense projected percent with upcoming', () => {
    render({ totalExpenseUpcoming: 300 });
    expect(component.expenseProjectedPercent()).toBe(80);
  });

  it('should subtract upcoming from expense remaining', () => {
    render({ totalExpenseSpent: 400, totalExpenseUpcoming: 250 });
    expect(component.expenseRemaining()).toBe(350);
  });

  it('should handle zero budget', () => {
    render({ totalExpenseBudget: 0 });
    expect(component.expenseSpentPercent()).toBe(0);
  });

  it('should invert sign for income remaining in header', () => {
    render({
      totalExpenseSpent: 0,
      totalExpenseBudget: 0,
      totalIncomeBudget: 2000,
      totalIncomeSpent: 1200,
      totalIncomeUpcoming: 300,
    });

    expect(component.incomeRemaining()).toBe(-500);
  });

  it('should calculate month progress percent', () => {
    render({ monthProgressRatio: 0.75 });
    expect(component.monthProgressPercent()).toBe(75);
  });

  it('should emit customize event when button clicked', () => {
    expectEventEmitted(listener => {
      component.customize.subscribe(listener);
    }, '.customize-btn');
  });

  it('should emit previousMonth event when previous button clicked', () => {
    expectEventEmitted(listener => {
      component.previousMonth.subscribe(listener);
    }, 'button[aria-label="View previous month"]');
  });

  it('should emit nextMonth event when enabled and clicked', () => {
    let emitted = false;
    component.nextMonth.subscribe(() => {
      emitted = true;
    });

    render({ canGoToNextMonth: true });

    const button = queryButton('button[aria-label="View next month"]');
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(false);
    button?.click();

    expect(emitted).toBe(true);
  });

  it('should hide next month button when viewing current month', () => {
    render({ canGoToNextMonth: false });

    const button = queryButton('button[aria-label="View next month"]');
    expect(button).toBeNull();
  });

  it('should emit logout event when button clicked', () => {
    expectEventEmitted(listener => {
      component.logout.subscribe(listener);
    }, '.logout-btn');
  });

  it('should display month name', () => {
    render();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('October');
  });
});
