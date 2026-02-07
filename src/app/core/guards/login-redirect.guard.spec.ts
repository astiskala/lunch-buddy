import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';
import { loginRedirectGuard } from './login-redirect.guard';
import { AuthService } from '../services/auth.service';

describe('loginRedirectGuard', () => {
  interface AuthServiceStub {
    hasApiKey: () => boolean;
    ready: () => Promise<void>;
  }

  interface RouterStub {
    parseUrl: (url: string) => ReturnType<Router['parseUrl']>;
  }

  let authService: SpyObj<AuthServiceStub>;
  let router: SpyObj<RouterStub>;

  beforeEach(() => {
    const authServiceSpy = createSpyObj<AuthServiceStub>('AuthService', [
      'ready',
      'hasApiKey',
    ]);
    const routerSpy = createSpyObj<RouterStub>('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = authServiceSpy;
    router = routerSpy;
    authService.ready.mockResolvedValue();
  });

  it('should redirect to dashboard when user already has an API key', async () => {
    authService.hasApiKey.mockReturnValue(true);
    const dashboardUrl = {} as ReturnType<Router['parseUrl']>;
    router.parseUrl.mockReturnValue(dashboardUrl);

    const result = await TestBed.runInInjectionContext(() =>
      loginRedirectGuard(
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot
      )
    );

    expect(result).toBe(dashboardUrl);
    expect(router.parseUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('should allow activation when user is not authenticated', async () => {
    authService.hasApiKey.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(
      () =>
        loginRedirectGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot
        ) as Promise<boolean>
    );

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });
});
