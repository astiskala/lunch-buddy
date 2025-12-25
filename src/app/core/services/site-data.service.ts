import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from './logger.service';

const KNOWN_DB_NAMES = ['lunchbuddy-background', 'ngsw:db'];

@Injectable({
  providedIn: 'root',
})
export class SiteDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  async clearSiteData(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.clearWebStorage();
    await Promise.all([this.clearCaches(), this.clearIndexedDb()]);
  }

  private clearWebStorage(): void {
    try {
      localStorage.clear();
    } catch (error) {
      this.logger.warn('SiteDataService: failed to clear localStorage', error);
    }

    try {
      sessionStorage.clear();
    } catch (error) {
      this.logger.warn(
        'SiteDataService: failed to clear sessionStorage',
        error
      );
    }
  }

  private async clearCaches(): Promise<void> {
    if (!('caches' in globalThis)) {
      return;
    }

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    } catch (error) {
      this.logger.warn('SiteDataService: failed to clear caches', error);
    }
  }

  private async clearIndexedDb(): Promise<void> {
    if (!('indexedDB' in globalThis)) {
      return;
    }

    const dbNames = new Set(KNOWN_DB_NAMES);

    if (typeof indexedDB.databases === 'function') {
      try {
        const databases = await indexedDB.databases();
        for (const database of databases) {
          if (database.name) {
            dbNames.add(database.name);
          }
        }
      } catch (error) {
        this.logger.warn(
          'SiteDataService: failed to list IndexedDB databases',
          error
        );
      }
    }

    await Promise.all([...dbNames].map(name => this.deleteDatabase(name)));
  }

  private deleteDatabase(name: string): Promise<void> {
    return new Promise(resolve => {
      try {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => {
          resolve();
        };
        request.onerror = () => {
          resolve();
        };
        request.onblocked = () => {
          resolve();
        };
      } catch (error) {
        this.logger.warn(
          'SiteDataService: failed to delete IndexedDB database',
          name,
          error
        );
        resolve();
      }
    });
  }
}
