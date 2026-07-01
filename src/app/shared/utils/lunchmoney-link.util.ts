import { parseDateString, toIsoDate } from './date.util';

const LUNCH_MONEY_HOST = 'https://my.lunchmoney.app';

export interface BuildTransactionDeepLinkInput {
  transactionDate: string | null | undefined;
  transactionCategoryId: number | null | undefined;
  cardCategoryId: number | null | undefined;
}

// On mobile with the Lunch Money app installed, the OS routes this URL into
// the native app via Universal/App Links; otherwise it opens in the browser.
export const buildTransactionDeepLink = (
  input: BuildTransactionDeepLinkInput
): string | null => {
  const parsed = parseDateString(input.transactionDate);
  if (!parsed) {
    return null;
  }

  const year = parsed.getFullYear().toString();
  const month = (parsed.getMonth() + 1).toString().padStart(2, '0');
  const isoDay = toIsoDate(parsed);

  const categoryId =
    input.transactionCategoryId ?? input.cardCategoryId ?? null;

  const parameters = new URLSearchParams();
  if (categoryId !== null && Number.isFinite(categoryId)) {
    parameters.set('category', categoryId.toString());
  }
  parameters.set('start_date', isoDay);
  parameters.set('end_date', isoDay);
  parameters.set('match', 'all');
  parameters.set('time', 'custom');

  return `${LUNCH_MONEY_HOST}/transactions/${year}/${month}?${parameters.toString()}`;
};
