import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { OfflineIndicatorComponent } from './offline-indicator.component';
import { OfflineService } from '../../../core/services/offline.service';

describe('OfflineIndicatorComponent', () => {
  let component: OfflineIndicatorComponent;
  let fixture: ComponentFixture<OfflineIndicatorComponent>;
  let offlineService: MockOfflineService;

  class MockOfflineService {
    private readonly offlineSignal = signal(false);

    setOffline(value: boolean): void {
      this.offlineSignal.set(value);
    }

    getOfflineStatus() {
      return this.offlineSignal.asReadonly();
    }
  }

  beforeEach(async () => {
    offlineService = new MockOfflineService();

    await TestBed.configureTestingModule({
      imports: [OfflineIndicatorComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: OfflineService,
          useValue: offlineService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OfflineIndicatorComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the banner when offline', () => {
    offlineService.setOffline(true);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const banner = host.querySelector('.offline-banner');
    expect(banner).toBeTruthy();
  });

  it('does not render the banner when online', () => {
    offlineService.setOffline(false);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const banner = host.querySelector('.offline-banner');
    expect(banner).toBeNull();
  });
});
