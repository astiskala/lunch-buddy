import {
  ErrorHandler,
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { DiagnosticsErrorHandler } from '../services/diagnostics-error-handler.service';

export function provideDiagnostics(): EnvironmentProviders {
  return makeEnvironmentProviders([
    DiagnosticsErrorHandler,
    {
      provide: ErrorHandler,
      useClass: DiagnosticsErrorHandler,
    },
    provideAppInitializer(() => {
      inject(DiagnosticsErrorHandler).initGlobalListeners();
    }),
  ]);
}
