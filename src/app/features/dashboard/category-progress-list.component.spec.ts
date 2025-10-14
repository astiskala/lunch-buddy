import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CategoryProgressListComponent } from './category-progress-list.component';

describe('CategoryProgressListComponent', () => {
  let component: ComponentFixture<CategoryProgressListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryProgressListComponent],
      providers: [provideZonelessChangeDetection()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create', () => {
    component = TestBed.createComponent(CategoryProgressListComponent);
    expect(component).toBeTruthy();
  });

  it('should accept empty items array', () => {
    component = TestBed.createComponent(CategoryProgressListComponent);
    component.componentRef.setInput('items', []);
    component.componentRef.setInput('defaultCurrency', 'USD');
    component.componentRef.setInput('startDate', '2025-10-01');
    component.componentRef.setInput('endDate', '2025-10-31');
    component.componentRef.setInput('referenceDate', new Date());
    component.detectChanges();
    
    expect(component.componentInstance.items()).toEqual([]);
  });

  it('should use default empty message', () => {
    component = TestBed.createComponent(CategoryProgressListComponent);
    component.componentRef.setInput('items', []);
    component.componentRef.setInput('defaultCurrency', 'USD');
    component.componentRef.setInput('startDate', '2025-10-01');
    component.componentRef.setInput('endDate', '2025-10-31');
    component.componentRef.setInput('referenceDate', new Date());
    component.detectChanges();
    
    const compiled = component.nativeElement as HTMLElement;
    const emptyMsg = compiled.querySelector('.empty-message');
    expect(emptyMsg?.textContent).toContain('No categories available');
  });

  it('should use custom empty message', () => {
    component = TestBed.createComponent(CategoryProgressListComponent);
    component.componentRef.setInput('items', []);
    component.componentRef.setInput('emptyMessage', 'Custom empty message');
    component.componentRef.setInput('defaultCurrency', 'USD');
    component.componentRef.setInput('startDate', '2025-10-01');
    component.componentRef.setInput('endDate', '2025-10-31');
    component.componentRef.setInput('referenceDate', new Date());
    component.detectChanges();
    
    const compiled = component.nativeElement as HTMLElement;
    const emptyMsg = compiled.querySelector('.empty-message');
    expect(emptyMsg?.textContent).toContain('Custom empty message');
  });
});
