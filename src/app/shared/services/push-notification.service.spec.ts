import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  NotificationChannel,
  PUSH_NOTIFICATION_CHANNEL,
  PushNotificationService,
} from './push-notification.service';
import { vi, type Mock } from 'vitest';

interface MockNotificationCtor {
  permission: NotificationPermission;
  requestPermission: Mock<
    () => NotificationPermission | Promise<NotificationPermission>
  >;
  instances: { title: string; options?: NotificationOptions }[];
  new (title: string, options?: NotificationOptions): unknown;
}

type MutableGlobalWithNotification = Omit<typeof globalThis, 'Notification'> & {
  Notification?: typeof Notification;
};

type MutableNavigatorWithServiceWorker = Omit<Navigator, 'serviceWorker'> & {
  serviceWorker?: ServiceWorkerContainer;
};

class MockNotificationChannel implements NotificationChannel {
  supported = true;
  permission: NotificationPermission = 'default';
  requestPermissionSpy = vi.fn<() => Promise<NotificationPermission>>();

  isSupported(): boolean {
    return this.supported;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  requestPermission(): Promise<NotificationPermission> {
    return this.requestPermissionSpy();
  }

  // Not used in the simplified service but required by the interface.
  showNotification(): Promise<void> | void {
    return undefined;
  }

  reset(): void {
    this.supported = true;
    this.permission = 'default';
    this.requestPermissionSpy.mockClear();
  }
}

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let channel: MockNotificationChannel;

  beforeEach(() => {
    channel = new MockNotificationChannel();
    channel.requestPermissionSpy.mockResolvedValue('granted');

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PushNotificationService,
        {
          provide: PUSH_NOTIFICATION_CHANNEL,
          useValue: channel,
        },
      ],
    });

    service = TestBed.inject(PushNotificationService);
  });

  afterEach(() => {
    channel.reset();
    TestBed.resetTestingModule();
  });

  it('returns not-supported when notifications are not supported', async () => {
    channel.supported = false;

    const result = await service.ensurePermission();
    expect(result).toEqual({ granted: false, denialReason: 'not-supported' });
    expect(channel.requestPermissionSpy).not.toHaveBeenCalled();
  });

  it('returns granted when permission already granted', async () => {
    channel.permission = 'granted';

    const result = await service.ensurePermission();
    expect(result).toEqual({ granted: true });
    expect(channel.requestPermissionSpy).not.toHaveBeenCalled();
  });

  it('requests permission when status is default', async () => {
    channel.permission = 'default';

    const result = await service.ensurePermission();
    expect(result).toEqual({ granted: true });
    expect(channel.requestPermissionSpy).toHaveBeenCalledTimes(1);
  });

  it('returns denied-by-user when permission request is denied by user', async () => {
    channel.permission = 'default';
    channel.requestPermissionSpy.mockImplementation(async () => {
      // Simulate user decision latency.
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'denied';
    });

    const result = await service.ensurePermission();
    expect(result).toEqual({ granted: false, denialReason: 'denied-by-user' });
    expect(channel.requestPermissionSpy).toHaveBeenCalledTimes(1);
  });

  it('returns denied-by-browser when permission is instantly denied (auto-denied)', async () => {
    channel.permission = 'default';
    channel.requestPermissionSpy.mockResolvedValue('denied');

    const result = await service.ensurePermission();
    expect(result).toEqual({
      granted: false,
      denialReason: 'denied-by-browser',
    });
    expect(channel.requestPermissionSpy).toHaveBeenCalledTimes(1);
  });

  it('returns denied-by-browser when permission is denied and private mode is detected', async () => {
    channel.permission = 'default';
    channel.requestPermissionSpy.mockImplementation(async () => {
      // Simulate user decision latency so timing logic does not trigger.
      await new Promise(resolve => setTimeout(resolve, 200));
      return 'denied';
    });

    vi.spyOn(service, 'isPrivateMode').mockResolvedValue(true);

    const result = await service.ensurePermission();
    expect(result).toEqual({
      granted: false,
      denialReason: 'denied-by-browser',
    });
  });

  it('returns denied-by-browser when permission is already denied', async () => {
    channel.permission = 'denied';

    const result = await service.ensurePermission();
    expect(result).toEqual({
      granted: false,
      denialReason: 'denied-by-browser',
    });
    expect(channel.requestPermissionSpy).not.toHaveBeenCalled();
  });

  it('returns request-failed when the permission request fails', async () => {
    channel.permission = 'default';
    const failure = new Error('request failed');
    channel.requestPermissionSpy.mockReturnValue(Promise.reject(failure));

    const result = await service.ensurePermission();
    expect(result).toEqual({ granted: false, denialReason: 'request-failed' });
    expect(channel.requestPermissionSpy).toHaveBeenCalledTimes(1);
  });
});

