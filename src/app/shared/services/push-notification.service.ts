import { Injectable, InjectionToken, inject } from '@angular/core';
import { DiagnosticsService } from '../../core/services/diagnostics.service';

export type PermissionDenialReason =
  | 'not-supported'
  | 'denied-by-browser'
  | 'denied-by-user'
  | 'request-failed';

export interface PermissionResult {
  granted: boolean;
  denialReason?: PermissionDenialReason;
}

export interface NotificationChannel {
  isSupported(): boolean;
  getPermission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  showNotification(
    title: string,
    options: NotificationOptions
  ): Promise<void> | void;
}

const defaultNotificationChannel: NotificationChannel = {
  isSupported(): boolean {
    return typeof Notification !== 'undefined';
  },
  getPermission(): NotificationPermission {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }
    return Notification.permission;
  },
  requestPermission(): Promise<NotificationPermission> {
    if (
      typeof Notification === 'undefined' ||
      typeof Notification.requestPermission !== 'function'
    ) {
      return Promise.resolve('denied');
    }

    const result = Notification.requestPermission();
    if (result instanceof Promise) {
      return result.catch(() => 'denied');
    }
    return Promise.resolve(result);
  },
  async showNotification(
    title: string,
    options: NotificationOptions
  ): Promise<void> {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(title, options);
          return;
        }
      } catch {
        // Ignore and fall back to direct Notification usage below.
      }
    }

    if (typeof Notification !== 'undefined') {
      new Notification(title, options);
    }
  },
};

export const PUSH_NOTIFICATION_CHANNEL =
  new InjectionToken<NotificationChannel>('PUSH_NOTIFICATION_CHANNEL', {
    providedIn: 'root',
    factory: () => defaultNotificationChannel,
  });

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly channel = inject(PUSH_NOTIFICATION_CHANNEL);
  private readonly diagnostics = inject(DiagnosticsService);

  async isPrivateMode(): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return false;
    }

    try {
      const { quota } = await navigator.storage.estimate();
      // Heuristic: Chrome incognito quota is usually very low (< 128MB)
      // while regular mode is typically several GBs.
      return !!quota && quota < 128 * 1024 * 1024;
    } catch {
      return false;
    }
  }

  async ensurePermission(): Promise<PermissionResult> {
    const isSupported = this.channel.isSupported();
    this.diagnostics.log('info', 'push', 'Ensuring permission', {
      isSupported,
      hasNotification: typeof Notification !== 'undefined',
      hasServiceWorker:
        typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
      hasPushManager:
        typeof globalThis !== 'undefined' && 'PushManager' in globalThis,
    });

    if (!isSupported) {
      const result: PermissionResult = {
        granted: false,
        denialReason: 'not-supported',
      };
      this.diagnostics.log('warn', 'push', 'Permission denied', {
        reason: result.denialReason,
        granted: result.granted,
      });
      return result;
    }

    const current = this.channel.getPermission();
    this.diagnostics.log('info', 'push', 'Current permission state', {
      current,
    });

    if (current === 'granted') {
      this.diagnostics.log('info', 'push', 'Permission already granted');
      return { granted: true };
    }
    if (current === 'denied') {
      const result: PermissionResult = {
        granted: false,
        denialReason: 'denied-by-browser',
      };
      this.diagnostics.log('warn', 'push', 'Permission denied', {
        reason: result.denialReason,
        granted: result.granted,
        priorState: current,
      });
      return result;
    }

    try {
      const startTime = Date.now();
      const requestResult = await this.channel.requestPermission();
      const duration = Date.now() - startTime;

      this.diagnostics.log('info', 'push', 'Permission request result', {
        result: requestResult,
        priorState: current,
        duration,
      });

      if (requestResult === 'granted') {
        this.diagnostics.log('info', 'push', 'Permission granted by user');
        return { granted: true };
      }

      // If the permission was denied almost immediately (< 150ms), it's likely
      // blocked by the browser (e.g. Incognito mode or "always block").
      // Real user interaction usually takes at least 300ms-500ms.
      let isAutoDenied = requestResult === 'denied' && duration < 150;

      // If it wasn't instantly denied but still denied, check if we're in a
      // private/incognito mode which often blocks these requests by default.
      if (requestResult === 'denied' && !isAutoDenied) {
        if (await this.isPrivateMode()) {
          isAutoDenied = true;
        }
      }

      const result: PermissionResult = {
        granted: false,
        denialReason: isAutoDenied ? 'denied-by-browser' : 'denied-by-user',
      };

      this.diagnostics.log('warn', 'push', 'Permission denied', {
        reason: result.denialReason,
        granted: result.granted,
        requestResult,
        priorState: current,
        duration,
        isAutoDenied,
      });

      return result;
    } catch (error) {
      this.diagnostics.log(
        'error',
        'push',
        'Error requesting permission',
        { priorState: current },
        error
      );
      return { granted: false, denialReason: 'request-failed' };
    }
  }
}
