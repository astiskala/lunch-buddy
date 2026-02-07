import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { vi, type Mock } from 'vitest';
import { App } from './app';
import { routes } from './app.routes';
import { AppUpdateService } from './core/services/app-update.service';

describe('App', () => {
  let versionUpdates$: Subject<VersionReadyEvent>;
  let activateUpdateSpy: Mock<() => Promise<boolean>>;
  let swUpdateMock: Pick<SwUpdate, 'versionUpdates' | 'activateUpdate'>;
  let reloadSpy: Mock<() => void>;
  let consoleErrorSpy: Mock;
  let appUpdateServiceInitSpy: Mock<() => Promise<void>>;
  let appUpdateServiceMock: Pick<AppUpdateService, 'init'>;

  beforeAll(() => {
    reloadSpy = vi
      .spyOn(
        App.prototype as unknown as { reloadPage: () => void },
        'reloadPage'
      )
      .mockImplementation(() => undefined);
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    versionUpdates$ = new Subject<VersionReadyEvent>();
    activateUpdateSpy = vi.fn().mockReturnValue(Promise.resolve(true));
    appUpdateServiceInitSpy = vi.fn().mockReturnValue(Promise.resolve());
    appUpdateServiceMock = { init: appUpdateServiceInitSpy };
    swUpdateMock = {
      versionUpdates: versionUpdates$.asObservable(),
      activateUpdate: activateUpdateSpy,
    };
    reloadSpy.mockClear();
    consoleErrorSpy.mockClear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        {
          provide: SwUpdate,
          useValue: swUpdateMock,
        },
        {
          provide: AppUpdateService,
          useValue: appUpdateServiceMock,
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    versionUpdates$.complete();
  });

  afterAll(() => {
    reloadSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have a router outlet', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('initializes update checks when bootstrapped', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(appUpdateServiceInitSpy).toHaveBeenCalledTimes(1);
  });

  it('reloads the page after a successful update activation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const event: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old-hash', appData: undefined },
      latestVersion: { hash: 'new-hash', appData: undefined },
    };
    versionUpdates$.next(event);
    await vi.waitFor(() => {
      expect(activateUpdateSpy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(reloadSpy).toHaveBeenCalledTimes(1);
    });

    expect(activateUpdateSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs an error when update activation fails', async () => {
    const fixture = TestBed.createComponent(App);
    const failure = new Error('activation failed');
    activateUpdateSpy.mockReturnValue(Promise.reject(failure));
    fixture.detectChanges();

    const event: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old-hash', appData: undefined },
      latestVersion: { hash: 'new-hash', appData: undefined },
    };
    versionUpdates$.next(event);
    await vi.waitFor(() => {
      expect(activateUpdateSpy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to activate update:',
        failure
      );
    });

    expect(activateUpdateSpy).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
