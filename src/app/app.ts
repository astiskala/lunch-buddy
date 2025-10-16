import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppUpdateService } from './core/services/app-update.service';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator.component';
import { OfflineService } from './core/services/offline.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OfflineIndicatorComponent],
  templateUrl: './app.html',
  host: {
    '[class.offline-mode]': 'isOffline()',
  },
})
export class App {
  private readonly _appUpdateService = inject(AppUpdateService);
  private readonly offlineService = inject(OfflineService);
  
  protected readonly isOffline = this.offlineService.getOfflineStatus();
}
