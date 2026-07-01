import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { vi } from 'vitest';
import {
  createSpyObj as createSpyObject,
  type SpyObj as SpyObject,
} from '../../../test/vitest-spy';
import { SiteDataService } from './site-data.service';
import { LoggerService } from './logger.service';

type IndexedDbListResult = { name?: string }[];

interface DeleteDbRequest {
  addEventListener: (event: string, handler: () => void) => void;
}

interface IndexedDbLike {
  databases?: () => Promise<IndexedDbListResult>;
  deleteDatabase: (name: string) => DeleteDbRequest;
}

describe('SiteDataService', () => {
  let loggerSpy: SpyObject<LoggerService>;
  const originalLocalStorage = globalThis.localStorage;
  const originalSessionStorage = globalThis.sessionStorage;

  const setup = (platformId: object | string = 'browser') => {
    loggerSpy = createSpyObject<LoggerService>('LoggerService', [
      'debug',
      'info',
      'warn',
      'error',
    ]);

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SiteDataService,
        { provide: LoggerService, useValue: loggerSpy },
        { provide: PLATFORM_ID, useValue: platformId },
        provideZonelessChangeDetection(),
      ],
    });

    return TestBed.inject(SiteDataService);
  };

  const setCaches = (value: unknown) => {
    Object.defineProperty(globalThis, 'caches', {
      value,
      configurable: true,
      writable: true,
    });
  };

  const setIndexedDb = (value: unknown) => {
    Object.defineProperty(globalThis, 'indexedDB', {
      value,
      configurable: true,
      writable: true,
    });
  };

  const createDeleteRequest = (
    eventToTrigger: 'success' | 'error' | 'blocked'
  ): DeleteDbRequest => ({
    addEventListener: (event, handler) => {
      if (event === eventToTrigger) {
        handler();
      }
    },
  });

  const setStorage = (
    name: 'localStorage' | 'sessionStorage',
    clearImpl: () => void
  ) => {
    Object.defineProperty(globalThis, name, {
      value: {
        length: 0,
        clear: clearImpl,
        getItem: () => null,
        key: () => null,
        removeItem: () => {},
        setItem: () => {},
      },
      configurable: true,
      writable: true,
    });
  };

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperties(globalThis, {
      localStorage: {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      },
      sessionStorage: {
        value: originalSessionStorage,
        configurable: true,
        writable: true,
      },
    });
  });

  it('is created', () => {
    const service = setup();
    expect(service).toBeTruthy();
  });

  it('is a no-op on non-browser platforms', async () => {
    const localStorageClearSpy = vi.fn();
    const sessionStorageClearSpy = vi.fn();
    setStorage('localStorage', localStorageClearSpy);
    setStorage('sessionStorage', sessionStorageClearSpy);

    const service = setup('server');
    await service.clearSiteData();

    expect(localStorageClearSpy).not.toHaveBeenCalled();
    expect(sessionStorageClearSpy).not.toHaveBeenCalled();
  });

  it('clears web storage, caches, and indexedDB databases in browsers', async () => {
    const localStorageClearSpy = vi.fn();
    const sessionStorageClearSpy = vi.fn();
    setStorage('localStorage', localStorageClearSpy);
    setStorage('sessionStorage', sessionStorageClearSpy);

    const cacheDeleteSpy = vi.fn().mockResolvedValue(true);
    setCaches({
      keys: vi.fn().mockResolvedValue(['a', 'b']),
      delete: cacheDeleteSpy,
    });

    const deleteDatabaseSpy = vi
      .fn<(name: string) => DeleteDbRequest>()
      .mockReturnValue(createDeleteRequest('success'));
    const indexedDbMock: IndexedDbLike = {
      databases: vi
        .fn<() => Promise<IndexedDbListResult>>()
        .mockResolvedValue([{ name: 'custom-db' }]),
      deleteDatabase: deleteDatabaseSpy,
    };
    setIndexedDb(indexedDbMock);

    const service = setup('browser');
    await service.clearSiteData();

    expect(localStorageClearSpy).toHaveBeenCalled();
    expect(sessionStorageClearSpy).toHaveBeenCalled();
    expect(cacheDeleteSpy).toHaveBeenCalledWith('a');
    expect(cacheDeleteSpy).toHaveBeenCalledWith('b');
    expect(deleteDatabaseSpy).toHaveBeenCalledWith('lunchbuddy-background');
    expect(deleteDatabaseSpy).toHaveBeenCalledWith('ngsw:db');
    expect(deleteDatabaseSpy).toHaveBeenCalledWith('custom-db');
  });

  it('logs warnings for storage and database listing failures', async () => {
    setStorage('localStorage', () => {
      throw new Error('localStorage failure');
    });
    setStorage('sessionStorage', () => {
      throw new Error('sessionStorage failure');
    });

    setCaches({
      keys: vi.fn().mockRejectedValue(new Error('cache key failure')),
      delete: vi.fn().mockResolvedValue(true),
    });

    const deleteDatabaseSpy = vi
      .fn<(name: string) => DeleteDbRequest>()
      .mockReturnValue(createDeleteRequest('success'));
    setIndexedDb({
      databases: vi.fn().mockRejectedValue(new Error('indexedDB list failure')),
      deleteDatabase: deleteDatabaseSpy,
    });

    const service = setup('browser');
    await service.clearSiteData();

    const warnCalls = loggerSpy.warn.mock.calls;
    expect(warnCalls).toContainEqual([
      'SiteDataService: failed to clear localStorage',
      expect.any(Error),
    ]);
    expect(warnCalls).toContainEqual([
      'SiteDataService: failed to clear sessionStorage',
      expect.any(Error),
    ]);
    expect(warnCalls).toContainEqual([
      'SiteDataService: failed to clear caches',
      expect.any(Error),
    ]);
    expect(warnCalls).toContainEqual([
      'SiteDataService: failed to list IndexedDB databases',
      expect.any(Error),
    ]);
    expect(deleteDatabaseSpy).toHaveBeenCalledWith('lunchbuddy-background');
    expect(deleteDatabaseSpy).toHaveBeenCalledWith('ngsw:db');
  });

  it('logs a warning when deleting an indexedDB database throws', async () => {
    setCaches({
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    });

    setIndexedDb({
      deleteDatabase: vi.fn().mockImplementation(() => {
        throw new Error('cannot delete database');
      }),
    });

    const service = setup('browser');
    await service.clearSiteData();

    expect(loggerSpy.warn.mock.calls).toContainEqual([
      'SiteDataService: failed to delete IndexedDB database',
      'lunchbuddy-background',
      expect.any(Error),
    ]);
  });

  it('resolves deleteDatabase requests when they are blocked or error', async () => {
    setCaches({
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    });

    const deleteDatabaseSpy = vi
      .fn<(name: string) => DeleteDbRequest>()
      .mockImplementation((name: string) =>
        createDeleteRequest(
          name === 'lunchbuddy-background' ? 'blocked' : 'error'
        )
      );

    setIndexedDb({
      deleteDatabase: deleteDatabaseSpy,
    });

    const service = setup('browser');
    await service.clearSiteData();

    expect(deleteDatabaseSpy).toHaveBeenCalledWith('lunchbuddy-background');
    expect(deleteDatabaseSpy).toHaveBeenCalledWith('ngsw:db');
  });
});
