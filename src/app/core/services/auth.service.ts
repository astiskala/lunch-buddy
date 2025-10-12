import { Injectable, signal } from '@angular/core';

const API_KEY_STORAGE_KEY = 'lunchbuddy_api_key';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiKey = signal<string | null>(this.getStoredApiKey());

  constructor() {
    // Initialize signal from localStorage
    this.apiKey.set(this.getStoredApiKey());
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
  setApiKey(key: string): void {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    this.apiKey.set(key);
  }

  /**
   * Clear the API key (logout)
   */
  clearApiKey(): void {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    this.apiKey.set(null);
  }

  /**
   * Check if user has an API key
   */
  hasApiKey(): boolean {
    return this.apiKey() !== null;
  }

  /**
   * Get stored API key from localStorage
   */
  private getStoredApiKey(): string | null {
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  }
}
