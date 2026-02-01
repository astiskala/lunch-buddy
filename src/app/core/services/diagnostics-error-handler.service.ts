import { ErrorHandler, Injectable, inject, isDevMode } from '@angular/core';
import { DiagnosticsService } from './diagnostics.service';

@Injectable()
export class DiagnosticsErrorHandler implements ErrorHandler {
  private readonly diagnostics = inject(DiagnosticsService);

  handleError(error: unknown): void {
    // Log to diagnostics if enabled
    this.diagnostics.log('error', 'app', 'Unhandled exception', {}, error);

    // Continue to standard handling (console) in dev mode
    if (isDevMode()) {
      console.error(error);
    }
  }

  /**
   * Initialize global listeners for non-Angular errors
   */
  initGlobalListeners() {
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
