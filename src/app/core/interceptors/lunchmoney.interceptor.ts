import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const lunchmoneyInterceptor: HttpInterceptorFn = (request, next) => {
  const LUNCH_MONEY_HOSTS = new Set([
    'api.lunchmoney.dev',
    'api.lunchmoney.app',
    'dev.lunchmoney.app',
  ]);

  const normalizeBaseUrl = (baseUrl: string): string => {
    let url = baseUrl;
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  };

  const isLunchMoneyRequest = (): boolean => {
    let requestUrl: URL | null = null;
    try {
      requestUrl = new URL(request.url, globalThis.location.origin);
    } catch {
      // URL parsing failed; requestUrl remains null.
    }

    if (
      requestUrl &&
      LUNCH_MONEY_HOSTS.has(requestUrl.hostname) &&
      requestUrl.pathname.startsWith('/v2/')
    ) {
      return true;
    }

    const apiBase = normalizeBaseUrl(environment.lunchmoneyApiBase);
    if (!apiBase) {
      return false;
    }

    if (apiBase.startsWith('/')) {
      const normalizedPath = apiBase.endsWith('/') ? apiBase : `${apiBase}/`;
      if (request.url === apiBase || request.url.startsWith(normalizedPath)) {
        return true;
      }

      return (
        requestUrl !== null &&
        (requestUrl.pathname === apiBase ||
          requestUrl.pathname.startsWith(normalizedPath))
      );
    }

    try {
      const parsedBase = new URL(apiBase);
      const normalizedPath = parsedBase.pathname.endsWith('/')
        ? parsedBase.pathname
        : `${parsedBase.pathname}/`;

      return (
        requestUrl !== null &&
        requestUrl.origin === parsedBase.origin &&
        (requestUrl.pathname === parsedBase.pathname ||
          requestUrl.pathname.startsWith(normalizedPath))
      );
    } catch {
      return request.url.startsWith(apiBase);
    }
  };

  // Add the auth header only for Lunch Money API requests.
  if (!isLunchMoneyRequest()) {
    return next(request);
  }

  const authService = inject(AuthService);

  // Wait for secure storage before reading the API key.
  return from(authService.ready()).pipe(
    switchMap(() => {
      // Prefer secure storage, then fall back to environment values for development.
      const apiKey = authService.getApiKey() ?? environment.lunchmoneyApiKey;

      if (!apiKey) {
        return next(request);
      }

      const clonedRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return next(clonedRequest);
    })
  );
};
