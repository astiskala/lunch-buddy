export interface MonthRange {
  start: Date;
  end: Date;
}

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

export const startOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const deriveReferenceDate = (
  windowStart: string,
  windowEnd: string,
  today = startOfToday(),
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
  const utcLeft = Date.UTC(dateLeft.getFullYear(), dateLeft.getMonth(), dateLeft.getDate());
  const utcRight = Date.UTC(dateRight.getFullYear(), dateRight.getMonth(), dateRight.getDate());
  return Math.floor((utcLeft - utcRight) / (1000 * 60 * 60 * 24));
}

function parseIsoDay(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}
