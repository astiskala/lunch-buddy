import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { AppUpdateService } from './core/services/app-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {
  private readonly _appUpdateService = inject(AppUpdateService);
}
