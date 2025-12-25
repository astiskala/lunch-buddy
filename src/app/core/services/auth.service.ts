import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from './logger.service';
import { SiteDataService } from './site-data.service';
import { resolveLunchMoneyApiKey } from '../../../environments/resolve-api-key';

const API_KEY_STORAGE_KEY = 'lunchbuddy_api_key';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly siteDataService = inject(SiteDataService);
  private readonly apiKey = new BehaviorSubject<string | null>(null);
  private initialized = false;

  public readonly apiKey$ = this.apiKey.asObservable();

  constructor() {
    this.initialize();
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey.getValue();
  }

  /**
   * Set and persist the API key
   */
  setApiKey(key: string): void {
    this.storeApiKey(key);
    this.apiKey.next(key);
  }

  /**
   * Clear the API key (logout) and purge cached site data.
   */
  async clearApiKey(): Promise<void> {
    this.removeApiKey();
    this.apiKey.next(null);
    await this.siteDataService.clearSiteData();
  }

  /**
   * Check if user has an API key
   */
  hasApiKey(): boolean {
    return this.apiKey.getValue() !== null;
  }

  /**
   * Wait for the storage to initialize (needed before reading the API key)
   */
  ready(): Promise<void> {
    if (!this.initialized) {
      this.initialized = true;
    }
    return Promise.resolve();
  }

  private initialize(): void {
    try {
      const stored = this.readStoredApiKey();
      if (stored) {
        this.apiKey.next(stored);
        return;
      }

      const envKey = resolveLunchMoneyApiKey();
      if (envKey) {
        this.storeApiKey(envKey);
        this.apiKey.next(envKey);
        return;
      }

      this.apiKey.next(null);
    } catch (error) {
      this.logger.error('AuthService: failed to load stored API key', error);
      this.apiKey.next(null);
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
