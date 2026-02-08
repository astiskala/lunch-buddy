import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { createSpyObj, type SpyObj } from '../../../test/vitest-spy';
import { BackgroundSyncService } from './background-sync.service';
import { LoggerService } from './logger.service';
import { AuthService } from './auth.service';

interface PrivateApi {
  updateApiCredentials(apiKey: string | null): Promise<void>;
  getRegistration(): Promise<ServiceWorkerRegistration | null>;
}

interface PeriodicSyncSpies {
  getTags: Mock<() => Promise<string[]>>;
  register: Mock<
    (tag: string, options: { minInterval: number }) => Promise<void>
  >;
  unregister: Mock<(tag: string) => Promise<void>>;
}

interface SyncSpies {
  register: Mock<(tag: string) => Promise<void>>;
}

interface RegistrationFixture {
  registration: ServiceWorkerRegistration;
  workerPostMessage: Mock<(message: unknown) => void>;
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

type BudgetPreferencesPayload = Parameters<
  BackgroundSyncService['updateBudgetPreferences']
>[0];

describe('BackgroundSyncService', () => {
  let loggerSpy: SpyObj<LoggerService>;
  let authServiceSpy: SpyObj<AuthService>;
  let apiKeySubject: BehaviorSubject<string | null>;

  const setup = (platformId: object | string = 'browser') => {
    apiKeySubject = new BehaviorSubject<string | null>(null);

    loggerSpy = createSpyObj<LoggerService>('LoggerService', [
      'debug',
      'info',
      'warn',
      'error',
    ]);

    authServiceSpy = createSpyObj<AuthService>('AuthService', [], {
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
      ? vi.fn().mockImplementation(overrides.worker.postMessage)
      : vi.fn();

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
        getTags: vi.fn().mockImplementation(() => getTagsImpl()),
        register: vi
          .fn()
          .mockImplementation((tag: string, options: { minInterval: number }) =>
            registerImpl(tag, options)
          ),
        unregister: vi
          .fn()
          .mockImplementation((tag: string) => unregisterImpl(tag)),
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
        register: vi
          .fn()
          .mockImplementation((tag: string) => registerImpl(tag)),
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
    let resolveFn: (value: T | PromiseLike<T>) => void = () => {
      throw new Error('Deferred resolver not initialized');
    };
    const promise = new Promise<T>(res => {
      resolveFn = res;
    });
    return {
      promise,
      resolve(value: T | PromiseLike<T>) {
        resolveFn(value);
      },
    };
  };

  const baseBudgetPreferences: BudgetPreferencesPayload = {
    hiddenCategoryIds: [],
    notificationsEnabled: true,
    currency: null,
  };

  const updateBudgetPreferences = (
    service: BackgroundSyncService,
    overrides: Partial<BudgetPreferencesPayload> = {}
  ) =>
    service.updateBudgetPreferences({
      ...baseBudgetPreferences,
      ...overrides,
    });

  const mockGetRegistration = (
    privateApi: PrivateApi,
    fixture: RegistrationFixture
  ) =>
    vi
      .spyOn(privateApi, 'getRegistration')
      .mockResolvedValue(fixture.registration);

  const expectLatestLogCall = (
    calls: [string, unknown][],
    expectedMessage: string,
    missingMessage: string
  ) => {
    expect(calls.length).toBeGreaterThan(0);
    const latestCall = calls.at(-1);
    expect(latestCall).toBeDefined();
    if (!latestCall) {
      throw new Error(missingMessage);
    }

    const [message, value] = latestCall;
    expect(message).toBe(expectedMessage);
    expect(value).toEqual(expect.any(Error));
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
      const getRegistrationSpy = vi
        .spyOn(service as unknown as PrivateApi, 'getRegistration')
        .mockResolvedValue(null);

      await service.updateBudgetPreferences({
        hiddenCategoryIds: [1, 2],
        notificationsEnabled: true,
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

      mockGetRegistration(privateApi, fixture);

      await privateApi.updateApiCredentials('test-api-key');
      await updateBudgetPreferences(service, { currency: 'USD' });
      const messageCall = fixture.workerPostMessage.mock.calls.at(-1);
      expect(messageCall).toBeDefined();
      if (!messageCall) {
        throw new Error('Expected worker postMessage to be called');
      }
      const [lastMessage] = messageCall;
      const payload = lastMessage as {
        type: string;
        payload: {
          apiKey: string | null;
          preferences: { notificationsEnabled: boolean };
        };
      };

      expect(payload.type).toBe('LUNCHBUDDY_CONFIG_UPDATE');
      expect(payload.payload.apiKey).toBe('test-api-key');
      expect(payload.payload.preferences.notificationsEnabled).toBe(true);

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

      mockGetRegistration(privateApi, fixture);

      await privateApi.updateApiCredentials('valid-key');
      await updateBudgetPreferences(service, { notificationsEnabled: false });

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

      mockGetRegistration(privateApi, fixture);

      await privateApi.updateApiCredentials('api-key');
      await updateBudgetPreferences(service, { notificationsEnabled: false });

      expectLatestLogCall(
        loggerSpy.warn.mock.calls as [string, unknown][],
        'BackgroundSyncService: failed to unregister periodic sync',
        'Expected warn logger to be called'
      );
    });

    it('falls back to one-off sync when periodic sync is unavailable', async () => {
      const fixture = createRegistration({
        periodicSync: {
          getTags: () => Promise.reject(new Error('periodic sync unavailable')),
        },
        sync: {},
      });

      mockGetRegistration(privateApi, fixture);

      await privateApi.updateApiCredentials('api-key');
      await updateBudgetPreferences(service);

      expectLatestLogCall(
        loggerSpy.warn.mock.calls as [string, unknown][],
        'BackgroundSyncService: periodic sync unavailable',
        'Expected warn logger to be called'
      );

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

      mockGetRegistration(privateApi, fixture);

      await privateApi.updateApiCredentials('api-key');
      await updateBudgetPreferences(service);

      expectLatestLogCall(
        loggerSpy.warn.mock.calls as [string, unknown][],
        'BackgroundSyncService: sync registration failed',
        'Expected warn logger to be called'
      );
    });

    it('logs when posting configuration to the worker fails', async () => {
      const fixture = createRegistration({
        worker: {
          postMessage: () => {
            throw new Error('postMessage failed');
          },
        },
      });

      mockGetRegistration(privateApi, fixture);

      await privateApi.updateApiCredentials('any-key');

      expectLatestLogCall(
        loggerSpy.error.mock.calls as [string, unknown][],
        'BackgroundSyncService: failed to post config to service worker',
        'Expected error logger to be called'
      );
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
          getRegistration: vi.fn().mockResolvedValue(null),
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
