import {
  getMonthProgress,
  toIsoDate,
  getCurrentMonthRange,
  startOfToday,
  deriveReferenceDate,
  formatMonthDay,
  getWindowRange,
  isPastDate,
} from './date.util';

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

  describe('getCurrentMonthRange', () => {
    it('should return correct start and end for October', () => {
      const today = new Date(2025, 9, 14); // October is month 9 (0-indexed)
      const range = getCurrentMonthRange(today);
      expect(range.start.getFullYear()).toBe(2025);
      expect(range.start.getMonth()).toBe(9); // October
      expect(range.start.getDate()).toBe(1);
      expect(range.end.getFullYear()).toBe(2025);
      expect(range.end.getMonth()).toBe(9); // October
      expect(range.end.getDate()).toBe(31);
    });
  });
  describe('startOfToday', () => {
    it('should return today at midnight', () => {
      const today = startOfToday();
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });
  });

  describe('deriveReferenceDate', () => {
    it('should return start if today is before window', () => {
      const today = new Date(2025, 9, 1); // Oct 1
      const ref = deriveReferenceDate('2025-10-10', '2025-10-20', today);
      expect(ref.getFullYear()).toBe(2025);
      expect(ref.getMonth()).toBe(9);
      expect(ref.getDate()).toBe(10);
    });
    it('should return day after end if today is after window', () => {
      const today = new Date(2025, 9, 25); // Oct 25
      const ref = deriveReferenceDate('2025-10-10', '2025-10-20', today);
      expect(ref.getFullYear()).toBe(2025);
      expect(ref.getMonth()).toBe(9);
      expect(ref.getDate()).toBe(21);
    });
    it('should return today if within window', () => {
      const today = new Date(2025, 9, 15); // Oct 15
      const ref = deriveReferenceDate('2025-10-10', '2025-10-20', today);
      expect(ref.getFullYear()).toBe(2025);
      expect(ref.getMonth()).toBe(9);
      expect(ref.getDate()).toBe(15);
    });
    it('should return today if start/end invalid', () => {
      const today = new Date(2025, 9, 15); // Oct 15
      const ref = deriveReferenceDate('', '', today);
      expect(ref.getFullYear()).toBe(2025);
      expect(ref.getMonth()).toBe(9);
      expect(ref.getDate()).toBe(15);
    });
  });

  describe('getWindowRange', () => {
    it('should parse valid window dates', () => {
      const range = getWindowRange('2025-10-01', '2025-10-31');
      expect(range).not.toBeNull();
      expect(range?.start.getHours()).toBe(0);
      expect(range?.end.getHours()).toBe(23);
      expect(range?.end.getMinutes()).toBe(59);
    });

    it('should return null for invalid window', () => {
      expect(getWindowRange('', '2025-10-31')).toBeNull();
      expect(getWindowRange('2025-10-01', '')).toBeNull();
    });
  });

  describe('formatMonthDay', () => {
    it('formats month and day using locale', () => {
      const date = new Date(2025, 10, 15);
      expect(formatMonthDay(date, 'en-US')).toBe('Nov 15');
    });
  });

  describe('isPastDate', () => {
    it('detects dates before the reference day', () => {
      const reference = new Date(2025, 10, 10, 12);
      const earlier = new Date(2025, 10, 9, 23);
      expect(isPastDate(earlier, reference)).toBe(true);
    });
  });
});
