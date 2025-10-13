import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment.development';

export const lunchmoneyInterceptor: HttpInterceptorFn = (req, next) => {
  // Only add auth header for Lunch Money API requests
  if (req.url.includes('lunchmoney.app')) {
    const authService = inject(AuthService);

    // Try localStorage first, then fall back to environment (for development)
    const apiKey = authService.getApiKey() ?? environment.lunchmoneyApiKey;

    if (apiKey) {
      const clonedReq = req.clone({
        setHeaders: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      return next(clonedReq);
    }
  }

  return next(req);
};
