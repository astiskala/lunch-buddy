import { RecurringInstance } from '../../core/models/lunchmoney.types';
import {
  getRecurringDate,
  isRecurringInstancePending,
  hasFoundTransactionForOccurrence,
} from './recurring.util';

describe('getRecurringDate', () => {
  const windowStart = '2025-10-01';
  const windowEnd = '2025-10-31';
  const referenceDate = new Date('2025-10-12T00:00:00.000Z');

  it('returns the next occurrence when it falls inside the window', () => {
    const result = getRecurringDate(
      {
        next_occurrence: '2025-10-15T00:00:00.000Z',
        anchor_date: '2025-10-15',
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
        anchor_date: '2025-11-01',
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
        anchor_date: '2025-09-01',
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
        anchor_date: '2025-10-06',
        start_date: '2020-01-01',
        cadence: 'monthly',
      },
      { windowStart, windowEnd, referenceDate }
    );

    expect(result?.toISOString()).toBe('2025-10-06T00:00:00.000Z');
  });
});

describe('isRecurringInstancePending', () => {
  const baseExpense = {
    start_date: '2024-01-01',
    end_date: null,
    cadence: 'monthly',
    payee: 'Sample',
    amount: '100.00',
    to_base: 100,
    currency: 'USD',
    description: null,
    anchor_date: '15',
    next_occurrence: '2025-10-15',
    category_id: 1,
    status: 'reviewed' as const,
  };

  it('returns true for suggested instances', () => {
    const instance: RecurringInstance = {
      expense: {
        ...baseExpense,
        id: 42,
        type: 'suggested',
      },
      occurrenceDate: new Date('2025-10-15T00:00:00.000Z'),
    };

    expect(
      isRecurringInstancePending(instance, {
        referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      })
    ).toBeTrue();
  });

  it('returns false for cleared instances when already occurred', () => {
    const instance: RecurringInstance = {
      expense: {
        ...baseExpense,
        id: 99,
        type: 'cleared',
      },
      occurrenceDate: new Date('2025-10-10T00:00:00.000Z'),
    };

    expect(
      isRecurringInstancePending(instance, {
        referenceDate: new Date('2025-10-20T00:00:00.000Z'),
      })
    ).toBeFalse();
  });

  it('keeps cleared instances within the window when past allowance is enabled', () => {
    const instance: RecurringInstance = {
      expense: {
        ...baseExpense,
        id: 123,
        type: 'cleared',
      },
      occurrenceDate: new Date('2025-10-10T00:00:00.000Z'),
    };

    expect(
      isRecurringInstancePending(instance, {
        referenceDate: new Date('2025-10-20T00:00:00.000Z'),
        includePastOccurrences: true,
        windowStart: new Date('2025-10-01T00:00:00.000Z'),
        windowEnd: new Date('2025-10-31T23:59:59.000Z'),
      })
    ).toBeTrue();
  });

  it('keeps cleared instances that are still upcoming', () => {
    const instance: RecurringInstance = {
      expense: {
        ...baseExpense,
        id: 77,
        type: 'cleared',
      },
      occurrenceDate: new Date('2025-10-25T00:00:00.000Z'),
    };

    expect(
      isRecurringInstancePending(instance, {
        referenceDate: new Date('2025-10-20T00:00:00.000Z'),
      })
    ).toBeTrue();
  });

  it('treats unexpected statuses defensively as pending', () => {
    const instance = {
      expense: {
        ...baseExpense,
        id: 100,
        type: 'ignored',
      },
      occurrenceDate: new Date('2025-10-20T00:00:00.000Z'),
    } as unknown as RecurringInstance;

    expect(
      isRecurringInstancePending(instance, {
        referenceDate: new Date('2025-10-10T00:00:00.000Z'),
      })
    ).toBeTrue();
  });

  it('detects found transactions near the occurrence date', () => {
    const instance: RecurringInstance = {
      expense: {
        ...baseExpense,
        id: 888,
        type: 'cleared',
        found_transactions: [
          { date: '2025-10-06', transaction_id: 123 },
          { date: '2025-10-20', transaction_id: 456 },
        ],
      },
      occurrenceDate: new Date('2025-10-05T00:00:00.000Z'),
    };

    expect(
      hasFoundTransactionForOccurrence(instance, { toleranceDays: 3 })
    ).toBeTrue();
    expect(
      hasFoundTransactionForOccurrence(instance, { toleranceDays: 0 })
    ).toBeFalse();
  });
});
