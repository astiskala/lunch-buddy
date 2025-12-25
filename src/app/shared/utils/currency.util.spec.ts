import {
  formatCurrency,
  formatCurrencyWithCode,
  normalizeCurrencyCode,
} from './currency.util';

describe('Currency Utils', () => {
  describe('normalizeCurrencyCode', () => {
    it('normalises casing and whitespace', () => {
      expect(normalizeCurrencyCode(' usd ')).toBe('USD');
    });

    it('returns null for empty values', () => {
      expect(normalizeCurrencyCode('   ')).toBeNull();
      expect(normalizeCurrencyCode()).toBeNull();
    });
  });

  describe('formatCurrency', () => {
    it('should format positive number with USD', () => {
      expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
    });

    it('should format negative number with USD', () => {
      expect(formatCurrency(-1234.56, 'USD')).toBe('-$1,234.56');
    });

    it('should format zero', () => {
      expect(formatCurrency(0, 'USD')).toBe('$0.00');
    });

    it('should format large numbers with commas', () => {
      expect(formatCurrency(1234567.89, 'USD')).toBe('$1,234,567.89');
    });

    it('should handle null currency with default USD', () => {
      expect(formatCurrency(100, null)).toBe('$100.00');
    });

    it('should format EUR currency', () => {
      const result = formatCurrency(1234.56, 'EUR');
      expect(result).toContain('1,234.56');
      expect(result).toContain('€');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCurrency(10.999, 'USD')).toBe('$11.00');
    });

    it('normalises lowercase currency codes', () => {
      expect(formatCurrency(25, 'aud')).toContain('$25.00');
    });
  });

  describe('formatCurrencyWithCode', () => {
    it('appends display currency code when original differs', () => {
      const result = formatCurrencyWithCode(100, 'USD', {
        originalCurrency: 'eur',
      });
      expect(result).toContain('USD');
      expect(result).not.toContain('EUR');
    });

    it('omits code when currencies align', () => {
      const result = formatCurrencyWithCode(50, 'USD', {
        originalCurrency: 'usd',
      });
      expect(result.endsWith('USD')).toBeFalse();
    });
  });
});
