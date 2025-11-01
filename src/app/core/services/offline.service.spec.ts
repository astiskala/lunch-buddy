import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { OfflineService } from './offline.service';

describe('OfflineService', () => {
  let service: OfflineService;
  let originalNavigatorDescriptor: PropertyDescriptor | undefined;
  let originalAddEventListener: typeof globalThis.addEventListener;
  const registeredOnlineListeners: EventListener[] = [];
  const registeredOfflineListeners: EventListener[] = [];

  beforeEach(() => {
    originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
      globalThis.navigator,
      'onLine'
    );
    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    originalAddEventListener = window.addEventListener;
    window.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void => {
      if (type === 'online') {
        registeredOnlineListeners.push(listener as EventListener);
      }
      if (type === 'offline') {
        registeredOfflineListeners.push(listener as EventListener);
      }
      originalAddEventListener.call(globalThis, type, listener, options);
    };

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(OfflineService);
  });

  afterEach(() => {
    for (const listener of registeredOnlineListeners.splice(0)) {
      globalThis.removeEventListener('online', listener);
    }
    for (const listener of registeredOfflineListeners.splice(0)) {
      globalThis.removeEventListener('offline', listener);
    }
    window.addEventListener = originalAddEventListener;

    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        globalThis.navigator,
        'onLine',
        originalNavigatorDescriptor
      );
    } else {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        configurable: true,
        value: true,
      });
    }
  });

  it('registers window listeners for online and offline events', () => {
    expect(registeredOnlineListeners.length).toBeGreaterThan(0);
    expect(registeredOfflineListeners.length).toBeGreaterThan(0);
  });

  it('reflects navigator online state in its signals', () => {
    const onlineStatus = service.getOnlineStatus();
    const offlineStatus = service.getOfflineStatus();

    expect(onlineStatus()).toBeTrue();
    expect(offlineStatus()).toBeFalse();
  });

  it('updates signals when connectivity changes', () => {
    const onlineStatus = service.getOnlineStatus();
    const offlineStatus = service.getOfflineStatus();

    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    globalThis.dispatchEvent(new Event('offline'));

    expect(onlineStatus()).toBeFalse();
    expect(offlineStatus()).toBeTrue();

    Object.defineProperty(globalThis.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    globalThis.dispatchEvent(new Event('online'));

    expect(onlineStatus()).toBeTrue();
    expect(offlineStatus()).toBeFalse();
  });
});
