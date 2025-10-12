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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getMonthProgress = (today = new Date()): number => {
  const { start, end } = getCurrentMonthRange(today);
  const elapsedDays = differenceInCalendarDays(today, start) + 1;
  const totalDays = differenceInCalendarDays(end, start) + 1;
  return Math.min(1, Math.max(0, elapsedDays / totalDays));
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
