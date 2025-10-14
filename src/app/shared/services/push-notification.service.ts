import { Injectable, InjectionToken, inject } from '@angular/core';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import { formatCurrency } from '../utils/currency.util';

export interface NotificationChannel {
  isSupported(): boolean;
  getPermission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  showNotification(title: string, options: NotificationOptions): Promise<void> | void;
}

const FALLBACK_CURRENCY = 'USD';

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

    try {
      const result = Notification.requestPermission();
      if (result instanceof Promise) {
        return result;
      }
      return Promise.resolve(result);
    } catch {
      return Promise.resolve('denied');
    }
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

interface NotificationPayload {
  title: string;
  body: string;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly channel = inject(PUSH_NOTIFICATION_CHANNEL);
  private lastAlertSignature: string | null = null;

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

  async notifyBudgetAlerts(
    alerts: BudgetProgress[],
    context: { currency: string | null },
  ): Promise<void> {
    if (!alerts.length || !this.channel.isSupported()) {
      return;
    }

    const permissionGranted = await this.ensurePermission();
    if (!permissionGranted) {
      return;
    }

    const signature = this.buildSignature(alerts);
    if (signature === this.lastAlertSignature) {
      return;
    }
    this.lastAlertSignature = signature;

    const payload = this.buildPayload(alerts, context.currency);
    await this.channel.showNotification(payload.title, {
      body: payload.body,
      tag: 'lunch-buddy-budget-alerts',
    });
  }

  /** Clears tracked notifications. Primarily used for tests. */
  resetAlertHistory(): void {
    this.lastAlertSignature = null;
  }

  private buildSignature(alerts: BudgetProgress[]): string {
    return alerts
      .map((alert) => `${alert.categoryId}:${alert.status}`)
      .sort()
      .join('|');
  }

  private buildPayload(alerts: BudgetProgress[], currency: string | null): NotificationPayload {
    const preferredCurrency =
      currency ??
      alerts.find((alert) => alert.budgetCurrency)?.budgetCurrency ??
      FALLBACK_CURRENCY;

    if (alerts.length === 1) {
      const [alert] = alerts;
      const statusLabel = alert.status === 'over' ? 'over budget' : 'at risk';
      const spent = formatCurrency(alert.spent, alert.budgetCurrency ?? preferredCurrency, {
        fallbackCurrency: preferredCurrency,
      });
      const budget = formatCurrency(alert.budgetAmount, alert.budgetCurrency ?? preferredCurrency, {
        fallbackCurrency: preferredCurrency,
      });

      return {
        title: `${alert.categoryName} is ${statusLabel}`,
        body: `${spent} spent of ${budget}`,
      };
    }

    const summary = alerts
      .map((alert) => `${alert.categoryName} (${alert.status === 'over' ? 'over' : 'at risk'})`)
      .join(', ');

    return {
      title: `Budget alerts: ${alerts.length} categories`,
      body: summary,
    };
  }
}
