import { ErrorHandler, Injectable, inject, isDevMode } from '@angular/core';
import { DiagnosticsService } from './diagnostics.service';

@Injectable()
export class DiagnosticsErrorHandler implements ErrorHandler {
  private readonly diagnostics = inject(DiagnosticsService);

  handleError(error: unknown): void {
    // Log to diagnostics when diagnostics are enabled.
    this.diagnostics.log('error', 'app', 'Unhandled exception', {}, error);

    // Continue standard console handling in development mode.
    if (isDevMode()) {
      console.error(error);
    }
  }

  /**
   * Initializes global listeners for non-Angular errors.
   */
  initGlobalListeners(): void {
    globalThis.addEventListener('error', event => {
      this.diagnostics.log(
        'error',
        'browser',
        'Window error',
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
        event.error
      );
    });

    globalThis.addEventListener(
      'unhandledrejection',
      (event: PromiseRejectionEvent) => {
        this.diagnostics.log(
          'error',
          'browser',
          'Unhandled promise rejection',
          {
            reason: event.reason as unknown,
          },
          event.reason
        );
      }
    );
  }
}
