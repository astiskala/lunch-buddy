import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuthService } from './auth.service';
import { firstValueFrom, skip } from 'rxjs';
import { vi } from 'vitest';
import { BackgroundSyncService } from './background-sync.service';

class MockBackgroundSyncService {
  updateApiCredentials = vi.fn().mockResolvedValue(undefined);
}

describe('AuthService', () => {
  let service: AuthService;
  const TEST_API_KEY = 'test-api-key-12345';

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BackgroundSyncService, useClass: MockBackgroundSyncService },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    delete (globalThis as { NG_APP_LUNCHMONEY_API_KEY?: string })
      .NG_APP_LUNCHMONEY_API_KEY;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null when no API key is stored', async () => {
    await service.ready();
    expect(service.getApiKey()).toBeNull();
  });

  it('should return false when no API key is stored', async () => {
    await service.ready();
    expect(service.hasApiKey()).toBe(false);
  });

  it('should store and retrieve API key', () => {
    service.setApiKey(TEST_API_KEY);
    expect(service.getApiKey()).toBe(TEST_API_KEY);
    expect(service.hasApiKey()).toBe(true);
  });

  it('should persist API key to localStorage', () => {
    service.setApiKey(TEST_API_KEY);
    expect(localStorage.getItem('lunchbuddy_api_key')).toBe(TEST_API_KEY);
  });

  it('should load API key from localStorage on initialization', async () => {
    localStorage.setItem('lunchbuddy_api_key', TEST_API_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BackgroundSyncService, useClass: MockBackgroundSyncService },
      ],
    });
    const newService = TestBed.inject(AuthService);
    await newService.ready();
    expect(newService.getApiKey()).toBe(TEST_API_KEY);
  });

  it('should prefer runtime environment API key when no stored key exists', async () => {
    (
      globalThis as { NG_APP_LUNCHMONEY_API_KEY?: string }
    ).NG_APP_LUNCHMONEY_API_KEY = TEST_API_KEY;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BackgroundSyncService, useClass: MockBackgroundSyncService },
      ],
    });

    const newService = TestBed.inject(AuthService);
    await newService.ready();
    expect(newService.getApiKey()).toBe(TEST_API_KEY);
  });

  it('should remove API key from localStorage when cleared', async () => {
    service.setApiKey(TEST_API_KEY);
    await service.clearApiKey();

    expect(localStorage.getItem('lunchbuddy_api_key')).toBeNull();
  });

  it('should emit the current API key to subscribers', async () => {
    const apiKeyPromise = firstValueFrom(service.apiKey$.pipe(skip(1)));
    service.setApiKey(TEST_API_KEY);
    const apiKey = await apiKeyPromise;
    expect(apiKey).toBe(TEST_API_KEY);
  });
});
