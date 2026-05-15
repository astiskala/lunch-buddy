import { describe, expect, it } from 'vitest';
import { buildTransactionDeepLink } from './lunchmoney-link.util';

describe('buildTransactionDeepLink', () => {
  it('builds the canonical URL for a transaction with its own category', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-05-15',
      transactionCategoryId: 1766103,
      cardCategoryId: 99,
    });
    expect(url).toBe(
      'https://my.lunchmoney.app/transactions/2026/05' +
        '?category=1766103' +
        '&start_date=2026-05-15' +
        '&end_date=2026-05-15' +
        '&match=all' +
        '&time=custom'
    );
  });

  it('zero-pads single-digit months', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-03-04',
      transactionCategoryId: 7,
      cardCategoryId: null,
    });
    expect(url).toContain('/transactions/2026/03');
    expect(url).toContain('start_date=2026-03-04');
    expect(url).toContain('end_date=2026-03-04');
  });

  it('falls back to the card categoryId when transaction.category_id is null', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-05-15',
      transactionCategoryId: null,
      cardCategoryId: 4242,
    });
    expect(url).toContain('category=4242');
  });

  it('omits the category param when neither id is present', () => {
    const url = buildTransactionDeepLink({
      transactionDate: '2026-05-15',
      transactionCategoryId: null,
      cardCategoryId: null,
    });
    expect(url).not.toContain('category=');
    expect(url).toContain('start_date=2026-05-15');
  });

  it('returns null when the date cannot be parsed', () => {
    expect(
      buildTransactionDeepLink({
        transactionDate: 'not-a-date',
        transactionCategoryId: 1,
        cardCategoryId: null,
      })
    ).toBeNull();
  });

  it('returns null when the date is missing', () => {
    expect(
      buildTransactionDeepLink({
        transactionDate: null,
        transactionCategoryId: 1,
        cardCategoryId: null,
      })
    ).toBeNull();
    expect(
      buildTransactionDeepLink({
        transactionDate: undefined,
        transactionCategoryId: 1,
        cardCategoryId: null,
      })
    ).toBeNull();
  });
});
