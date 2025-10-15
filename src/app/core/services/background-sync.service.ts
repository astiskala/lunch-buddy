import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

const PERIODIC_SYNC_TAG = 'lunchbuddy-daily-budget-sync';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_API_BASE = 'https://dev.lunchmoney.app/v1';

type PeriodicSyncManager = {
  getTags(): Promise<string[]>;
  register(tag: string, options: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
};

type SyncManager = {
  register(tag: string): Promise<void>;
};

interface BudgetPreferencesPayload {
  hiddenCategoryIds: number[];
  notificationsEnabled: boolean;
  warnAtRatio: number;
  currency: string | null;
}

interface BackgroundConfigPayload {
  apiKey: string | null;
  apiBaseUrl: string;
  preferences: BudgetPreferencesPayload;
}

@Injectable({
  providedIn: 'root',
})
export class BackgroundSyncService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly apiBaseUrl = environment.lunchmoneyApiBase ?? DEFAULT_API_BASE;

  private registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
  private currentConfig: BackgroundConfigPayload = {
    apiKey: null,
    apiBaseUrl: this.apiBaseUrl,
    preferences: {
      hiddenCategoryIds: [],
      notificationsEnabled: false,
      warnAtRatio: 0.85,
      currency: null,
    },
  };

  async updateApiCredentials(apiKey: string | null): Promise<void> {
    this.currentConfig = {
      ...this.currentConfig,
      apiKey,
    };

    if (!this.isBrowser()) {
      return;
    }

    await this.pushConfig();
    await this.refreshSyncRegistration();
  }

  async updateBudgetPreferences(preferences: BudgetPreferencesPayload): Promise<void> {
    this.currentConfig = {
      ...this.currentConfig,
      preferences: {
        ...preferences,
      },
    };

    if (!this.isBrowser()) {
      return;
    }

    await this.pushConfig();
    await this.refreshSyncRegistration();
  }

  private async pushConfig(): Promise<void> {
    const registration = await this.getRegistration();
    if (!registration) {
      return;
    }

    const worker = registration.active ?? registration.waiting ?? registration.installing;
    if (!worker) {
      return;
    }

    const message = {
      type: 'LUNCHBUDDY_CONFIG_UPDATE',
      payload: this.currentConfig,
    };

    try {
      worker.postMessage(message);
    } catch (error) {
      this.logger.error('BackgroundSyncService: failed to post config to service worker', error);
    }
  }

  private async refreshSyncRegistration(): Promise<void> {
    const registration = await this.getRegistration();
    if (!registration) {
      return;
    }

    const notificationsEnabled = this.currentConfig.preferences.notificationsEnabled;
    const hasCredentials = !!this.currentConfig.apiKey;

    if (!notificationsEnabled || !hasCredentials) {
      await this.unregisterPeriodicSync(registration);
      return;
    }

    if ('periodicSync' in registration) {
      const periodicSync = (registration as ServiceWorkerRegistration & {
        periodicSync?: PeriodicSyncManager;
      }).periodicSync;

      if (periodicSync) {
        try {
          const tags = await periodicSync.getTags();
          if (!tags.includes(PERIODIC_SYNC_TAG)) {
            await periodicSync.register(PERIODIC_SYNC_TAG, {
              minInterval: ONE_DAY_MS,
            });
          }
        } catch (error) {
          this.logger.warn('BackgroundSyncService: periodic sync unavailable', error);
          await this.registerOneOffSync(registration);
        }
        return;
      }
    }

    await this.registerOneOffSync(registration);
  }

  private async registerOneOffSync(registration: ServiceWorkerRegistration): Promise<void> {
    if ('sync' in registration) {
      const syncManager = (registration as ServiceWorkerRegistration & {
        sync?: SyncManager;
      }).sync;

      if (syncManager) {
        try {
          await syncManager.register(PERIODIC_SYNC_TAG);
        } catch (error) {
          this.logger.warn('BackgroundSyncService: sync registration failed', error);
        }
      }
    }
  }

  private async unregisterPeriodicSync(registration: ServiceWorkerRegistration): Promise<void> {
    if ('periodicSync' in registration) {
      const periodicSync = (registration as ServiceWorkerRegistration & {
        periodicSync?: PeriodicSyncManager;
      }).periodicSync;

      if (periodicSync) {
        try {
          const tags = await periodicSync.getTags();
          await Promise.all(
            tags.filter((tag: string) => tag === PERIODIC_SYNC_TAG).map((tag: string) => periodicSync.unregister(tag)),
          );
        } catch (error) {
          this.logger.warn('BackgroundSyncService: failed to unregister periodic sync', error);
        }
      }
    }
  }

  private async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isBrowser() || !('serviceWorker' in navigator)) {
      return null;
    }

    if (!this.registrationPromise) {
      this.registrationPromise = this.resolveRegistration();
    }

    try {
      const registration = await this.registrationPromise;
      if (!registration) {
        this.registrationPromise = null;
      }
      return registration;
    } catch {
      this.registrationPromise = null;
      return null;
    }
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private async resolveRegistration(): Promise<ServiceWorkerRegistration | null> {
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (existing) {
        return existing;
      }
    } catch {
      // Ignore lookup failures and fall back to readiness check.
    }

    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));
      const registration = await Promise.race([navigator.serviceWorker.ready, timeout]);
      return registration ?? null;
    } catch {
      return null;
    }
  }
}
