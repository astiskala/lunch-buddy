import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService } from '../app/core/services/auth.service';
import {
  createSpyObj as createSpyObject,
  type SpyObj as SpyObject,
} from './vitest-spy';

interface AuthServiceStub {
  hasApiKey: () => boolean;
  ready: () => Promise<void>;
}

interface RouterStub {
  parseUrl: (url: string) => ReturnType<Router['parseUrl']>;
}

type GuardFunction = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => unknown;

export type AuthServiceGuardSpy = SpyObject<AuthServiceStub>;
export type RouterGuardSpy = SpyObject<RouterStub>;

export interface GuardTestContext {
  authService: AuthServiceGuardSpy;
  router: RouterGuardSpy;
  runGuard<T>(guard: GuardFunction): Promise<T>;
}

export const setupGuardTestContext = (): GuardTestContext => {
  const authService = createSpyObject<AuthServiceStub>('AuthService', [
    'hasApiKey',
    'ready',
  ]);
  const router = createSpyObject<RouterStub>('Router', ['parseUrl']);
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: AuthService, useValue: authService },
      { provide: Router, useValue: router },
    ],
  });

  authService.ready.mockResolvedValue();

  return {
    authService,
    router,
    runGuard<T>(guard: GuardFunction): Promise<T> {
      return Promise.resolve(
        TestBed.runInInjectionContext(() => guard(route, state) as T)
      );
    },
  };
};
