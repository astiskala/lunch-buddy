import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  NO_ERRORS_SCHEMA,
  provideZonelessChangeDetection,
} from '@angular/core';
import { CategoryProgressListComponent } from './category-progress-list.component';

describe('CategoryProgressListComponent', () => {
  let fixture: ComponentFixture<CategoryProgressListComponent>;

  const DEFAULT_INPUTS = {
    items: [],
    defaultCurrency: 'USD',
    startDate: '2025-10-01',
    endDate: '2025-10-31',
    referenceDate: new Date('2025-10-15T00:00:00Z'),
  };

  const setInputs = (
    overrides: Partial<typeof DEFAULT_INPUTS & { emptyMessage: string }> = {}
  ): void => {
    const nextInputs = { ...DEFAULT_INPUTS, ...overrides };

    fixture.componentRef.setInput('items', nextInputs.items);
    fixture.componentRef.setInput(
      'defaultCurrency',
      nextInputs.defaultCurrency
    );
    fixture.componentRef.setInput('startDate', nextInputs.startDate);
    fixture.componentRef.setInput('endDate', nextInputs.endDate);
    fixture.componentRef.setInput('referenceDate', nextInputs.referenceDate);

    if (nextInputs.emptyMessage !== undefined) {
      fixture.componentRef.setInput('emptyMessage', nextInputs.emptyMessage);
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryProgressListComponent],
      providers: [provideZonelessChangeDetection()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryProgressListComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should accept empty items array', () => {
    setInputs({ items: [] });
    fixture.detectChanges();

    expect(fixture.componentInstance.items()).toEqual([]);
  });

  it('should use default empty message', () => {
    setInputs({ items: [] });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyMsg = compiled.querySelector('.empty-message');
    expect(emptyMsg?.textContent).toContain('No categories available');
  });

  it('should use custom empty message', () => {
    setInputs({ items: [], emptyMessage: 'Custom empty message' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const emptyMsg = compiled.querySelector('.empty-message');
    expect(emptyMsg?.textContent).toContain('Custom empty message');
  });
});
