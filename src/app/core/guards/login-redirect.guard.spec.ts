import { loginRedirectGuard } from './login-redirect.guard';
import {
  type AuthServiceGuardSpy,
  type GuardTestContext,
  type RouterGuardSpy,
  setupGuardTestContext,
} from '../../../test/guard-spec.helpers';
import { Router } from '@angular/router';

describe('loginRedirectGuard', () => {
  let guardContext: GuardTestContext;
  let authService: AuthServiceGuardSpy;
  let router: RouterGuardSpy;

  beforeEach(() => {
    guardContext = setupGuardTestContext();
    authService = guardContext.authService;
    router = guardContext.router;
  });

  it('should redirect to dashboard when user already has an API key', async () => {
    authService.hasApiKey.mockReturnValue(true);
    const dashboardUrl = {} as ReturnType<Router['parseUrl']>;
    router.parseUrl.mockReturnValue(dashboardUrl);

    const result =
      await guardContext.runGuard<ReturnType<Router['parseUrl']>>(
        loginRedirectGuard
      );

    expect(result).toBe(dashboardUrl);
    expect(router.parseUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('should allow activation when user is not authenticated', async () => {
    authService.hasApiKey.mockReturnValue(false);

    const result = await guardContext.runGuard<boolean>(loginRedirectGuard);

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });
});
