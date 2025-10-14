import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ready();

  if (authService.hasApiKey()) {
    return true;
  }

  // Redirect to login if no API key
  return router.parseUrl('/login');
};
