import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { loginRedirectGuard } from './login-redirect.guard';
import { AuthService } from '../services/auth.service';

describe('loginRedirectGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['ready', 'hasApiKey']);
    const routerSpy = jasmine.createSpyObj('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    authService.ready.and.returnValue(Promise.resolve());
  });

  it('should redirect to dashboard when user already has an API key', async () => {
    authService.hasApiKey.and.returnValue(true);
    const dashboardUrl = {} as ReturnType<Router['parseUrl']>;
    router.parseUrl.and.returnValue(dashboardUrl);

    const result = await TestBed.runInInjectionContext(() =>
      loginRedirectGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(result).toBe(dashboardUrl);
    expect(router.parseUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('should allow activation when user is not authenticated', async () => {
    authService.hasApiKey.and.returnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      loginRedirectGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Promise<boolean>,
    );

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });
});
