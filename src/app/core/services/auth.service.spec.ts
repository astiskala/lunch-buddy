import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuthService } from './auth.service';
import { SecureStorageService } from './secure-storage.service';

class InsecureTestSecureStorageService {
  async getItem(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
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
        { provide: SecureStorageService, useClass: InsecureTestSecureStorageService },
      ],
    });
    service = TestBed.inject(AuthService);
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

  it('should store and retrieve API key', async () => {
    await service.setApiKey(TEST_API_KEY);
    expect(service.getApiKey()).toBe(TEST_API_KEY);
    expect(service.hasApiKey()).toBeTrue();
  });

  it('should persist API key to localStorage', async () => {
    await service.setApiKey(TEST_API_KEY);
    expect(localStorage.getItem('lunchbuddy_api_key')).toBe(TEST_API_KEY);
  });

  it('should load API key from localStorage on initialization', async () => {
    localStorage.setItem('lunchbuddy_api_key', TEST_API_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SecureStorageService, useClass: InsecureTestSecureStorageService },
      ],
    });
    const newService = TestBed.inject(AuthService);
    await newService.ready();
    expect(newService.getApiKey()).toBe(TEST_API_KEY);
  });

  it('should remove API key from localStorage when cleared', async () => {
    await service.setApiKey(TEST_API_KEY);
    await service.clearApiKey();

    expect(localStorage.getItem('lunchbuddy_api_key')).toBeNull();
  });
});
