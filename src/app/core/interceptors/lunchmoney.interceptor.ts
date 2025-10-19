import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const lunchmoneyInterceptor: HttpInterceptorFn = (req, next) => {
  // Only add auth header for Lunch Money API requests
  if (!req.url.includes('lunchmoney.app')) {
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
    }),
  );
};
