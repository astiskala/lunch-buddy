import { RecurringInstance } from '../../core/models/lunchmoney.types';

export interface RecurringDateOptions {
  windowStart?: string;
  windowEnd?: string;
  referenceDate?: Date;
}

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseWindowDate = (
  value: string | undefined,
  boundary: 'start' | 'end'
): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
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
  const target = new Date(windowStart);
  const desiredDay = base.getDate();
  const lastDay = lastDayOfMonth(windowStart).getDate();

  target.setDate(Math.min(desiredDay, lastDay));
  target.setHours(
    base.getHours(),
    base.getMinutes(),
    base.getSeconds(),
    base.getMilliseconds()
  );

  return target;
};

interface Duration {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
}

const getMonthDuration = (
  normalized: string,
  magnitude: number,
  hasNumber: boolean
): Duration | null => {
  if (!hasNumber) {
    if (normalized.includes('other') || normalized.includes('bi')) {
      return { months: 2 };
    }
    if (normalized.includes('semi') || normalized.includes('twice')) {
      return { days: 15 };
    }
  }
  return { months: magnitude };
};

const getWeekDuration = (
  normalized: string,
  magnitude: number,
  hasNumber: boolean
): Duration => {
  if (!hasNumber && normalized.includes('bi')) {
    return { weeks: 2 };
  }
  return { weeks: magnitude };
};

const getDayDuration = (
  normalized: string,
  magnitude: number,
  hasNumber: boolean
): Duration => {
  if (!hasNumber && normalized.includes('bi')) {
    return { days: 2 };
  }
  return { days: magnitude };
};

