import { Injectable, signal, inject } from '@angular/core';
import { SecureStorageService } from './secure-storage.service';
import { BackgroundSyncService } from './background-sync.service';

const API_KEY_STORAGE_KEY = 'lunchbuddy_api_key';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly secureStorage = inject(SecureStorageService);
  private readonly backgroundSync = inject(BackgroundSyncService);
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
    await this.secureStorage.setItem(API_KEY_STORAGE_KEY, key);
    this.apiKey.set(key);
    await this.backgroundSync.updateApiCredentials(key);
  }

  /**
   * Clear the API key (logout)
   */
  async clearApiKey(): Promise<void> {
    await this.secureStorage.removeItem(API_KEY_STORAGE_KEY);
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
      const stored = await this.secureStorage.getItem(API_KEY_STORAGE_KEY);
      this.apiKey.set(stored);
      await this.backgroundSync.updateApiCredentials(stored);
    } catch (error) {
      console.error('AuthService: failed to load stored API key', error);
      this.apiKey.set(null);
    }
  }
}
