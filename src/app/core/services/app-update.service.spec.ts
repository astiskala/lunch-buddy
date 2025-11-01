import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppUpdateService } from './app-update.service';
import { LoggerService } from './logger.service';

describe('AppUpdateService', () => {
  let loggerSpy: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    loggerSpy = jasmine.createSpyObj('LoggerService', [
      'debug',
      'info',
      'warn',
      'error',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: SwUpdate, useValue: null },
        provideZonelessChangeDetection(),
      ],
    });
  });

  it('should be created', () => {
    const service = TestBed.inject(AppUpdateService);
    expect(service).toBeTruthy();
  });

  it('should log when service worker is disabled', () => {
    TestBed.inject(AppUpdateService);

    expect(loggerSpy.debug).toHaveBeenCalledWith(
      'AppUpdateService: service worker updates disabled'
    );
  });

  it('should subscribe to version updates when enabled', () => {
    const versionUpdates$ = new Subject<VersionEvent>();
    const swUpdateMock = {
      isEnabled: true,
      versionUpdates: versionUpdates$,
      checkForUpdate: jasmine
        .createSpy('checkForUpdate')
        .and.returnValue(Promise.resolve(false)),
      activateUpdate: jasmine
        .createSpy('activateUpdate')
        .and.returnValue(Promise.resolve(true)),
    };

    // Reset TestBed with new config
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: SwUpdate, useValue: swUpdateMock },
        provideZonelessChangeDetection(),
      ],
    });

    TestBed.inject(AppUpdateService);
    expect(swUpdateMock.checkForUpdate).toHaveBeenCalled();
  });
});
