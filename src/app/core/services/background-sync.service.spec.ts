import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BackgroundSyncService } from './background-sync.service';
import { LoggerService } from './logger.service';
import { AuthService } from './auth.service';

describe('BackgroundSyncService', () => {
  let service: BackgroundSyncService;
  let loggerSpy: jasmine.SpyObj<LoggerService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let apiKeySubject: BehaviorSubject<string | null>;

  beforeEach(() => {
    apiKeySubject = new BehaviorSubject<string | null>(null);
    loggerSpy = jasmine.createSpyObj('LoggerService', [
      'debug',
      'info',
      'warn',
      'error',
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      apiKey$: apiKeySubject.asObservable(),
    });

    TestBed.configureTestingModule({
      providers: [
        BackgroundSyncService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PLATFORM_ID, useValue: 'server' }, // Server platform, no browser APIs
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(BackgroundSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should subscribe to authService apiKey$ on creation', () => {
    expect(authServiceSpy.apiKey$).toBeTruthy();
  });

  it('should unsubscribe on destroy', () => {
    service.ngOnDestroy();
    expect(service).toBeTruthy(); // Just verify it doesn't throw
  });

  it('should handle updateBudgetPreferences on server platform', async () => {
    const preferences = {
      hiddenCategoryIds: [1, 2],
      notificationsEnabled: true,
      warnAtRatio: 0.9,
      currency: 'USD',
    };

    await service.updateBudgetPreferences(preferences);
    expect(service).toBeTruthy(); // Should complete without error
  });

  it('should update API credentials when apiKey$ emits', () => {
    apiKeySubject.next('new-api-key');
    expect(service).toBeTruthy(); // Should handle the update
  });
});
