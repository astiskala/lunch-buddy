import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { OfflineService } from './offline.service';

describe('OfflineService', () => {
  let originalOnLineDescriptor: PropertyDescriptor | undefined;
  let service: OfflineService;

  const setNavigatorOnline = (value: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value,
    });
  };

  beforeEach(() => {
    originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'onLine'
    );
    setNavigatorOnline(true);

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), OfflineService],
    });

    service = TestBed.inject(OfflineService);
  });

  afterEach(() => {
    if (originalOnLineDescriptor) {
      Object.defineProperty(navigator, 'onLine', originalOnLineDescriptor);
    } else {
      Reflect.deleteProperty(navigator, 'onLine');
    }
    TestBed.resetTestingModule();
  });

  it('exposes initial online/offline state from the navigator', () => {
    expect(service.getOnlineStatus()()).toBe(true);
    expect(service.getOfflineStatus()()).toBe(false);
  });

  it('updates signals when offline/online events are fired', () => {
    globalThis.window.dispatchEvent(new Event('offline'));
    expect(service.getOnlineStatus()()).toBe(false);
    expect(service.getOfflineStatus()()).toBe(true);

    globalThis.window.dispatchEvent(new Event('online'));
    expect(service.getOnlineStatus()()).toBe(true);
    expect(service.getOfflineStatus()()).toBe(false);
  });
});
