import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { vi } from 'vitest';
import {
  DiagnosticsService,
  type DiagnosticEvent,
} from './diagnostics.service';

interface DiagnosticSession {
  supportCode: string;
  sessionId: string;
  writeKey: string;
  expiresAt: number;
}

interface DiagnosticsPrivateApi {
  eventBuffer: DiagnosticEvent[];
}

interface CreateSessionRequestBody {
  buildInfo: {
    version: string;
  };
}

interface EventFlushRequestBody {
  supportCode: string;
  writeKey: string;
  events: DiagnosticEvent[];
}

describe('DiagnosticsService', () => {
  let service: DiagnosticsService;
  let httpMock: HttpTestingController;

  const mockSession: DiagnosticSession = {
    supportCode: 'SUP-123',
    sessionId: 'sess-1',
    writeKey: 'write-1',
    expiresAt: Date.now() + 60_000,
  };

  const setup = (platformId: object | string = 'browser') => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        DiagnosticsService,
        { provide: PLATFORM_ID, useValue: platformId },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
      ],
    });

    service = TestBed.inject(DiagnosticsService);
    httpMock = TestBed.inject(HttpTestingController);
  };

  const getBuffer = () =>
    (service as unknown as DiagnosticsPrivateApi).eventBuffer;

  const setBuffer = (events: DiagnosticEvent[]) => {
    (service as unknown as DiagnosticsPrivateApi).eventBuffer = events;
  };

  const createEvent = (index: number): DiagnosticEvent => ({
    timestamp: Date.now() + index,
    level: 'info',
    area: 'test',
    message: `event-${String(index)}`,
  });

  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('is created', () => {
    setup('browser');
    expect(service).toBeTruthy();
  });

  it('enables diagnostics, creates a session, and flushes startup events', async () => {
    setup('browser');

    const enablePromise = service.enable();

    const sessionRequest = httpMock.expectOne('/api/diagnostics/session');
    expect(sessionRequest.request.method).toBe('POST');
    const sessionBody = sessionRequest.request.body as CreateSessionRequestBody;
    expect(sessionBody.buildInfo.version).toEqual(expect.any(String));
    sessionRequest.flush(mockSession);

    await enablePromise;

    expect(service.isEnabled()).toBe(true);
    expect(service.session()).toEqual(mockSession);

    const eventRequest = httpMock.expectOne('/api/diagnostics/event');
    const eventBody = eventRequest.request.body as EventFlushRequestBody;
    expect(eventRequest.request.method).toBe('POST');
    expect(eventBody.supportCode).toBe(mockSession.supportCode);
    expect(eventBody.writeKey).toBe(mockSession.writeKey);
    expect(eventBody.events).toHaveLength(1);
    expect(eventBody.events[0]?.message).toBe('Diagnostic logging enabled');
    eventRequest.flush({ ok: true });
  });

  it('keeps diagnostics disabled when session creation fails', async () => {
    setup('browser');

    const enablePromise = service.enable();

    const request = httpMock.expectOne('/api/diagnostics/session');
    request.flush(
      { error: 'failed' },
      { status: 500, statusText: 'Server Error' }
    );

    await enablePromise;

    expect(service.isEnabled()).toBe(false);
    expect(service.session()).toBeNull();
  });

  it('disables diagnostics and deletes server logs when requested', async () => {
    setup('browser');

    service.isEnabled.set(true);
    service.session.set(mockSession);
    setBuffer([createEvent(1), createEvent(2)]);

    const disablePromise = service.disable(true);

    const sessionDeleteRequest = httpMock.expectOne('/api/diagnostics/session');
    expect(sessionDeleteRequest.request.method).toBe('DELETE');
    expect(sessionDeleteRequest.request.body).toEqual({
      supportCode: mockSession.supportCode,
      writeKey: mockSession.writeKey,
    });
    sessionDeleteRequest.flush({ ok: true });

    await disablePromise;

    expect(service.isEnabled()).toBe(false);
    expect(service.session()).toBeNull();
    expect(getBuffer()).toHaveLength(0);
    expect(localStorage.getItem('diag_config')).toBeNull();
  });

  it('still disables diagnostics if deleting server logs fails', async () => {
    setup('browser');

    service.isEnabled.set(true);
    service.session.set(mockSession);
    setBuffer([createEvent(1)]);

    const disablePromise = service.disable(true);

    const sessionDeleteRequest = httpMock.expectOne('/api/diagnostics/session');
    sessionDeleteRequest.flush(
      { error: 'failed' },
      { status: 500, statusText: 'Server Error' }
    );

    await disablePromise;

    expect(service.isEnabled()).toBe(false);
    expect(service.session()).toBeNull();
    expect(getBuffer()).toHaveLength(0);
  });

  it('does not append events when diagnostics are disabled', () => {
    setup('browser');

    service.log('info', 'diagnostics', 'ignored');

    expect(getBuffer()).toHaveLength(0);
  });

  it('caps the event buffer size at 500 entries', () => {
    setup('browser');

    service.isEnabled.set(true);

    for (let index = 0; index < 510; index += 1) {
      service.log('info', 'diag', `message-${String(index)}`);
    }

    const buffer = getBuffer();
    expect(buffer).toHaveLength(500);
    expect(buffer[0]?.message).toBe('message-10');
    expect(buffer.at(-1)?.message).toBe('message-509');
  });

  it('flushes buffered events to the diagnostics API', async () => {
    setup('browser');

    service.session.set(mockSession);
    service.isEnabled.set(true);
    service.log('warn', 'diagnostics', 'first');
    service.log(
      'error',
      'diagnostics',
      'second',
      { foo: 'bar' },
      new Error('x')
    );

    const flushPromise = service.flush();

    const request = httpMock.expectOne('/api/diagnostics/event');
    const requestBody = request.request.body as EventFlushRequestBody;
    expect(request.request.method).toBe('POST');
    expect(requestBody.events).toHaveLength(2);
    request.flush({ ok: true });

    await flushPromise;

    expect(getBuffer()).toHaveLength(0);
  });

  it('restores only the latest 50 events when flush fails', async () => {
    setup('browser');

    service.session.set(mockSession);
    setBuffer(
      Array.from({ length: 60 }, (_value, index) => createEvent(index))
    );

    const flushPromise = service.flush();

    const request = httpMock.expectOne('/api/diagnostics/event');
    request.flush(
      { error: 'failed' },
      { status: 500, statusText: 'Server Error' }
    );

    await flushPromise;

    const buffer = getBuffer();
    expect(buffer).toHaveLength(50);
    expect(buffer[0]?.message).toBe('event-10');
    expect(buffer.at(-1)?.message).toBe('event-59');
  });

  it('returns early from flush when there is no session or no events', async () => {
    setup('browser');

    await service.flush();
    httpMock.expectNone('/api/diagnostics/event');

    service.session.set(mockSession);
    await service.flush();
    httpMock.expectNone('/api/diagnostics/event');

    expect(getBuffer()).toHaveLength(0);
  });

  it('falls back safely when persisted diagnostics state is malformed', () => {
    localStorage.setItem('diag_config', '{not-json');

    setup('browser');

    expect(service.isEnabled()).toBe(false);
    expect(service.session()).toBeNull();
  });

  it('avoids browser state loading on non-browser platforms', () => {
    localStorage.setItem(
      'diag_config',
      JSON.stringify({ isEnabled: true, session: mockSession })
    );

    setup('server');

    expect(service.isEnabled()).toBe(false);
    expect(service.session()).toBeNull();
  });
});
