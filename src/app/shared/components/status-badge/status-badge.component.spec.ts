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
      throw new TypeError(`Missing element: ${selector}`);
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

  const expectRenderedStatus = (status: StatusType, label: string): void => {
    setStatus(status);
    const host = fixture.nativeElement as HTMLElement;
    const badge = getRequiredElement(host, '.status-badge');
    expect(badge.dataset['status']).toBe(status);
    expect(badge.textContent.trim()).toBe(label);
  };

  it.each([
    ['over', 'Over'],
    ['at-risk', 'At risk'],
    ['on-track', 'On track'],
  ] as const)('renders the label for %s status', (status, label) => {
    expectRenderedStatus(status, label);
  });
});
