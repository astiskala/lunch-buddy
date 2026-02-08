import { Injectable, signal, OnDestroy } from '@angular/core';

/**
 * Service to track online/offline status and provide offline indicators.
 * Uses both navigator.onLine and a real connectivity heartbeat check.
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineService implements OnDestroy {
  protected readonly isOnline = signal(navigator.onLine);
  protected readonly isOffline = signal(!navigator.onLine);

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30s
  private readonly HEARTBEAT_URL = '/favicon.ico';

  constructor() {
    globalThis.window.addEventListener('online', this.handleOnlineEvent);
    globalThis.window.addEventListener('offline', this.handleOfflineEvent);

    if (navigator.onLine) {
      this.startHeartbeat();
    }
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
    globalThis.window.removeEventListener('online', this.handleOnlineEvent);
    globalThis.window.removeEventListener('offline', this.handleOfflineEvent);
  }

  private readonly handleOnlineEvent = () => {
    // navigator.onLine might be true but we might not have real connectivity
    void this.checkConnectivity();
    this.startHeartbeat();
  };

  private readonly handleOfflineEvent = () => {
    this.updateOnlineStatus(false);
    this.stopHeartbeat();
  };

  private async checkConnectivity(): Promise<void> {
    if (!navigator.onLine) {
      this.updateOnlineStatus(false);
      return;
    }

    try {
      // Use a cache-busting fetch to ensure we're reaching the server
      const response = await fetch(
        `${this.HEARTBEAT_URL}?t=${Date.now().toString()}`,
        {
          method: 'HEAD',
          cache: 'no-store',
        }
      );
      this.updateOnlineStatus(response.ok);
    } catch {
      this.updateOnlineStatus(false);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(
      () => void this.checkConnectivity(),
      this.HEARTBEAT_INTERVAL
    );
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private updateOnlineStatus(online: boolean): void {
    if (this.isOnline() !== online) {
      this.isOnline.set(online);
      this.isOffline.set(!online);
    }
  }

  getOnlineStatus() {
    return this.isOnline.asReadonly();
  }

  getOfflineStatus() {
    return this.isOffline.asReadonly();
  }
}
