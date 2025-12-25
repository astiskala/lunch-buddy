import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StatusBadgeComponent, StatusType } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  const getRequiredElement = (
    host: ParentNode,
    selector: string
  ): HTMLElement => {
    const element = host.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing element: ${selector}`);
    }
    return element;
  };

  const setStatus = (status: StatusType): void => {
    fixture.componentRef.setInput('status', status);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  it('renders the label for over budget status', () => {
    setStatus('over');

    const host = fixture.nativeElement as HTMLElement;
    const badge = getRequiredElement(host, '.status-badge');
    expect(badge.getAttribute('data-status')).toBe('over');
    expect(badge.textContent.trim()).toBe('Over');
  });

  it('renders the label for at-risk status', () => {
    setStatus('at-risk');

    const host = fixture.nativeElement as HTMLElement;
    const badge = getRequiredElement(host, '.status-badge');
    expect(badge.getAttribute('data-status')).toBe('at-risk');
    expect(badge.textContent.trim()).toBe('At risk');
  });

  it('renders the label for on-track status', () => {
    setStatus('on-track');

    const host = fixture.nativeElement as HTMLElement;
    const badge = getRequiredElement(host, '.status-badge');
    expect(badge.getAttribute('data-status')).toBe('on-track');
    expect(badge.textContent.trim()).toBe('On track');
  });
});
