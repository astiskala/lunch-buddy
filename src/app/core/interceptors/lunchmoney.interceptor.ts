import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const lunchmoneyInterceptor: HttpInterceptorFn = (req, next) => {
  const normalizeBaseUrl = (baseUrl: string): string => {
    let url = baseUrl;
    while (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  };

  const isLunchMoneyRequest = (): boolean => {
    if (
      req.url.includes('lunchmoney.dev') ||
      req.url.includes('lunchmoney.app')
    ) {
      return true;
    }

    const apiBase = normalizeBaseUrl(environment.lunchmoneyApiBase);
    if (!apiBase) {
      return false;
    }

    if (apiBase.startsWith('/')) {
      return req.url.startsWith(apiBase);
    }

    try {
      const parsedBase = new URL(apiBase);
      return (
        req.url.startsWith(apiBase) || req.url.startsWith(parsedBase.pathname)
      );
    } catch {
      return req.url.startsWith(apiBase);
    }
  };

  // Only add auth header for Lunch Money API requests
  if (!isLunchMoneyRequest()) {
    return next(req);
  }

  const authService = inject(AuthService);

  // Wait for secure storage to be ready before attempting to read the API key
  return from(authService.ready()).pipe(
    switchMap(() => {
      // Try secure storage first, then fall back to environment (for development)
      const apiKey = authService.getApiKey() ?? environment.lunchmoneyApiKey;

      if (!apiKey) {
        return next(req);
      }

      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return next(clonedReq);
    })
  );
};