const getCadenceDuration = (
  cadence: string | null | undefined
): Duration | null => {
  if (!cadence) {
    return null;
  }

  const normalized = cadence.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const numberMatch = /(\d+)/.exec(normalized);
  const magnitude = numberMatch ? Number.parseInt(numberMatch[1], 10) || 1 : 1;
  const hasNumber = !!numberMatch;

  if (normalized.includes('quarter')) {
    return { months: magnitude * 3 };
  }

  if (normalized.includes('year') || normalized.includes('annual')) {
    return { years: magnitude };
  }

  if (normalized.includes('month')) {
    return getMonthDuration(normalized, magnitude, hasNumber);
  }

  if (normalized.includes('week')) {
    return getWeekDuration(normalized, magnitude, hasNumber);
  }

  if (normalized.includes('day')) {
    return getDayDuration(normalized, magnitude, hasNumber);
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

const isWithinInterval = (
  date: Date,
  interval: { start: Date; end: Date }
): boolean => {
  const time = date.getTime();
  return time >= interval.start.getTime() && time <= interval.end.getTime();
};

const isBefore = (date: Date, dateToCompare: Date): boolean => {
  return date.getTime() < dateToCompare.getTime();
};

const isAfter = (date: Date, dateToCompare: Date): boolean => {
  return date.getTime() > dateToCompare.getTime();
};

const clampToWindow = (
  candidate: Date,
  windowStart: Date,
  windowEnd: Date
): boolean =>
  isWithinInterval(candidate, { start: windowStart, end: windowEnd });

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

interface AdjustmentResult {
  candidate: Date;
  adjusted: boolean;
}

const projectForwardWithCadence = (
  candidate: Date,
  cadenceDuration: Duration,
  targetDate: Date,
  windowStart?: Date,
  windowEnd?: Date
): Date | null => {
  let projected = candidate;
  let iterations = 0;
  const MAX_ITERATIONS = 60;

  while (isBefore(projected, targetDate) && iterations < MAX_ITERATIONS) {
    projected = addDuration(projected, cadenceDuration);
    iterations += 1;
  }

  if (
    windowStart &&
    windowEnd &&
    !clampToWindow(projected, windowStart, windowEnd)
  ) {
    return null;
  }

  return projected;
};

const adjustCandidateToWindow = (
  candidate: Date,
  windowStart: Date,
  windowEnd: Date,
  cadenceDuration: Duration | null
): AdjustmentResult => {
  if (isAfter(candidate, windowEnd)) {
    return { candidate, adjusted: false };
  }

  if (!isBefore(candidate, windowStart)) {
    return { candidate, adjusted: false };
  }

  let adjustedCandidate = candidate;
  let wasAdjusted = false;

  if (cadenceDuration) {
    const projected = projectForwardWithCadence(
      candidate,
      cadenceDuration,
      windowStart,
      windowStart,
      windowEnd
    );
    if (projected && clampToWindow(projected, windowStart, windowEnd)) {
      adjustedCandidate = projected;
      wasAdjusted = true;
    }
  }

  if (!clampToWindow(adjustedCandidate, windowStart, windowEnd)) {
    const aligned = alignToWindowMonth(candidate, windowStart);
    if (clampToWindow(aligned, windowStart, windowEnd)) {
      adjustedCandidate = aligned;
      wasAdjusted = true;
    }
  }

  return { candidate: adjustedCandidate, adjusted: wasAdjusted };
};

const adjustCandidateToReference = (
  candidate: Date,
  reference: Date,
  cadenceDuration: Duration | null,
  candidateAdjustedByWindow: boolean,
  windowStart?: Date,
  windowEnd?: Date
): Date | null => {
  const candidateStart = startOfDay(candidate);
  if (!isBefore(candidateStart, reference)) {
    return candidate;
  }

  if (!cadenceDuration) {
    return candidateAdjustedByWindow ? candidate : null;
  }

  let projected = candidate;
  let iterations = 0;
  const MAX_ITERATIONS = 60;

  while (
    isBefore(startOfDay(projected), reference) &&
    iterations < MAX_ITERATIONS
  ) {
    const nextProjection = addDuration(projected, cadenceDuration);
    iterations += 1;

    if (windowStart && windowEnd && isAfter(nextProjection, windowEnd)) {
      break;
    }

    projected = nextProjection;

    const isWithinWindow =
      !windowStart ||
      !windowEnd ||
      clampToWindow(projected, windowStart, windowEnd);
    const isNotBeforeReference = !isBefore(startOfDay(projected), reference);

    if (isWithinWindow && isNotBeforeReference) {
      return projected;
    }
  }

  return candidateAdjustedByWindow ? candidate : null;
};

/**
 * Returns the expected date for a recurring expense within a given window.
 *
 * Uses the first available date from the following priority order:
 * 1. next_occurrence
 * 2. billing_date
 * 3. anchor_date
 * 4. start_date
 *
 * @returns The calculated occurrence date, or null if:
 * - All date fields are null/undefined/invalid
 * - The calculated date falls outside the specified window
 * - The date cannot be adjusted to meet the reference date constraint
 */
export const getRecurringDate = (
  expense: {
    next_occurrence?: string | null;
    billing_date?: string | null;
    anchor_date?: string | null;
    start_date: string | null;
    cadence: string;
  },
  options?: RecurringDateOptions
): Date | null => {
  let candidate =
    parseDate(expense.next_occurrence) ??
    parseDate(expense.billing_date) ??
    parseDate(expense.anchor_date) ??
    parseDate(expense.start_date);

  if (!candidate) {
    return null;
  }

  const windowStart = parseWindowDate(options?.windowStart, 'start');
  const windowEnd = parseWindowDate(options?.windowEnd, 'end');
  const cadenceDuration = getCadenceDuration(expense.cadence);
  const reference = options?.referenceDate
    ? startOfDay(options.referenceDate)
    : null;

  let candidateAdjustedByWindow = false;

  if (windowStart && windowEnd) {
    if (isAfter(candidate, windowEnd)) {
      return null;
    }

    const adjustment = adjustCandidateToWindow(
      candidate,
      windowStart,
      windowEnd,
      cadenceDuration
    );
    candidate = adjustment.candidate;
    candidateAdjustedByWindow = adjustment.adjusted;

    if (!clampToWindow(candidate, windowStart, windowEnd)) {
      return null;
    }
  }

  if (reference) {
    const adjusted = adjustCandidateToReference(
      candidate,
      reference,
      cadenceDuration,
      candidateAdjustedByWindow,
      windowStart ?? undefined,
      windowEnd ?? undefined
    );
    if (!adjusted) {
      return null;
    }
    candidate = adjusted;
  }

  return candidate;
};

export interface RecurringPendingOptions {
  referenceDate?: Date;
}

export const isRecurringInstancePending = (
  instance: RecurringInstance,
  options?: RecurringPendingOptions
): boolean => {
  const type = instance.expense.type.toLowerCase().trim();
  if (type === 'cleared') {
    const reference = startOfDay(options?.referenceDate ?? new Date());
    return instance.occurrenceDate.getTime() > reference.getTime();
  }
  return true;
};
