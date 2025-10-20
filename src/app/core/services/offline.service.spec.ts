import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { OfflineService } from './offline.service';

describe('OfflineService', () => {
  let service: OfflineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(OfflineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with current online status', () => {
    const onlineStatus = service.getOnlineStatus();
    expect(onlineStatus()).toBe(navigator.onLine);
  });

  it('should provide readonly signals', () => {
    const onlineStatus = service.getOnlineStatus();
    const offlineStatus = service.getOfflineStatus();

    expect(onlineStatus()).toBe(!offlineStatus());
  });
});
