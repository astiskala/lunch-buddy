import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';
import { LoggerService } from './logger.service';
import { SiteDataService } from './site-data.service';
import { resolveLunchMoneyApiKey } from '../../../environments/resolve-api-key';
import { resolveLunchMoneyApiBase } from '../../../environments/resolve-api-base';

const API_KEY_STORAGE_KEY = 'lunchbuddy_api_key';
const MOCK_API_KEY_PREFIX = 'mock-api-key';
const MOCK_API_HOST = 'alpha.lunchmoney.dev';
const LOCAL_API_HOSTS = ['localhost', '127.0.0.1'];

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly siteDataService = inject(SiteDataService);
  private readonly apiBase = resolveLunchMoneyApiBase();
  private readonly apiKey = new BehaviorSubject<string | null>(null);
  private initialized = false;

  public readonly apiKey$ = this.apiKey.asObservable();

  constructor() {
    this.initialize();
  }

  getApiKey(): string | null {
    return this.apiKey.getValue();
  }

  setApiKey(key: string): void {
    this.storeApiKey(key);
    this.apiKey.next(key);
  }

  async clearApiKey(): Promise<void> {
    this.removeApiKey();
    this.apiKey.next(null);
    await this.siteDataService.clearSiteData();
  }

  hasApiKey(): boolean {
    return this.apiKey.getValue() !== null;
  }

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
        if (this.shouldIgnoreApiKey(stored)) {
          this.removeApiKey();
        } else {
          this.apiKey.next(stored);
          return;
        }
      }

      const envKey = resolveLunchMoneyApiKey();
      if (envKey) {
        if (this.shouldIgnoreApiKey(envKey)) {
          this.logger.warn(
            'AuthService: ignoring mock API key because the API base points to a real Lunch Money host'
          );
        } else {
          this.storeApiKey(envKey);
          this.apiKey.next(envKey);
          return;
        }
      }

      this.apiKey.next(null);
    } catch (error) {
      this.logger.error('AuthService: failed to load stored API key', error);
      this.apiKey.next(null);
    }
  }

  private shouldIgnoreApiKey(key: string): boolean {
    return this.isMockApiKey(key) && !this.isMockApiBase();
  }

  private isMockApiKey(key: string): boolean {
    return key.trim().startsWith(MOCK_API_KEY_PREFIX);
  }

  private isMockApiBase(): boolean {
    if (this.apiBase.includes(MOCK_API_HOST)) {
      return true;
    }

    if (this.apiBase.startsWith('/')) {
      return true;
    }

    return LOCAL_API_HOSTS.some(host => this.apiBase.includes(host));
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
