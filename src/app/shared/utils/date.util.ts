import { formatDate } from '@angular/common';

export interface MonthRange {
  start: Date;
  end: Date;
}

const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const getCurrentMonthRange = (today = new Date()): MonthRange => ({
  start: startOfMonth(today),
  end: endOfMonth(today),
});

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year.toString()}-${month}-${day}`;
};

export const getMonthProgress = (today = new Date()): number => {
  const { start, end } = getCurrentMonthRange(today);
  const elapsedDays = differenceInCalendarDays(today, start) + 1;
  const totalDays = differenceInCalendarDays(end, start) + 1;
  return Math.min(1, Math.max(0, elapsedDays / totalDays));
};

export const parseDateString = (
  value: string | null | undefined
): Date | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const dayMatch = ISO_DAY_PATTERN.exec(trimmed);
  if (dayMatch) {
    const year = Number.parseInt(dayMatch[1], 10);
    const month = Number.parseInt(dayMatch[2], 10);
    const day = Number.parseInt(dayMatch[3], 10);

    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      !Number.isFinite(day)
    ) {
      return null;
    }

    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const getWindowRange = (
  windowStart: string,
  windowEnd: string
): MonthRange | null => {
  const start = parseIsoDay(windowStart);
  const end = parseIsoDay(windowEnd);

  if (!start || !end) {
    return null;
  }

  return {
    start,
    end: endOfDay(end),
  };
};

export const formatMonthDay = (date: Date, locale: string): string =>
  formatDate(date, 'MMM d', locale);

export const isPastDate = (date: Date, reference: Date): boolean =>
  startOfDay(date).getTime() < startOfDay(reference).getTime();

export const deriveReferenceDate = (
  windowStart: string,
  windowEnd: string,
  today = startOfToday()
): Date => {
  const start = parseIsoDay(windowStart);
  const end = parseIsoDay(windowEnd);

  if (start && end) {
    if (today.getTime() < start.getTime()) {
      return start;
    }

    const dayAfterEnd = new Date(end);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);

    if (today.getTime() > end.getTime()) {
      return dayAfterEnd;
    }

    return today;
  }

  return today;
};

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function differenceInCalendarDays(dateLeft: Date, dateRight: Date): number {
  const utcLeft = Date.UTC(
    dateLeft.getFullYear(),
    dateLeft.getMonth(),
    dateLeft.getDate()
  );
  const utcRight = Date.UTC(
    dateRight.getFullYear(),
    dateRight.getMonth(),
    dateRight.getDate()
  );
  return Math.floor((utcLeft - utcRight) / (1000 * 60 * 60 * 24));
}

function parseIsoDay(value: string): Date | null {
  const parsed = parseDateString(value);
  if (!parsed) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}
