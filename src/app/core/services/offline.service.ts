import { Injectable, signal } from '@angular/core';

/**
 * Service to track online/offline status and provide offline indicators
 */
@Injectable({
  providedIn: 'root',
})
export class OfflineService {
  protected readonly isOnline = signal(navigator.onLine);
  protected readonly isOffline = signal(!navigator.onLine);

  constructor() {
    globalThis.window.addEventListener('online', () => { this.updateOnlineStatus(true); });
    globalThis.window.addEventListener('offline', () => { this.updateOnlineStatus(false); });
  }

  private updateOnlineStatus(online: boolean): void {
    this.isOnline.set(online);
    this.isOffline.set(!online);
  }

  getOnlineStatus() {
    return this.isOnline.asReadonly();
  }

  getOfflineStatus() {
    return this.isOffline.asReadonly();
  }
}
