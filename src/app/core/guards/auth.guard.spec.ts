import { authGuard } from './auth.guard';
import {
  type AuthServiceGuardSpy,
  type GuardTestContext,
  type RouterGuardSpy,
  setupGuardTestContext,
} from '../../../test/guard-spec.helpers';
import { Router } from '@angular/router';

describe('authGuard', () => {
  let guardContext: GuardTestContext;
  let authService: AuthServiceGuardSpy;
  let router: RouterGuardSpy;

  beforeEach(() => {
    guardContext = setupGuardTestContext();
    authService = guardContext.authService;
    router = guardContext.router;
  });

  it('should allow activation when user has API key', async () => {
    authService.hasApiKey.mockReturnValue(true);

    const result = await guardContext.runGuard<boolean>(authGuard);

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to login when user has no API key', async () => {
    authService.hasApiKey.mockReturnValue(false);
    const loginUrl = {} as ReturnType<Router['parseUrl']>;
    router.parseUrl.mockReturnValue(loginUrl);

    const result =
      await guardContext.runGuard<ReturnType<Router['parseUrl']>>(authGuard);

    expect(result).toBe(loginUrl);
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });
});
