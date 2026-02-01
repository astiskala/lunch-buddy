import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpResponse,
  HttpErrorResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { DiagnosticsService } from '../services/diagnostics.service';

export const diagnosticsInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const diagnostics = inject(DiagnosticsService);

  if (!diagnostics.isEnabled() || req.url.includes('/api/diagnostics')) {
    return next(req);
  }

  const startTime = Date.now();
  const correlationId = uuidv4();
  const url = new URL(req.url, globalThis.location.origin);
  const path = url.pathname;

  return next(req).pipe(
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          const duration = Date.now() - startTime;
          diagnostics.log(
            'info',
            'network',
            `Request successful: ${req.method} ${path}`,
            {
              method: req.method,
              path,
              status: event.status,
              duration,
              correlationId,
            }
          );
        }
      },
      error: (error: unknown) => {
        const duration = Date.now() - startTime;
        let status = 0;
        if (error instanceof HttpErrorResponse) {
          status = error.status;
        }
        diagnostics.log(
          'error',
          'network',
          `Request failed: ${req.method} ${path}`,
          {
            method: req.method,
            path,
            status,
            duration,
            correlationId,
          },
          error
        );
      },
    })
  );
};