describe('default notification channel', () => {
  let channel: NotificationChannel;
  let notificationBackup: typeof Notification | undefined;
  let serviceWorkerDescriptor: PropertyDescriptor | undefined;
  let requestPermissionSpy: Mock<
    () => NotificationPermission | Promise<NotificationPermission>
  >;
  let showNotificationSpy: Mock<
    (title: string, options?: NotificationOptions) => Promise<void>
  >;
  let getRegistrationSpy: Mock<
    () => Promise<ServiceWorkerRegistration | undefined>
  >;
  let mockNotificationCtor: MockNotificationCtor;
  let globalWithNotification: MutableGlobalWithNotification | undefined;
  let navigatorWithServiceWorker: MutableNavigatorWithServiceWorker | undefined;

  beforeEach(() => {
    requestPermissionSpy = vi.fn().mockReturnValue(Promise.resolve('granted'));
    showNotificationSpy = vi.fn().mockReturnValue(Promise.resolve());

    class TestNotification {
      static readonly permission: NotificationPermission = 'default';
      static readonly requestPermission = requestPermissionSpy;
      static readonly instances: {
        title: string;
        options?: NotificationOptions;
      }[] = [];

      constructor(
        public title: string,
        public options?: NotificationOptions
      ) {
        TestNotification.instances.push({ title, options });
      }
    }

    mockNotificationCtor = TestNotification as unknown as MockNotificationCtor;
    globalWithNotification = globalThis as MutableGlobalWithNotification;
    notificationBackup = globalWithNotification.Notification;
    globalWithNotification.Notification =
      TestNotification as unknown as typeof Notification;

    serviceWorkerDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'serviceWorker'
    );
    getRegistrationSpy = vi.fn().mockReturnValue(
      Promise.resolve({
        showNotification: showNotificationSpy,
      } as unknown as ServiceWorkerRegistration)
    );
    navigatorWithServiceWorker = navigator as MutableNavigatorWithServiceWorker;
    Object.defineProperty(navigatorWithServiceWorker, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistration: getRegistrationSpy,
      },
    });

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    channel = TestBed.inject(PUSH_NOTIFICATION_CHANNEL);
  });

  afterEach(() => {
    const notificationHost =
      globalWithNotification ?? (globalThis as MutableGlobalWithNotification);
    if (notificationBackup) {
      notificationHost.Notification = notificationBackup;
    } else {
      Reflect.deleteProperty(notificationHost, 'Notification');
    }
    const navigatorHost =
      navigatorWithServiceWorker ??
      (navigator as MutableNavigatorWithServiceWorker);
    if (serviceWorkerDescriptor) {
      Object.defineProperty(
        navigatorHost,
        'serviceWorker',
        serviceWorkerDescriptor
      );
    } else {
      Reflect.deleteProperty(navigatorHost, 'serviceWorker');
    }
    TestBed.resetTestingModule();
  });

  it('reports support when Notification API is available', () => {
    expect(channel.isSupported()).toBe(true);
  });

  it('reads existing permission state from the Notification API', () => {
    mockNotificationCtor.permission = 'granted';
    expect(channel.getPermission()).toBe('granted');
  });

  it('resolves permission requests', async () => {
    const result = await channel.requestPermission();
    expect(result).toBe('granted');
    expect(requestPermissionSpy).toHaveBeenCalled();
  });

  it('treats permission request errors as denied', async () => {
    requestPermissionSpy.mockReturnValue(Promise.reject(new Error('fail')));
    const result = await channel.requestPermission();
    expect(result).toBe('denied');
  });

  it('delegates notifications to the service worker registration when available', async () => {
    await channel.showNotification('Hello', { body: 'world' });

    expect(getRegistrationSpy).toHaveBeenCalled();
    expect(showNotificationSpy).toHaveBeenCalledWith('Hello', {
      body: 'world',
    });
    expect(mockNotificationCtor.instances.length).toBe(0);
  });

  it('falls back to Notification constructor when no registration exists', async () => {
    getRegistrationSpy.mockReturnValue(Promise.resolve(undefined));

    await channel.showNotification('Fallback', { body: 'offline' });

    expect(mockNotificationCtor.instances.length).toBe(1);
    expect(mockNotificationCtor.instances[0]).toEqual({
      title: 'Fallback',
      options: { body: 'offline' },
    });
  });

  it('falls back to Notification constructor when registration lookup fails', async () => {
    getRegistrationSpy.mockReturnValue(Promise.reject(new Error('sw failure')));

    await channel.showNotification('Failure', { body: 'fallback' });

    expect(mockNotificationCtor.instances.length).toBe(1);
    expect(mockNotificationCtor.instances[0]).toEqual({
      title: 'Failure',
      options: { body: 'fallback' },
    });
  });
});
