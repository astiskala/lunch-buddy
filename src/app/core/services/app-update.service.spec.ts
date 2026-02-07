import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  SwUpdate,
  VersionEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { Subject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { AppUpdateService } from './app-update.service';
import { LoggerService } from './logger.service';

interface LoggerSpies {
  debug: Mock<(message: string, ...args: unknown[]) => void>;
  info: Mock<(message: string, ...args: unknown[]) => void>;
  warn: Mock<(message: string, ...args: unknown[]) => void>;
  error: Mock<(message: string, error?: unknown, ...args: unknown[]) => void>;
}

interface MutableSwUpdate {
  isEnabled: boolean;
  versionUpdates: Subject<VersionEvent>;
  checkForUpdate: Mock<() => Promise<boolean>>;
  activateUpdate: Mock<() => Promise<boolean>>;
}

const createSwUpdate = (
  overrides: Partial<MutableSwUpdate> = {}
): MutableSwUpdate => {
  const versionUpdates =
    overrides.versionUpdates ?? new Subject<VersionEvent>();
  return {
    isEnabled: true,
    versionUpdates,
    checkForUpdate: vi.fn().mockReturnValue(Promise.resolve(false)),
    activateUpdate: vi.fn().mockReturnValue(Promise.resolve(true)),
    ...overrides,
  };
};

describe('AppUpdateService', () => {
  let logger: LoggerService;
  let loggerSpies: LoggerSpies;
  let reloadSpy: Mock<() => void>;

  beforeAll(() => {
    reloadSpy = vi
      .spyOn(
        AppUpdateService.prototype as unknown as { reloadWindow: () => void },
        'reloadWindow'
      )
      .mockImplementation(() => undefined);
  });

  beforeEach(() => {
    loggerSpies = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    logger = {
      debug: loggerSpies.debug,
      info: loggerSpies.info,
      warn: loggerSpies.warn,
      error: loggerSpies.error,
    } as unknown as LoggerService;
    reloadSpy.mockClear();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  afterAll(() => {
    reloadSpy.mockRestore();
  });

  const configure = (swUpdate: Partial<MutableSwUpdate> | null) => {
    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: LoggerService, useValue: logger },
        { provide: SwUpdate, useValue: swUpdate },
        provideZonelessChangeDetection(),
      ],
    });
  };

  it('logs when the service worker is disabled', () => {
    configure(null);

    TestBed.inject(AppUpdateService);

    expect(loggerSpies.debug).toHaveBeenCalledWith(
      'AppUpdateService: service worker updates disabled'
    );
  });

  it('invokes checkForUpdate during init when enabled', async () => {
    const swUpdate = createSwUpdate();
    configure(swUpdate);

    const service = TestBed.inject(AppUpdateService);
    await service.init();

    expect(swUpdate.checkForUpdate).toHaveBeenCalledTimes(1);
    expect(loggerSpies.warn).not.toHaveBeenCalled();
  });

  it('logs a warning if checkForUpdate rejects', async () => {
    const error = new Error('check failure');
    const swUpdate = createSwUpdate({
      checkForUpdate: vi.fn().mockReturnValue(Promise.reject(error)),
    });
    configure(swUpdate);

    const service = TestBed.inject(AppUpdateService);
    await service.init();

    expect(loggerSpies.warn).toHaveBeenCalledWith(
      'AppUpdateService: checkForUpdate failed',
      error
    );
  });

  it('activates update and reloads when a new version is ready', async () => {
    const versionUpdates = new Subject<VersionEvent>();
    const swUpdate = createSwUpdate({ versionUpdates });
    configure(swUpdate);

    TestBed.inject(AppUpdateService);

    const event: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined },
    };
    versionUpdates.next(event);
    await vi.waitFor(() => {
      expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(reloadSpy).toHaveBeenCalled();
    });

    expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    expect(loggerSpies.info).toHaveBeenCalledWith(
      'AppUpdateService: new version ready, activating'
    );
  });

  it('logs and still reloads when activateUpdate fails', async () => {
    const versionUpdates = new Subject<VersionEvent>();
    const error = new Error('activate failure');
    const swUpdate = createSwUpdate({
      versionUpdates,
      activateUpdate: vi.fn().mockReturnValue(Promise.reject(error)),
    });
    configure(swUpdate);

    TestBed.inject(AppUpdateService);

    const event: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined },
    };
    versionUpdates.next(event);
    await vi.waitFor(() => {
      expect(swUpdate.activateUpdate).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(loggerSpies.warn).toHaveBeenCalledWith(
        'AppUpdateService: activateUpdate failed',
        error
      );
    });

    expect(loggerSpies.warn).toHaveBeenCalledWith(
      'AppUpdateService: activateUpdate failed',
      error
    );
    expect(reloadSpy).toHaveBeenCalled();
  });
});
