import {
  getMonthProgress,
  toIsoDate,
  getCurrentMonthRange,
  startOfToday,
  deriveReferenceDate,
  formatMonthDay,
  getWindowRange,
  isPastDate,
  parseDateString,
  getPeriodProgress,
  formatDateRange,
  shiftPeriod,
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

  describe('parseDateString', () => {
    it('should parse day-only strings in local time without shifting the day', () => {
      const parsed = parseDateString('2025-10-01');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2025);
      expect(parsed?.getMonth()).toBe(9);
      expect(parsed?.getDate()).toBe(1);
    });

    it('should parse full ISO timestamps', () => {
      const parsed = parseDateString('2025-10-01T00:00:00.000Z');
      expect(parsed).not.toBeNull();
      expect(parsed?.toISOString()).toBe('2025-10-01T00:00:00.000Z');
    });

    it('should reject invalid day-only values', () => {
      expect(parseDateString('2025-02-30')).toBeNull();
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

  describe('getPeriodProgress', () => {
    it('should return 0 for invalid dates', () => {
      expect(getPeriodProgress('', '2025-10-14')).toBe(0);
      expect(getPeriodProgress('2025-10-01', '')).toBe(0);
    });

    it('should return low progress at the start of period', () => {
      const today = new Date(2025, 9, 1); // Oct 1
      const progress = getPeriodProgress('2025-10-01', '2025-10-14', today);
      expect(progress).toBeLessThan(0.15);
      expect(progress).toBeGreaterThan(0);
    });

    it('should return mid progress in the middle of period', () => {
      const today = new Date(2025, 9, 7); // Oct 7
      const progress = getPeriodProgress('2025-10-01', '2025-10-14', today);
      expect(progress).toBeGreaterThan(0.4);
      expect(progress).toBeLessThan(0.6);
    });

    it('should cap at 1 when past end date', () => {
      const today = new Date(2025, 9, 20); // Oct 20
      const progress = getPeriodProgress('2025-10-01', '2025-10-14', today);
      expect(progress).toBe(1);
    });

    it('should return 0 when before start date', () => {
      const today = new Date(2025, 8, 30); // Sep 30
      const progress = getPeriodProgress('2025-10-01', '2025-10-14', today);
      expect(progress).toBe(0);
    });
  });

  describe('formatDateRange', () => {
    it('should format a date range with month abbreviations', () => {
      const result = formatDateRange('2025-10-01', '2025-10-14', 'en-US');
      expect(result).toContain('Oct');
      expect(result).toContain('2025');
    });

    it('should format cross-month ranges', () => {
      const result = formatDateRange('2025-10-15', '2025-11-14', 'en-US');
      expect(result).toContain('Oct');
      expect(result).toContain('Nov');
      expect(result).toContain('2025');
    });

    it('should include both years for cross-year ranges', () => {
      const result = formatDateRange('2025-12-29', '2026-01-11', 'en-US');
      expect(result).toContain('Dec');
      expect(result).toContain('Jan');
      expect(result).toContain('2025');
      expect(result).toContain('2026');
    });

    it('should return empty string for invalid dates', () => {
      expect(formatDateRange('', '2025-10-14', 'en-US')).toBe('');
      expect(formatDateRange('2025-10-01', '', 'en-US')).toBe('');
    });
  });

  describe('shiftPeriod', () => {
    it('should shift a 14-day period forward', () => {
      const result = shiftPeriod('2025-10-01', '2025-10-14', 1);
      expect(result).toEqual({ start: '2025-10-15', end: '2025-10-28' });
    });

    it('should shift a 14-day period backward', () => {
      const result = shiftPeriod('2025-10-15', '2025-10-28', -1);
      expect(result).toEqual({ start: '2025-10-01', end: '2025-10-14' });
    });

    it('should handle month boundaries', () => {
      const result = shiftPeriod('2025-10-20', '2025-11-02', 1);
      expect(result).not.toBeNull();
      expect(result?.start).toBe('2025-11-03');
    });

    it('should return null for invalid dates', () => {
      expect(shiftPeriod('', '2025-10-14', 1)).toBeNull();
      expect(shiftPeriod('2025-10-01', '', -1)).toBeNull();
    });
  });
});
