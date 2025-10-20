import { Injectable, InjectionToken, inject } from '@angular/core';

export interface NotificationChannel {
  isSupported(): boolean;
  getPermission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  showNotification(title: string, options: NotificationOptions): Promise<void> | void;
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
    if (typeof Notification === 'undefined' || typeof Notification.requestPermission !== 'function') {
      return Promise.resolve('denied');
    }

    const result = Notification.requestPermission();
    if (result instanceof Promise) {
      return result.catch(() => 'denied');
    }
    return Promise.resolve(result);
  },
  async showNotification(title: string, options: NotificationOptions): Promise<void> {
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

export const PUSH_NOTIFICATION_CHANNEL = new InjectionToken<NotificationChannel>(
  'PUSH_NOTIFICATION_CHANNEL',
  {
    providedIn: 'root',
    factory: () => defaultNotificationChannel,
  },
);

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly channel = inject(PUSH_NOTIFICATION_CHANNEL);

  async ensurePermission(): Promise<boolean> {
    if (!this.channel.isSupported()) {
      return false;
    }

    const current = this.channel.getPermission();
    if (current === 'granted') {
      return true;
    }
    if (current === 'denied') {
      return false;
    }

    const result = await this.channel.requestPermission();
    return result === 'granted';
  }
}
