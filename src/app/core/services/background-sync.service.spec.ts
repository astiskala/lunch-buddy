import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BackgroundSyncService } from './background-sync.service';
import { LoggerService } from './logger.service';
import { AuthService } from './auth.service';

interface PrivateApi {
  updateApiCredentials(apiKey: string | null): Promise<void>;
  getRegistration(): Promise<ServiceWorkerRegistration | null>;
}

interface PeriodicSyncSpies {
  getTags: jasmine.Spy<() => Promise<string[]>>;
  register: jasmine.Spy<
    (tag: string, options: { minInterval: number }) => Promise<void>
  >;
  unregister: jasmine.Spy<(tag: string) => Promise<void>>;
}

interface SyncSpies {
  register: jasmine.Spy<(tag: string) => Promise<void>>;
}

interface RegistrationFixture {
  registration: ServiceWorkerRegistration;
  workerPostMessage: jasmine.Spy<(message: unknown) => void>;
  periodic?: PeriodicSyncSpies;
  sync?: SyncSpies;
}

interface RegistrationOverrides {
  periodicSync?: {
    getTags?: () => Promise<string[]>;
    register?: (tag: string, options: { minInterval: number }) => Promise<void>;
    unregister?: (tag: string) => Promise<void>;
  } | null;
  sync?: {
    register?: (tag: string) => Promise<void>;
  } | null;
  worker?: {
    postMessage?: (message: unknown) => void;
  };
}

