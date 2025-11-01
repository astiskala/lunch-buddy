import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs';
import { BackgroundSyncService } from './core/services/background-sync.service';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator.component';
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    OfflineIndicatorComponent,
  ],
})
export class App implements OnInit {
  protected readonly _backgroundSyncService = inject(BackgroundSyncService);
  protected readonly _swUpdate = inject(SwUpdate);

  public ngOnInit(): void {
    this._swUpdate.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY'
        ),
        map(event => ({
          type: 'UPDATE_AVAILABLE',
          current: event.currentVersion,
          available: event.latestVersion,
        }))
      )
      .subscribe(() => {
        this._swUpdate
          .activateUpdate()
          .then(() => {
            this.reloadPage();
          })
          .catch((error: unknown) => {
            console.error('Failed to activate update:', error);
          });
      });
  }

  protected reloadPage(): void {
    globalThis.location.reload();
  }
}
