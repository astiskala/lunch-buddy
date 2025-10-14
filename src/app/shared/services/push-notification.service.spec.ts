import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BudgetProgress } from '../../core/models/lunchmoney.types';
import {
  NotificationChannel,
  PUSH_NOTIFICATION_CHANNEL,
  PushNotificationService,
} from './push-notification.service';

class MockNotificationChannel implements NotificationChannel {
  supported = true;
  permission: NotificationPermission = 'default';
  requestPermissionSpy = jasmine.createSpy('requestPermission');
  showNotificationSpy = jasmine.createSpy('showNotification');

  isSupported(): boolean {
    return this.supported;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  requestPermission(): Promise<NotificationPermission> {
    return this.requestPermissionSpy();
  }

  showNotification(title: string, options: NotificationOptions): Promise<void> | void {
    return this.showNotificationSpy(title, options);
  }

  reset(): void {
    this.permission = 'default';
    this.requestPermissionSpy.calls.reset();
    this.showNotificationSpy.calls.reset();
    this.supported = true;
  }
}

const sampleAlert = (overrides: Partial<BudgetProgress>): BudgetProgress => ({
  categoryId: 1,
  categoryName: 'Dining Out',
  categoryGroupName: null,
  groupId: null,
  isGroup: false,
  isIncome: false,
  excludeFromBudget: false,
  budgetAmount: 100,
  budgetCurrency: 'USD',
  spent: 120,
  remaining: -20,
  monthKey: '2025-01-01',
  numTransactions: 3,
  isAutomated: false,
  recurringTotal: 0,
  recurringItems: [],
  status: 'over',
  progressRatio: 1.2,
  ...overrides,
});

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
    service.resetAlertHistory();
  });

  afterEach(() => {
    channel.reset();
  });

  it('returns false when notifications are not supported', async () => {
    channel.supported = false;

    expect(await service.ensurePermission()).toBeFalse();
  });

  it('requests permission when status is default', async () => {
    channel.permission = 'default';

    await service.notifyBudgetAlerts([sampleAlert({})], { currency: 'USD' });

    expect(channel.requestPermissionSpy).toHaveBeenCalled();
    expect(channel.showNotificationSpy).toHaveBeenCalled();
  });

  it('skips notifications when permission is denied', async () => {
    channel.permission = 'default';
    channel.requestPermissionSpy.and.resolveTo('denied');

    await service.notifyBudgetAlerts([sampleAlert({})], { currency: 'USD' });

    expect(channel.showNotificationSpy).not.toHaveBeenCalled();
  });

  it('does not resend the same alert payload twice', async () => {
    channel.permission = 'granted';

    const alerts = [sampleAlert({})];
    await service.notifyBudgetAlerts(alerts, { currency: 'USD' });
    await service.notifyBudgetAlerts(alerts, { currency: 'USD' });

    expect(channel.showNotificationSpy).toHaveBeenCalledTimes(1);
  });

  it('aggregates multiple alerts into a summary notification', async () => {
    channel.permission = 'granted';

    const alerts = [
      sampleAlert({ categoryId: 1, categoryName: 'Dining', status: 'over' }),
      sampleAlert({
        categoryId: 2,
        categoryName: 'Groceries',
        status: 'at-risk',
        spent: 80,
        budgetAmount: 100,
      }),
    ];

    await service.notifyBudgetAlerts(alerts, { currency: 'USD' });

    const [title, options] = channel.showNotificationSpy.calls.argsFor(0);
    expect(title).toBe('Budget alerts: 2 categories');
    expect(options.body).toContain('Dining (over)');
    expect(options.body).toContain('Groceries (at risk)');
  });
});
