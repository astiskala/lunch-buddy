import { Injectable, inject } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class AppUpdateService {
  private readonly logger = inject(LoggerService);
  private readonly swUpdate = inject(SwUpdate, { optional: true });

  constructor() {
    if (!this.swUpdate || !this.swUpdate.isEnabled) {
      this.logger.debug('AppUpdateService: service worker updates disabled');
      return;
    }

    this.subscribeToUpdates();
    void this.swUpdate
      .checkForUpdate()
      .catch((error: unknown) => { this.logger.warn('AppUpdateService: checkForUpdate failed', error); });
  }

  private subscribeToUpdates(): void {
    this.swUpdate?.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.logger.info('AppUpdateService: new version ready, activating');
        void this.activateAndReload();
      }
    });
  }

  private async activateAndReload(): Promise<void> {
    try {
      await this.swUpdate?.activateUpdate();
    } catch (error) {
      this.logger.warn('AppUpdateService: activateUpdate failed', error);
    } finally {
      if (typeof window !== 'undefined' && 'location' in window) {
        window.location.reload();
      } else {
        this.logger.warn('AppUpdateService: unable to reload window');
      }
    }
  }
}
