import { RecurringInstance } from '../../core/models/lunchmoney.types';
import { getRecurringDate, isRecurringInstancePending } from './recurring.util';

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
      { windowStart, windowEnd, referenceDate },
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
      { windowStart, windowEnd, referenceDate },
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
      { windowStart, windowEnd, referenceDate },
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
      { windowStart, windowEnd, referenceDate },
    );

    expect(result).toBeNull();
  });
});

describe('isRecurringInstancePending', () => {
  const baseExpense = {
    start_date: '2024-01-01',
    end_date: null,
    cadence: 'monthly',
    payee: 'Sample',
    amount: '100.00',
    currency: 'USD',
    description: null,
    billing_date: '15',
    next_occurrence: '2025-10-15',
    original_name: null,
    source: 'manual' as const,
    plaid_account_id: null,
    asset_id: null,
    category_id: 1,
    created_at: '2024-01-01',
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
      }),
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
      }),
    ).toBeFalse();
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
      }),
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
      }),
    ).toBeTrue();
  });
});
