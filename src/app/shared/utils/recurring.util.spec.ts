import { getRecurringDate } from './recurring.util';

describe('getRecurringDate', () => {
  const windowStart = '2025-10-01';
  const windowEnd = '2025-10-31';
  const referenceDate = new Date('2025-10-12T00:00:00.000Z');

  it('returns the next occurrence when it falls inside the window', () => {
    const result = getRecurringDate(
      {
        next_occurrence: '2025-10-15T00:00:00.000Z',
        billing_date: '2025-10-15',
        start_date: '2020-01-15',
        cadence: 'monthly',
      },
      { windowStart, windowEnd, referenceDate }
    );

    expect(result?.toISOString()).toBe('2025-10-15T00:00:00.000Z');
  });

  it('returns null when the next occurrence lands after the window', () => {
    const result = getRecurringDate(
      {
        next_occurrence: '2025-11-01T00:00:00.000Z',
        billing_date: '2025-11-01',
        start_date: '2020-01-01',
        cadence: 'monthly',
      },
      { windowStart, windowEnd, referenceDate }
    );

    expect(result).toBeNull();
  });

  it('projects forward when the stored occurrence is before the window', () => {
    const result = getRecurringDate(
      {
        next_occurrence: '2025-09-01T00:00:00.000Z',
        billing_date: '2025-09-01',
        start_date: '2020-01-01',
        cadence: 'monthly',
      },
      { windowStart, windowEnd, referenceDate }
    );

    expect(result?.toISOString()).toBe('2025-10-01T00:00:00.000Z');
  });

  it('returns null when the occurrence is before the reference day', () => {
    const result = getRecurringDate(
      {
        next_occurrence: '2025-10-06T00:00:00.000Z',
        billing_date: '2025-10-06',
        start_date: '2020-01-01',
        cadence: 'monthly',
      },
      { windowStart, windowEnd, referenceDate }
    );

    expect(result).toBeNull();
  });
});
