import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { OfflineService } from './offline.service';
import { vi } from 'vitest';

describe('OfflineService', () => {
  let originalOnLineDescriptor: PropertyDescriptor | undefined;
  let service: OfflineService;
  let fetchSpy: ReturnType<typeof vi.fn>;

  const setNavigatorOnline = (value: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value,
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    originalOnLineDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'onLine'
    );
    setNavigatorOnline(true);

    fetchSpy = vi.fn().mockResolvedValue({ ok: true } as Response);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

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
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('exposes initial online/offline state from the navigator', () => {
    expect(service.getOnlineStatus()()).toBe(true);
    expect(service.getOfflineStatus()()).toBe(false);
  });

  it('updates signals when offline/online events are fired', async () => {
    // Offline event should be immediate
    globalThis.window.dispatchEvent(new Event('offline'));
    expect(service.getOnlineStatus()()).toBe(false);
    expect(service.getOfflineStatus()()).toBe(true);

    // Online event triggers a fetch
    setNavigatorOnline(true);
    globalThis.window.dispatchEvent(new Event('online'));

    // Wait for the fetch in checkConnectivity
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalled();
    expect(service.getOnlineStatus()()).toBe(true);
    expect(service.getOfflineStatus()()).toBe(false);
  });

  it('updates status based on periodic heartbeat', async () => {
    // Initial state is online
    expect(service.getOnlineStatus()()).toBe(true);

    // Mock fetch to fail for the next heartbeat
    fetchSpy.mockResolvedValueOnce({ ok: false } as Response);

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(fetchSpy).toHaveBeenCalled();
    expect(service.getOnlineStatus()()).toBe(false);
    expect(service.getOfflineStatus()()).toBe(true);

    // Mock fetch to succeed again
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response);

    // Fast-forward another 30 seconds
    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(service.getOnlineStatus()()).toBe(true);
  });

  it('immediately marks as offline if navigator.onLine is false during heartbeat', async () => {
    setNavigatorOnline(false);

    // Trigger heartbeat
    vi.advanceTimersByTime(30000);
    await Promise.resolve();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(service.getOnlineStatus()()).toBe(false);
  });
});
