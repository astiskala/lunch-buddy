import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { BackgroundSyncService } from './core/services/background-sync.service';
import { AppUpdateService } from './core/services/app-update.service';
import { OfflineIndicatorComponent } from './shared/components/offline-indicator/offline-indicator.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
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
  protected readonly _appUpdateService = inject(AppUpdateService);
  protected readonly _swUpdate = inject(SwUpdate);
  private readonly componentDestroyRef = inject(DestroyRef);

  public ngOnInit(): void {
    void this._appUpdateService.init().catch((error: unknown) => {
      console.error('Failed to initialize app updates:', error);
    });

    this._swUpdate.versionUpdates
      .pipe(
        filter(
          (event): event is VersionReadyEvent => event.type === 'VERSION_READY'
        ),
        takeUntilDestroyed(this.componentDestroyRef)
      )
      .subscribe(() => {
        void (async () => {
          try {
            await this._swUpdate.activateUpdate();
            this.reloadPage();
          } catch (error: unknown) {
            console.error('Failed to activate update:', error);
          }
        })();
      });
  }

  protected reloadPage(): void {
    globalThis.location.reload();
  }
}
