import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  let versionUpdates$: Subject<VersionReadyEvent>;
  let activateUpdateSpy: jasmine.Spy<() => Promise<boolean>>;
  let swUpdateMock: Pick<SwUpdate, 'versionUpdates' | 'activateUpdate'>;
  let reloadSpy: jasmine.Spy<() => void>;
  let consoleErrorSpy: jasmine.Spy;

  beforeAll(() => {
    reloadSpy = spyOn(
      App.prototype as unknown as { reloadPage: () => void },
      'reloadPage'
    ).and.stub();
    consoleErrorSpy = spyOn(console, 'error').and.stub();
  });

  beforeEach(async () => {
    versionUpdates$ = new Subject<VersionReadyEvent>();
    activateUpdateSpy = jasmine
      .createSpy('activateUpdate')
      .and.returnValue(Promise.resolve(true));
    swUpdateMock = {
      versionUpdates: versionUpdates$.asObservable(),
      activateUpdate: activateUpdateSpy,
    };
    reloadSpy.calls.reset();
    consoleErrorSpy.calls.reset();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(routes),
        {
          provide: SwUpdate,
          useValue: swUpdateMock,
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    versionUpdates$.complete();
  });

  afterAll(() => {
    reloadSpy.and.callThrough();
    consoleErrorSpy.and.callThrough();
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

  it('reloads the page after a successful update activation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const event: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old-hash', appData: undefined },
      latestVersion: { hash: 'new-hash', appData: undefined },
    };
    versionUpdates$.next(event);
    const activation = activateUpdateSpy.calls.mostRecent().returnValue;
    await activation;

    expect(activateUpdateSpy).toHaveBeenCalledTimes(1);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs an error when update activation fails', async () => {
    const fixture = TestBed.createComponent(App);
    const failure = new Error('activation failed');
    activateUpdateSpy.and.returnValue(Promise.reject(failure));
    fixture.detectChanges();

    const event: VersionReadyEvent = {
      type: 'VERSION_READY',
      currentVersion: { hash: 'old-hash', appData: undefined },
      latestVersion: { hash: 'new-hash', appData: undefined },
    };
    versionUpdates$.next(event);
    const activation = activateUpdateSpy.calls.mostRecent().returnValue;
    await activation.catch(() => undefined);

    expect(activateUpdateSpy).toHaveBeenCalledTimes(1);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to activate update:',
      failure
    );
  });
});
