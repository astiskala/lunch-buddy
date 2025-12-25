import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { OfflineService } from '../../../core/services/offline.service';

@Component({
  selector: 'app-offline-indicator',
  templateUrl: './offline-indicator.component.html',
  styleUrls: ['./offline-indicator.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OfflineIndicatorComponent {
  private readonly offlineService = inject(OfflineService);
  protected readonly isOffline = this.offlineService.getOfflineStatus();
}
