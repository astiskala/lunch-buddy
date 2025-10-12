export interface RecurringDateOptions {
  windowStart?: string;
  windowEnd?: string;
}

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const parseWindowDate = (value: string | undefined, boundary: 'start' | 'end'): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return null;
  }

  if (boundary === 'start') {
    parsed.setHours(0, 0, 0, 0);
  } else {
    parsed.setHours(23, 59, 59, 999);
  }

  return parsed;
};

const lastDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const alignToWindowMonth = (base: Date, windowStart: Date): Date => {
  const target = new Date(windowStart.getTime());
  const desiredDay = base.getDate();
  const lastDay = lastDayOfMonth(windowStart).getDate();

  target.setDate(Math.min(desiredDay, lastDay));
  target.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());

  return target;
};

interface Duration {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
}

const getCadenceDuration = (cadence: string | null | undefined): Duration | null => {
  if (!cadence) {
    return null;
  }

  const normalized = cadence.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const numberMatch = normalized.match(/(\d+)/);
  const magnitude = numberMatch ? parseInt(numberMatch[1], 10) || 1 : 1;

  if (normalized.includes('quarter')) {
    return { months: magnitude * 3 };
  }

  if (normalized.includes('year') || normalized.includes('annual')) {
    return { years: magnitude };
  }

  if (normalized.includes('month')) {
    if (!numberMatch) {
      if (normalized.includes('other')) {
        return { months: 2 };
      }
      if (normalized.includes('bi')) {
        return { months: 2 };
      }
      if (normalized.includes('semi') || normalized.includes('twice')) {
        return { days: 15 };
      }
    }
    return { months: magnitude };
  }

  if (normalized.includes('week')) {
    if (!numberMatch && normalized.includes('bi')) {
      return { weeks: 2 };
    }
    return { weeks: magnitude };
  }

  if (normalized.includes('day')) {
    if (!numberMatch && normalized.includes('bi')) {
      return { days: 2 };
    }
    return { days: magnitude };
  }

  return null;
};

const addDuration = (date: Date, duration: Duration): Date => {
  const result = new Date(date);
  if (duration.years) result.setFullYear(result.getFullYear() + duration.years);
  if (duration.months) result.setMonth(result.getMonth() + duration.months);
  if (duration.weeks) result.setDate(result.getDate() + duration.weeks * 7);
  if (duration.days) result.setDate(result.getDate() + duration.days);
  return result;
};

const subtractDuration = (date: Date, duration: Duration): Date => {
  const result = new Date(date);
  if (duration.years) result.setFullYear(result.getFullYear() - duration.years);
  if (duration.months) result.setMonth(result.getMonth() - duration.months);
  if (duration.weeks) result.setDate(result.getDate() - duration.weeks * 7);
  if (duration.days) result.setDate(result.getDate() - duration.days);
  return result;
};

const isWithinInterval = (date: Date, interval: { start: Date; end: Date }): boolean => {
  const time = date.getTime();
  return time >= interval.start.getTime() && time <= interval.end.getTime();
};

const isBefore = (date: Date, dateToCompare: Date): boolean => {
  return date.getTime() < dateToCompare.getTime();
};

const isAfter = (date: Date, dateToCompare: Date): boolean => {
  return date.getTime() > dateToCompare.getTime();
};

const clampToWindow = (candidate: Date, windowStart: Date, windowEnd: Date): boolean =>
  isWithinInterval(candidate, { start: windowStart, end: windowEnd });

/**
 * Returns the expected date for a recurring expense within a given window.
 */
export const getRecurringDate = (
  expense: { next_occurrence?: string | null; billing_date: string; start_date: string | null; cadence: string },
  options?: RecurringDateOptions,
): Date | null => {
  const candidate =
    parseDate(expense.next_occurrence) ??
    parseDate(expense.billing_date) ??
    parseDate(expense.start_date);

  if (!candidate) {
    return null;
  }

  const windowStart = parseWindowDate(options?.windowStart, 'start');
  const windowEnd = parseWindowDate(options?.windowEnd, 'end');

  if (!windowStart || !windowEnd) {
    return candidate;
  }

  if (clampToWindow(candidate, windowStart, windowEnd)) {
    return candidate;
  }

  const cadenceDuration = getCadenceDuration(expense.cadence);

  if (cadenceDuration) {
    if (isBefore(candidate, windowStart)) {
      let projected = candidate;
      let iterations = 0;
      while (isBefore(projected, windowStart) && iterations < 60) {
        projected = addDuration(projected, cadenceDuration);
        iterations += 1;
      }
      if (clampToWindow(projected, windowStart, windowEnd)) {
        return projected;
      }
    } else if (isAfter(candidate, windowEnd)) {
      let projected = candidate;
      let iterations = 0;
      while (isAfter(projected, windowEnd) && iterations < 60) {
        projected = subtractDuration(projected, cadenceDuration);
        iterations += 1;
      }
      if (clampToWindow(projected, windowStart, windowEnd)) {
        return projected;
      }
    }
  }

  const aligned = alignToWindowMonth(candidate, windowStart);
  if (clampToWindow(aligned, windowStart, windowEnd)) {
    return aligned;
  }

  return candidate;
};
