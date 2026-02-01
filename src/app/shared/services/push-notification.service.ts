import { Injectable, InjectionToken, inject } from '@angular/core';
import { DiagnosticsService } from '../../core/services/diagnostics.service';

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

  async ensurePermission(): Promise<boolean> {
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
      return false;
    }

    const current = this.channel.getPermission();
    this.diagnostics.log('info', 'push', 'Current permission state', {
      current,
    });

    if (current === 'granted') {
      return true;
    }
    if (current === 'denied') {
      return false;
    }

    try {
      const result = await this.channel.requestPermission();
      this.diagnostics.log('info', 'push', 'Permission request result', {
        result,
      });
      return result === 'granted';
    } catch (error) {
      this.diagnostics.log(
        'error',
        'push',
        'Error requesting permission',
        {},
        error
      );
      return false;
    }
  }
}
