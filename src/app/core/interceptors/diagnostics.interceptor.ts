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
import { DiagnosticsService } from '../services/diagnostics.service';

export const diagnosticsInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const diagnostics = inject(DiagnosticsService);

  if (!diagnostics.isEnabled() || request.url.includes('/api/diagnostics')) {
    return next(request);
  }

  const startTime = Date.now();
  const correlationId = crypto.randomUUID();
  const url = new URL(request.url, globalThis.location.origin);
  const path = url.pathname;

  const parameters: Record<string, string | string[]> = {};
  for (const key of request.params.keys()) {
    const values = request.params.getAll(key);
    if (values) {
      parameters[key] = values.length === 1 ? values[0] : values;
    }
  }

  const parameterKeys = Object.keys(parameters);
  const isRequestBodyPresent =
    request.body !== null && request.body !== undefined;

  return next(request).pipe(
    tap({
      next: (event: HttpEvent<unknown>) => {
        if (!(event instanceof HttpResponse)) {
          return;
        }

        const duration = Date.now() - startTime;
        diagnostics.log(
          'info',
          'network',
          `Request successful: ${request.method} ${path}`,
          {
            method: request.method,
            path,
            status: event.status,
            duration,
            request: {
              paramKeys: parameterKeys,
              hasBody: isRequestBodyPresent,
            },
            response: {
              hasBody: event.body !== null && event.body !== undefined,
            },
          },
          undefined,
          correlationId
        );
      },
      error: (error: unknown) => {
        const duration = Date.now() - startTime;
        let status = 0;
        let responseBody: unknown;
        if (error instanceof HttpErrorResponse) {
          status = error.status;
          responseBody = error.error;
        }
        diagnostics.log(
          'error',
          'network',
          `Request failed: ${request.method} ${path}`,
          {
            method: request.method,
            path,
            status,
            duration,
            request: {
              paramKeys: parameterKeys,
              hasBody: isRequestBodyPresent,
            },
            response: {
              hasBody: responseBody !== null && responseBody !== undefined,
            },
          },
          error,
          correlationId
        );
      },
    })
  );
};
