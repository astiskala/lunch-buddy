import { describe, expect, it } from 'vitest';
import { buildTransactionDeepLink } from './lunchmoney-link.util';

describe('buildTransactionDeepLink', () => {
  it('builds a deep link with the transaction ID', () => {
    const url = buildTransactionDeepLink({
      transactionId: 1_766_103,
    });
    expect(url).toBe(
      'https://my.lunchmoney.app/transactions?transaction_id=1766103'
    );
  });

  it('handles large transaction IDs', () => {
    const url = buildTransactionDeepLink({
      transactionId: 999_999_999,
    });
    expect(url).toContain('transaction_id=999999999');
  });

  it('returns a valid URL string', () => {
    const url = buildTransactionDeepLink({
      transactionId: 42,
    });
    expect(url).toBe(
      'https://my.lunchmoney.app/transactions?transaction_id=42'
    );
  });
});
