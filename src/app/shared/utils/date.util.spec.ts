import { getMonthProgress, toIsoDate } from './date.util';

describe('Date Utils', () => {
  describe('toIsoDate', () => {
    it('should format date as ISO string', () => {
      const date = new Date('2025-10-15');
      expect(toIsoDate(date)).toBe('2025-10-15');
    });

    it('should pad single digit months and days', () => {
      const date = new Date('2025-01-05');
      expect(toIsoDate(date)).toBe('2025-01-05');
    });
  });

  describe('getMonthProgress', () => {
    it('should return low progress at start of month', () => {
      const date = new Date('2025-10-01');
      const progress = getMonthProgress(date);
      expect(progress).toBeLessThan(0.1);
    });

    it('should return mid progress in middle of month', () => {
      const date = new Date('2025-10-16');
      const progress = getMonthProgress(date);
      expect(progress).toBeGreaterThan(0.4);
      expect(progress).toBeLessThan(0.6);
    });

    it('should return high progress at end of month', () => {
      const date = new Date('2025-10-31');
      const progress = getMonthProgress(date);
      expect(progress).toBeGreaterThan(0.9);
    });

    it('should handle February correctly', () => {
      const date = new Date('2025-02-14');
      const progress = getMonthProgress(date);
      expect(progress).toBeGreaterThan(0.4);
      expect(progress).toBeLessThan(0.6);
    });
  });
});
