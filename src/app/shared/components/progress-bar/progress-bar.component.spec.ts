import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProgressBarComponent } from './progress-bar.component';

describe('ProgressBarComponent', () => {
  let fixture: ComponentFixture<ProgressBarComponent>;

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

  const setBaseInputs = (): void => {
    fixture.componentRef.setInput('spentPercent', 40);
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressBarComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressBarComponent);
  });

  it('renders spent progress with status', () => {
    setBaseInputs();
    fixture.componentRef.setInput('status', 'warning');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const spent = getRequiredElement(host, '.progress.spent');
    expect(spent).toBeTruthy();
    expect(spent.style.width).toBe('40%');
    expect(spent.dataset['status']).toBe('warning');
  });

  it('renders projected segment when projected exceeds spent', () => {
    setBaseInputs();
    fixture.componentRef.setInput('projectedPercent', 70);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const projected = getRequiredElement(host, '.progress.projected');
    expect(projected).toBeTruthy();
    expect(projected.style.width).toBe('70%');
    expect(projected.style.left).toBe('');
  });

  it('does not render projected segment when projected is not greater than spent', () => {
    setBaseInputs();
    fixture.componentRef.setInput('projectedPercent', 30);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const projected = host.querySelector('.progress.projected');
    expect(projected).toBeNull();
  });

  it('shows the month indicator when month progress is provided', () => {
    setBaseInputs();
    fixture.componentRef.setInput('monthProgressPercent', 55);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const indicator = getRequiredElement(host, '.month-indicator');
    expect(indicator).toBeTruthy();
    expect(indicator.style.left).toBe('55%');
    expect(indicator.getAttribute('title')).toContain('Month progress');
  });

  it('applies the variant class and custom height', () => {
    setBaseInputs();
    fixture.componentRef.setInput('variant', 'hero');
    fixture.componentRef.setInput('height', 20);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const wrapper = getRequiredElement(host, '.progress-bar-wrapper');
    expect(wrapper.classList.contains('hero')).toBe(true);
    expect(wrapper.style.height).toBe('20px');
  });
});
