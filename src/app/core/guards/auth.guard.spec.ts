import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
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
      'hasApiKey',
      'ready',
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

  it('should allow activation when user has API key', async () => {
    authService.hasApiKey.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot
        ) as Promise<boolean>
    );

    expect(result).toBe(true);
    expect(router.parseUrl).not.toHaveBeenCalled();
  });

  it('should redirect to login when user has no API key', async () => {
    authService.hasApiKey.mockReturnValue(false);
    const loginUrl = {} as ReturnType<Router['parseUrl']>;
    router.parseUrl.mockReturnValue(loginUrl);

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(loginUrl);
    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });
});
