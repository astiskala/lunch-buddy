import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CustomPeriodDialogComponent } from './custom-period-dialog.component';
import { vi } from 'vitest';

describe('CustomPeriodDialogComponent', () => {
  let fixture: ComponentFixture<CustomPeriodDialogComponent>;
  let component: CustomPeriodDialogComponent;

  const setDialogOpen = (open: boolean): void => {
    fixture.componentRef.setInput('open', open);
    fixture.detectChanges();
  };

  const initializeClosedDialog = (): void => {
    setDialogOpen(false);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomPeriodDialogComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomPeriodDialogComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    delete document.body.dataset['dialogScrollLockCount'];
    delete document.body.dataset['dialogOriginalOverflow'];
    delete document.body.dataset['dialogOriginalTouchAction'];
  });

  it('should create', () => {
    initializeClosedDialog();
    expect(component).toBeTruthy();
  });

  it('should emit periodSelected with valid dates on submit', () => {
    initializeClosedDialog();

    component.startDate.set('2025-10-01');
    component.endDate.set('2025-10-14');

    const emitSpy = vi.spyOn(component.periodSelected, 'emit');
    component.handleSubmit();

    expect(emitSpy).toHaveBeenCalledWith({
      start: '2025-10-01',
      end: '2025-10-14',
    });
    expect(component.validationError()).toBeNull();
  });

  it('should show validation error when start date is after end date', () => {
    initializeClosedDialog();

    component.startDate.set('2025-10-15');
    component.endDate.set('2025-10-01');

    const emitSpy = vi.spyOn(component.periodSelected, 'emit');
    component.handleSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.validationError()).toBe(
      'Start date must be before end date.'
    );
  });

  it('should show validation error when dates are empty', () => {
    initializeClosedDialog();

    component.startDate.set('');
    component.endDate.set('');

    const emitSpy = vi.spyOn(component.periodSelected, 'emit');
    component.handleSubmit();

    expect(emitSpy).not.toHaveBeenCalled();
    expect(component.validationError()).toBe(
      'Please enter both a start and end date.'
    );
  });

  it('should clear validation error when date changes', () => {
    initializeClosedDialog();

    component.validationError.set('Some error');

    const event = {
      target: { value: '2025-10-01' },
    } as unknown as Event;
    component.handleStartDateChange(event);

    expect(component.validationError()).toBeNull();
  });

  it('should emit dialogClose when handleClose is called', () => {
    initializeClosedDialog();

    const closeSpy = vi.spyOn(component.dialogClose, 'emit');
    component.handleClose();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('should close the dialog and restore body scrolling when dismissed', () => {
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'pan-y';

    setDialogOpen(true);

    const closeSpy = vi.spyOn(component.dialogClose, 'emit');
    component.handleClose();

    const host = fixture.nativeElement as HTMLElement;
    const dialog = host.querySelector<HTMLDialogElement>('dialog');

    expect(closeSpy).toHaveBeenCalled();
    expect(dialog?.open ?? false).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.touchAction).toBe('pan-y');
  });

  it('should lock body scroll when opened and unlock when closed', () => {
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'pan-y';

    setDialogOpen(true);

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.touchAction).toBe('none');

    setDialogOpen(false);

    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.touchAction).toBe('pan-y');
  });

  it('should release body scroll lock when destroyed while open', () => {
    document.body.style.overflow = 'visible';
    setDialogOpen(true);

    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();

    expect(document.body.style.overflow).toBe('visible');
  });
});
