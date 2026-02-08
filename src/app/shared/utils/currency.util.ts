const resolveLocale = (): string =>
  typeof navigator !== 'undefined' && navigator.language
    ? navigator.language
    : 'en-US';

export const normalizeCurrencyCode = (
  currency?: string | null
): string | null => {
  if (!currency) {
    return null;
  }
  const normalized = currency.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Resolves an amount from a string value and optional numeric conversion.
 * Prefers the numeric `toBase` value when available, otherwise parses the string amount.
 * Returns 0 if the result is not a finite number.
 */
export const resolveAmount = (value: string, toBase: number | null): number => {
  const converted =
    typeof toBase === 'number' ? toBase : Number.parseFloat(value);
  return Number.isFinite(converted) ? converted : 0;
};

const resolveCurrency = (
  currency: string | null,
  fallback?: string | null
): string =>
  normalizeCurrencyCode(currency) ?? normalizeCurrencyCode(fallback) ?? 'USD';

export interface FormatCurrencyOptions {
  readonly locale?: string;
  readonly fallbackCurrency?: string;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
  readonly currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
}

export const formatCurrency = (
  value: number,
  currency: string | null,
  options: FormatCurrencyOptions = {}
): string =>
  new Intl.NumberFormat(options.locale ?? resolveLocale(), {
    style: 'currency',
    currency: resolveCurrency(currency, options.fallbackCurrency),
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    currencyDisplay: options.currencyDisplay ?? 'narrowSymbol',
  }).format(value);

export interface FormatCurrencyWithCodeOptions extends FormatCurrencyOptions {
  readonly originalCurrency?: string | null;
}

export const formatCurrencyWithCode = (
  value: number,
  currency: string | null,
  options: FormatCurrencyWithCodeOptions = {}
): string => {
  const formatted = formatCurrency(value, currency, options);
  const displayCurrency = resolveCurrency(currency, options.fallbackCurrency);
  const originalCurrency = normalizeCurrencyCode(options.originalCurrency);

  if (
    originalCurrency &&
    originalCurrency.length > 0 &&
    originalCurrency !== displayCurrency
  ) {
    return `${formatted} ${displayCurrency}`;
  }

  return formatted;
};

/**
 * Resolves the display currency based on original currency and conversion status.
 * If `toBase` is a finite number, the amount was converted to the base currency.
 * Otherwise, the original currency is used (or fallback if not available).
 */
export const resolveDisplayCurrency = (
  originalCurrency: string | null,
  toBase: number | null,
  fallbackCurrency: string
): string => {
  if (Number.isFinite(toBase)) {
    return fallbackCurrency;
  }
  return normalizeCurrencyCode(originalCurrency) ?? fallbackCurrency;
};

/**
 * Resolves the preferred display currency from multiple candidates.
 * Useful when multiple currency sources are available (for example, user
 * preference and account default).
 */
export const resolvePreferredCurrency = (
  candidates: (string | null | undefined)[],
  fallback = 'USD'
): string => {
  for (const candidate of candidates) {
    const normalized = normalizeCurrencyCode(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return fallback;
};
