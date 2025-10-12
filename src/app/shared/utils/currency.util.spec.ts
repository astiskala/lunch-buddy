import { formatCurrency } from './currency.util';

describe('Currency Utils', () => {
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
  });
});
