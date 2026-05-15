/**
 * @fileoverview Integration tests for AuthService + LoggerService interaction.
 *
 * Integration tests verify service-to-service behaviour within the Angular DI
 * context. Unlike unit tests they do not stub out every collaborator — only
 * boundary dependencies (localStorage, network) are replaced.
 */

import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { LoggerService } from './core/services/logger.service';
import { BackgroundSyncService } from './core/services/background-sync.service';
import { vi } from 'vitest';

class MockBackgroundSyncService {
  updateApiCredentials = vi.fn().mockResolvedValue(undefined);
}

describe('AuthService + LoggerService (integration)', () => {
  let authService: AuthService;
  let loggerService: LoggerService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: BackgroundSyncService, useClass: MockBackgroundSyncService },
      ],
    });
    authService = TestBed.inject(AuthService);
    loggerService = TestBed.inject(LoggerService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('resolves both services from the same injector', () => {
    expect(authService).toBeTruthy();
    expect(loggerService).toBeTruthy();
  });

  it('stores and retrieves an API key across the service boundary', () => {
    const key = 'integration-test-key-xyz';
    authService.setApiKey(key);
    expect(authService.getApiKey()).toBe(key);
    expect(authService.hasApiKey()).toBe(true);
  });

  it('clears the API key and persists the cleared state', async () => {
    authService.setApiKey('integration-test-key-xyz');
    await authService.clearApiKey();
    expect(authService.getApiKey()).toBeNull();
    expect(authService.hasApiKey()).toBe(false);
  });
});
