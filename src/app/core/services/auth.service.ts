import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BackgroundSyncService } from './background-sync.service';
import { LoggerService } from './logger.service';

const API_KEY_STORAGE_KEY = 'lunchbuddy_api_key';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly backgroundSync = inject(BackgroundSyncService);
  private readonly logger = inject(LoggerService);
  private readonly apiKey = signal<string | null>(null);
  private readonly readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = this.initialize();
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey();
  }

  /**
   * Set and persist the API key
   */
  async setApiKey(key: string): Promise<void> {
    this.storeApiKey(key);
    this.apiKey.set(key);
    await this.backgroundSync.updateApiCredentials(key);
  }

  /**
   * Clear the API key (logout)
   */
  async clearApiKey(): Promise<void> {
    this.removeApiKey();
    this.apiKey.set(null);
    await this.backgroundSync.updateApiCredentials(null);
  }

  /**
   * Check if user has an API key
   */
  hasApiKey(): boolean {
    return this.apiKey() !== null;
  }

  /**
   * Wait for the storage to initialize (needed before reading the API key)
   */
  async ready(): Promise<void> {
    await this.readyPromise;
  }

  private async initialize(): Promise<void> {
    try {
      const stored = this.readStoredApiKey();
      this.apiKey.set(stored);
      await this.backgroundSync.updateApiCredentials(stored);
    } catch (error) {
      this.logger.error('AuthService: failed to load stored API key', error);
      this.apiKey.set(null);
      await this.backgroundSync.updateApiCredentials(null);
    }
  }

  private storeApiKey(value: string): void {
    if (!this.canUseLocalStorage()) {
      return;
    }

    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, value);
    } catch (error) {
      this.logger.error('AuthService: failed to persist API key', error);
    }
  }

  private removeApiKey(): void {
    if (!this.canUseLocalStorage()) {
      return;
    }

    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      this.logger.error('AuthService: failed to clear API key', error);
    }
  }

  private readStoredApiKey(): string | null {
    if (!this.canUseLocalStorage()) {
      return null;
    }

    try {
      return localStorage.getItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      this.logger.error('AuthService: failed to read stored API key', error);
      return null;
    }
  }

  private canUseLocalStorage(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    try {
      const testKey = '__auth_service_storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }
}
