import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { lunchmoneyInterceptor } from './lunchmoney.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

describe('lunchmoneyInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const apiKeySubject = new BehaviorSubject<string | null>('test-api-key');
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', [
      'ready',
      'getApiKey',
    ]);
    Object.defineProperty(authServiceSpy, 'apiKey$', {
      configurable: true,
      value: apiKeySubject.asObservable(),
    });
    authServiceSpy.ready.and.returnValue(Promise.resolve());
    authServiceSpy.getApiKey.and.returnValue('test-api-key');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([lunchmoneyInterceptor])),
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header for Lunch Money API requests', async () => {
    httpClient.get('https://api.lunchmoney.dev/v2/me').subscribe();

    // Wait for the interceptor to process
    await new Promise(resolve => setTimeout(resolve, 0));

    const req = httpMock.expectOne('https://api.lunchmoney.dev/v2/me');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer test-api-key'
    );
    req.flush({});
  });

  it('should not add Authorization header for non-Lunch Money requests', done => {
    httpClient.get('https://example.com/api/data').subscribe(() => {
      done();
    });

    const req = httpMock.expectOne('https://example.com/api/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should handle missing API key gracefully', async () => {
    authServiceSpy.getApiKey.and.returnValue(null);

    httpClient.get('https://api.lunchmoney.dev/v2/me').subscribe();

    // Wait for the interceptor to process
    await new Promise(resolve => setTimeout(resolve, 0));

    const req = httpMock.expectOne('https://api.lunchmoney.dev/v2/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should wait for auth service to be ready', async () => {
    let readyResolved = false;
    authServiceSpy.ready.and.returnValue(
      new Promise(resolve => {
        setTimeout(() => {
          readyResolved = true;
          resolve();
        }, 10);
      })
    );

    httpClient.get('https://api.lunchmoney.dev/v2/me').subscribe();

    // Wait for the auth service and interceptor to process
    await new Promise(resolve => setTimeout(resolve, 50));

    const req = httpMock.expectOne('https://api.lunchmoney.dev/v2/me');
    expect(readyResolved).toBe(true);
    req.flush({});
  });

  it('should add Authorization header for proxied mock API requests', async () => {
    const originalBase = environment.lunchmoneyApiBase;
    environment.lunchmoneyApiBase = '/v2';

    try {
      httpClient.get('/v2/me').subscribe();

      await new Promise(resolve => setTimeout(resolve, 0));

      const req = httpMock.expectOne('/v2/me');
      expect(req.request.headers.has('Authorization')).toBe(true);
      expect(req.request.headers.get('Authorization')).toBe(
        'Bearer test-api-key'
      );
      req.flush({});
    } finally {
      environment.lunchmoneyApiBase = originalBase;
    }
  });
});