describe('BackgroundSyncService', () => {
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let apiKeySubject: BehaviorSubject<string | null>;

  const setup = (platformId: object | string = 'browser') => {
    apiKeySubject = new BehaviorSubject<string | null>(null);

    loggerSpy = jasmine.createSpyObj<LoggerService>('LoggerService', [
      'debug',
      'info',
      'warn',
      'error',
    ]);

    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [], {
      apiKey$: apiKeySubject.asObservable(),
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        BackgroundSyncService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PLATFORM_ID, useValue: platformId },
        provideZonelessChangeDetection(),
      ],
    });

    const service = TestBed.inject(BackgroundSyncService);
    return { service };
  };

  const createRegistration = (
    overrides: RegistrationOverrides = {}
  ): RegistrationFixture => {
    const workerPostMessage = overrides.worker?.postMessage
      ? jasmine
          .createSpy('postMessage')
          .and.callFake(overrides.worker.postMessage)
      : jasmine.createSpy('postMessage');

    const registration = {
      active: { postMessage: workerPostMessage } as unknown as ServiceWorker,
    } as ServiceWorkerRegistration;

    const fixture: RegistrationFixture = {
      registration,
      workerPostMessage,
    };

    if (overrides.periodicSync !== undefined) {
      const getTagsImpl =
        overrides.periodicSync?.getTags ?? (() => Promise.resolve([]));
      const registerImpl =
        overrides.periodicSync?.register ??
        ((_tag: string, _options: { minInterval: number }) =>
          Promise.resolve());
      const unregisterImpl =
        overrides.periodicSync?.unregister ??
        ((_tag: string) => Promise.resolve());

      const periodic: PeriodicSyncSpies = {
        getTags: jasmine.createSpy('getTags').and.callFake(() => getTagsImpl()),
        register: jasmine
          .createSpy('registerPeriodicSync')
          .and.callFake((tag: string, options: { minInterval: number }) =>
            registerImpl(tag, options)
          ),
        unregister: jasmine
          .createSpy('unregisterPeriodicSync')
          .and.callFake((tag: string) => unregisterImpl(tag)),
      };

      (
        registration as unknown as { periodicSync: PeriodicSyncSpies }
      ).periodicSync = periodic;
      fixture.periodic = periodic;
    }

    if (overrides.sync !== undefined) {
      const registerImpl =
        overrides.sync?.register ?? ((_tag: string) => Promise.resolve());

      const sync: SyncSpies = {
        register: jasmine
          .createSpy('registerSync')
          .and.callFake((tag: string) => registerImpl(tag)),
      };

      (registration as unknown as { sync: SyncSpies }).sync = sync;
      fixture.sync = sync;
    }

    return fixture;
  };

  const expectPeriodicSync = (
    fixture: RegistrationFixture
  ): PeriodicSyncSpies => {
    expect(fixture.periodic).toBeDefined();
    if (!fixture.periodic) {
      throw new Error('Periodic sync spies not initialized');
    }

    return fixture.periodic;
  };

  const expectSyncManager = (fixture: RegistrationFixture): SyncSpies => {
    expect(fixture.sync).toBeDefined();
    if (!fixture.sync) {
      throw new Error('Sync manager spies not initialized');
    }

    return fixture.sync;
  };

  const createDeferred = <T>() => {
    let resolveFn: ((value: T | PromiseLike<T>) => void) | undefined;
    const promise = new Promise<T>(res => {
      resolveFn = res;
    });
    if (!resolveFn) {
      throw new Error('Promise executor did not run synchronously');
    }
    return { promise, resolve: resolveFn };
  };

  describe('on the server platform', () => {
    let service: BackgroundSyncService;

    beforeEach(() => {
      ({ service } = setup('server'));
    });

    it('creates the service', () => {
      expect(service).toBeTruthy();
    });

    it('unsubscribes cleanly on destroy', () => {
      expect(() => {
        service.ngOnDestroy();
      }).not.toThrow();
    });

    it('skips browser-only work when updating preferences', async () => {
      const getRegistrationSpy = spyOn(
        service as unknown as PrivateApi,
        'getRegistration'
      ).and.stub();

      await service.updateBudgetPreferences({
        hiddenCategoryIds: [1, 2],
        notificationsEnabled: true,
        warnAtRatio: 0.9,
        currency: 'USD',
      });

      expect(getRegistrationSpy).not.toHaveBeenCalled();
    });

    it('reacts to api key emissions without throwing', () => {
      expect(() => {
        apiKeySubject.next('new-key');
      }).not.toThrow();
    });
  });

  describe('in the browser platform', () => {
    let service: BackgroundSyncService;
    let privateApi: PrivateApi;

    beforeEach(() => {
      ({ service } = setup('browser'));
      privateApi = service as unknown as PrivateApi;
    });

    it('pushes configuration updates and registers periodic sync', async () => {
      const fixture = createRegistration({ periodicSync: {} });

      spyOn(privateApi, 'getRegistration').and.resolveTo(fixture.registration);

      await privateApi.updateApiCredentials('test-api-key');
      await service.updateBudgetPreferences({
        hiddenCategoryIds: [],
        notificationsEnabled: true,
        warnAtRatio: 0.75,
        currency: 'USD',
      });

      const payload = fixture.workerPostMessage.calls.mostRecent().args[0] as {
        type: string;
        payload: {
          apiKey: string | null;
          preferences: { notificationsEnabled: boolean };
        };
      };

      expect(payload.type).toBe('LUNCHBUDDY_CONFIG_UPDATE');
      expect(payload.payload.apiKey).toBe('test-api-key');
      expect(payload.payload.preferences.notificationsEnabled).toBeTrue();

      const periodic = expectPeriodicSync(fixture);
      expect(periodic.getTags).toHaveBeenCalled();
      expect(periodic.register).toHaveBeenCalledWith(
        'lunchbuddy-daily-budget-sync',
        { minInterval: 86_400_000 }
      );
    });

    it('unregisters periodic sync when notifications are disabled', async () => {
      const fixture = createRegistration({
        periodicSync: {
          getTags: () => Promise.resolve(['lunchbuddy-daily-budget-sync']),
        },
      });

      spyOn(privateApi, 'getRegistration').and.resolveTo(fixture.registration);

      await privateApi.updateApiCredentials('valid-key');
      await service.updateBudgetPreferences({
        hiddenCategoryIds: [],
        notificationsEnabled: false,
        warnAtRatio: 0.5,
        currency: null,
      });

      const periodic = expectPeriodicSync(fixture);
      expect(periodic.getTags).toHaveBeenCalled();
      expect(periodic.unregister).toHaveBeenCalledWith(
        'lunchbuddy-daily-budget-sync'
      );
    });

    it('logs when unregistering periodic sync fails', async () => {
      const fixture = createRegistration({
        periodicSync: {
          getTags: () => Promise.reject(new Error('unregister failed')),
        },
      });

      spyOn(privateApi, 'getRegistration').and.resolveTo(fixture.registration);

      await privateApi.updateApiCredentials('api-key');
      await service.updateBudgetPreferences({
        hiddenCategoryIds: [],
        notificationsEnabled: false,
        warnAtRatio: 0.6,
        currency: null,
      });

      const warnCalls = loggerSpy.warn.calls;
      expect(warnCalls.any()).toBeTrue();
      const [warnMessage, warnError] = warnCalls.mostRecent().args;
      expect(warnMessage).toBe(
        'BackgroundSyncService: failed to unregister periodic sync'
      );
      expect(warnError).toEqual(jasmine.any(Error));
    });

    it('falls back to one-off sync when periodic sync is unavailable', async () => {
      const fixture = createRegistration({
        periodicSync: {
          getTags: () => Promise.reject(new Error('periodic sync unavailable')),
        },
        sync: {},
      });

      spyOn(privateApi, 'getRegistration').and.resolveTo(fixture.registration);

      await privateApi.updateApiCredentials('api-key');
      await service.updateBudgetPreferences({
        hiddenCategoryIds: [],
        notificationsEnabled: true,
        warnAtRatio: 0.5,
        currency: null,
      });

      const warnCalls = loggerSpy.warn.calls;
      expect(warnCalls.any()).toBeTrue();
      const [warnMessage, warnError] = warnCalls.mostRecent().args;
      expect(warnMessage).toBe(
        'BackgroundSyncService: periodic sync unavailable'
      );
      expect(warnError).toEqual(jasmine.any(Error));

      const sync = expectSyncManager(fixture);
      expect(sync.register).toHaveBeenCalledWith(
        'lunchbuddy-daily-budget-sync'
      );
    });

    it('logs when registering a fallback sync fails', async () => {
      const fixture = createRegistration({
        periodicSync: {
          getTags: () => Promise.reject(new Error('periodic sync unavailable')),
        },
        sync: {
          register: () => Promise.reject(new Error('sync failed')),
        },
      });

      spyOn(privateApi, 'getRegistration').and.resolveTo(fixture.registration);

      await privateApi.updateApiCredentials('api-key');
      await service.updateBudgetPreferences({
        hiddenCategoryIds: [],
        notificationsEnabled: true,
        warnAtRatio: 0.5,
        currency: null,
      });

      const warnCalls = loggerSpy.warn.calls;
      expect(warnCalls.any()).toBeTrue();
      const [warnMessage, warnError] = warnCalls.mostRecent().args;
      expect(warnMessage).toBe(
        'BackgroundSyncService: sync registration failed'
      );
      expect(warnError).toEqual(jasmine.any(Error));
    });

    it('logs when posting configuration to the worker fails', async () => {
      const fixture = createRegistration({
        worker: {
          postMessage: () => {
            throw new Error('postMessage failed');
          },
        },
      });

      spyOn(privateApi, 'getRegistration').and.resolveTo(fixture.registration);

      await privateApi.updateApiCredentials('any-key');

      const errorCalls = loggerSpy.error.calls;
      expect(errorCalls.any()).toBeTrue();
      const [errorMessage, errorValue] = errorCalls.mostRecent().args;
      expect(errorMessage).toBe(
        'BackgroundSyncService: failed to post config to service worker'
      );
      expect(errorValue).toEqual(jasmine.any(Error));
    });

    it('waits for service worker readiness when none are registered yet', async () => {
      const readyDeferred = createDeferred<ServiceWorkerRegistration>();
      const registration = { scope: '/ready' } as ServiceWorkerRegistration;
      const serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
        navigator,
        'serviceWorker'
      );

      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: {
          getRegistration: jasmine
            .createSpy('getRegistration')
            .and.resolveTo(null),
          ready: readyDeferred.promise,
        },
      });

      try {
        const resultPromise = privateApi.getRegistration();
        readyDeferred.resolve(registration);
        const result = await resultPromise;

        expect(result).toBe(registration);
      } finally {
        if (serviceWorkerDescriptor) {
          Object.defineProperty(
            navigator,
            'serviceWorker',
            serviceWorkerDescriptor
          );
        } else {
          Reflect.deleteProperty(navigator, 'serviceWorker');
        }
      }
    });
  });
});
