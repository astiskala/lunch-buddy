import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  NotificationChannel,
  PUSH_NOTIFICATION_CHANNEL,
  PushNotificationService,
} from './push-notification.service';

class MockNotificationChannel implements NotificationChannel {
  supported = true;
  permission: NotificationPermission = 'default';
  requestPermissionSpy = jasmine.createSpy<() => Promise<NotificationPermission>>(
    'requestPermission',
  );

  isSupported(): boolean {
    return this.supported;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  requestPermission(): Promise<NotificationPermission> {
    return this.requestPermissionSpy();
  }

  // Not used in the simplified service but required by interface
  showNotification(): Promise<void> | void {
    return undefined;
  }

  reset(): void {
    this.supported = true;
    this.permission = 'default';
    this.requestPermissionSpy.calls.reset();
  }
}

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let channel: MockNotificationChannel;

  beforeEach(() => {
    channel = new MockNotificationChannel();
    channel.requestPermissionSpy.and.resolveTo('granted');

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
  });

  it('returns false when notifications are not supported', async () => {
    channel.supported = false;

    await expectAsync(service.ensurePermission()).toBeResolvedTo(false);
    expect(channel.requestPermissionSpy).not.toHaveBeenCalled();
  });

  it('returns true when permission already granted', async () => {
    channel.permission = 'granted';

    await expectAsync(service.ensurePermission()).toBeResolvedTo(true);
    expect(channel.requestPermissionSpy).not.toHaveBeenCalled();
  });

  it('requests permission when status is default', async () => {
    channel.permission = 'default';

    await expectAsync(service.ensurePermission()).toBeResolvedTo(true);
    expect(channel.requestPermissionSpy).toHaveBeenCalledTimes(1);
  });

  it('returns false when permission request is denied', async () => {
    channel.permission = 'default';
    channel.requestPermissionSpy.and.resolveTo('denied');

    await expectAsync(service.ensurePermission()).toBeResolvedTo(false);
    expect(channel.requestPermissionSpy).toHaveBeenCalledTimes(1);
  });
});
