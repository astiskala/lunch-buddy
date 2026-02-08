import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { vi } from 'vitest';
import { diagnosticsInterceptor } from './diagnostics.interceptor';
import { DiagnosticsService } from '../services/diagnostics.service';

describe('diagnosticsInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  const diagnosticsSpy = {
    isEnabled: vi.fn<() => boolean>(),
    log: vi.fn(),
  };

  beforeEach(() => {
    diagnosticsSpy.isEnabled.mockReturnValue(true);
    diagnosticsSpy.log.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([diagnosticsInterceptor])),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: DiagnosticsService, useValue: diagnosticsSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('logs metadata only for successful requests', () => {
    const requestBody = { amount: 42, notes: 'should-not-be-logged' };

    httpClient
      .post('/v2/transactions', requestBody, {
        params: { category: 'Dining' },
      })
      .subscribe();

    const req = httpMock.expectOne('/v2/transactions?category=Dining');
    req.flush({ id: 1, description: 'response-body' });

    expect(diagnosticsSpy.log).toHaveBeenCalledTimes(1);
    const latestCall = diagnosticsSpy.log.mock.calls[0];
    expect(latestCall).toBeDefined();
    expect(latestCall[0]).toBe('info');
    expect(latestCall[1]).toBe('network');

    const details = latestCall[3] as {
      request: { paramKeys: string[]; hasBody: boolean };
      response: { hasBody: boolean };
    };

    expect(details.request.paramKeys).toEqual(['category']);
    expect(details.request.hasBody).toBe(true);
    expect(details.response.hasBody).toBe(true);
  });

  it('skips diagnostics endpoints', () => {
    httpClient
      .post('/api/diagnostics/event', { supportCode: 'ABC' })
      .subscribe();

    const req = httpMock.expectOne('/api/diagnostics/event');
    req.flush({ accepted: 1 });

    expect(diagnosticsSpy.log).not.toHaveBeenCalled();
  });
});
