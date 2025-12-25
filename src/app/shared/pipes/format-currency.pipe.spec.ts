import { FormatCurrencyPipe } from './format-currency.pipe';
import { TestBed } from '@angular/core/testing';
import { LOCALE_ID } from '@angular/core';

describe('FormatCurrencyPipe', () => {
  let pipe: FormatCurrencyPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        FormatCurrencyPipe,
        { provide: LOCALE_ID, useValue: 'en-US' },
      ],
    });
    pipe = TestBed.inject(FormatCurrencyPipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format a positive number with default options', () => {
    const result = pipe.transform(123.45, 'USD');
    expect(result).toContain('123.45');
  });

  it('should format a negative number', () => {
    const result = pipe.transform(-50, 'USD');
    expect(result).toContain('50.00');
  });

  it('should use fallback currency when currency is null', () => {
    const result = pipe.transform(100, null, 'EUR');
    expect(result).toBeTruthy();
  });

  it('should return empty string for null value', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined value', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for NaN', () => {
    expect(pipe.transform(Number.NaN)).toBe('');
  });

  it('should handle zero value', () => {
    const result = pipe.transform(0, 'USD');
    expect(result).toContain('0.00');
  });
});
