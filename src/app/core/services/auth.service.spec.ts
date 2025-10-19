import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuthService } from './auth.service';
import { BackgroundSyncService } from './background-sync.service';

class MockBackgroundSyncService {
  updateApiCredentials = jasmine.createSpy('updateApiCredentials').and.resolveTo(undefined);
}

describe('AuthService', () => {
  let service: AuthService;
  let backgroundSync: MockBackgroundSyncService;
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
    backgroundSync = TestBed.inject(BackgroundSyncService) as unknown as MockBackgroundSyncService;
  });

  afterEach(() => {
    localStorage.clear();
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
    expect(service.hasApiKey()).toBeFalse();
  });

  it('should store and retrieve API key', () => {
    service.setApiKey(TEST_API_KEY);
    expect(service.getApiKey()).toBe(TEST_API_KEY);
    expect(service.hasApiKey()).toBeTrue();
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

  it('should remove API key from localStorage when cleared', () => {
    service.setApiKey(TEST_API_KEY);
    service.clearApiKey();

    expect(localStorage.getItem('lunchbuddy_api_key')).toBeNull();
  });

  it('should emit the current API key to subscribers', (done) => {
    service.apiKey$.subscribe((apiKey) => {
      expect(apiKey).toBe(TEST_API_KEY);
      done();
    });

    service.setApiKey(TEST_API_KEY);
  });
});
