import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  type AuthServiceStub = {
    hasApiKey: () => boolean;
    ready: () => Promise<void>;
  };

  type RouterStub = {
    parseUrl: (url: string) => ReturnType<Router['parseUrl']>;
  };

  let authService: jasmine.SpyObj<AuthServiceStub>;
  let router: jasmine.SpyObj<RouterStub>;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj<AuthServiceStub>('AuthService', [
      'hasApiKey',
      'ready',
    ]);
    const routerSpy = jasmine.createSpyObj<RouterStub>('Router', ['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    authService = authServiceSpy;
    router = routerSpy;

    authService.ready.and.resolveTo();
  });

  it('should allow activation when user has API key', async () => {
    authService.hasApiKey.and.returnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Promise<boolean>,
    );

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to login when user has no API key', async () => {
    authService.hasApiKey.and.returnValue(false);
    const loginUrl = {} as ReturnType<Router['parseUrl']>;
    router.parseUrl.and.returnValue(loginUrl);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

    expect(result).toBe(loginUrl);
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });
});
