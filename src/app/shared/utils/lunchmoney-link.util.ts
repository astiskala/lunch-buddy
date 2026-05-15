const LUNCH_MONEY_HOST = 'https://my.lunchmoney.app';
const ISO_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface BuildTransactionDeepLinkInput {
  transactionDate: string | null | undefined;
  transactionCategoryId: number | null | undefined;
  cardCategoryId: number | null | undefined;
}

interface IsoDateParts {
  year: string;
  month: string;
  day: string;
}

const parseIsoDay = (value: string | null | undefined): IsoDateParts | null => {
  if (!value) {
    return null;
  }
  const match = ISO_DAY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  // Round-trip through Date to reject impossible days (e.g. 2026-02-30).
  const probe = new Date(year, month - 1, day);
  if (
    probe.getFullYear() !== year ||
    probe.getMonth() !== month - 1 ||
    probe.getDate() !== day
  ) {
    return null;
  }
  return { year: match[1], month: match[2], day: match[3] };
};

/**
 * Builds a Lunch Money web URL that opens the transactions list filtered to
 * the given category and a single-day window. On mobile devices with the
 * Lunch Money app installed, the OS routes this URL into the native app via
 * Universal/App Links.
 */
export const buildTransactionDeepLink = (
  input: BuildTransactionDeepLinkInput
): string | null => {
  const parsed = parseIsoDay(input.transactionDate);
  if (!parsed) {
    return null;
  }
  const { year, month, day } = parsed;
  const isoDay = `${year}-${month}-${day}`;

  const categoryId =
    input.transactionCategoryId ?? input.cardCategoryId ?? null;

  const params = new URLSearchParams();
  if (categoryId !== null && Number.isFinite(categoryId)) {
    params.set('category', categoryId.toString());
  }
  params.set('start_date', isoDay);
  params.set('end_date', isoDay);
  params.set('match', 'all');
  params.set('time', 'custom');

  return `${LUNCH_MONEY_HOST}/transactions/${year}/${month}?${params.toString()}`;
};
