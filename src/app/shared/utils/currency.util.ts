const resolveLocale = (): string =>
  typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : 'en-US';

export interface FormatCurrencyOptions {
  readonly locale?: string;
  readonly fallbackCurrency?: string;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
}

export const formatCurrency = (
  value: number,
  currency: string | null,
  options: FormatCurrencyOptions = {},
): string =>
  new Intl.NumberFormat(options.locale ?? resolveLocale(), {
    style: 'currency',
    currency: currency ?? options.fallbackCurrency ?? 'USD',
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    currencyDisplay: 'narrowSymbol',
  }).format(value);
