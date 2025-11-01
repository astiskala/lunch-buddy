import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;
  let consoleDebugSpy: jasmine.Spy;
  let consoleInfoSpy: jasmine.Spy;
  let consoleWarnSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(() => {
    // Setup console spies
    consoleDebugSpy = spyOn(console, 'debug');
    consoleInfoSpy = spyOn(console, 'info');
    consoleWarnSpy = spyOn(console, 'warn');
    consoleErrorSpy = spyOn(console, 'error');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    service = TestBed.inject(LoggerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should log debug messages with formatted prefix', () => {
    service.debug('test message', 'arg1', 'arg2');

    expect(consoleDebugSpy).toHaveBeenCalledWith(
      '[DEBUG] test message',
      'arg1',
      'arg2'
    );
  });

  it('should log info messages with formatted prefix', () => {
    service.info('info message', { data: 'test' });

    expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message', {
      data: 'test',
    });
  });

  it('should log warn messages with formatted prefix', () => {
    service.warn('warning message', 'extra');

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[WARN] warning message',
      'extra'
    );
  });

  it('should log error messages with formatted prefix', () => {
    const error = new Error('test error');
    service.error('error message', error, 'extra');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR] error message',
      error,
      'extra'
    );
  });

  it('should handle error without error object', () => {
    service.error('simple error');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR] simple error',
      undefined
    );
  });

  it('should handle multiple arguments', () => {
    service.warn('test', 1, 2, 3, { key: 'value' });

    expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] test', 1, 2, 3, {
      key: 'value',
    });
  });
});
