import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { formatCurrency, FormatCurrencyOptions } from '../utils/currency.util';

/**
 * A pure pipe for formatting currency values.
 * Reduces boilerplate by encapsulating locale resolution and default options.
 *
 * Usage:
 *   {{ amount | formatCurrency:currency }}
 *   {{ amount | formatCurrency:currency:fallbackCurrency }}
 */
@Pipe({
  name: 'formatCurrency',
  pure: true,
})
export class FormatCurrencyPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: number | null | undefined,
    currency: string | null = null,
    fallbackCurrency = 'USD',
    options: Omit<FormatCurrencyOptions, 'locale' | 'fallbackCurrency'> = {}
  ): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return '';
    }

    return formatCurrency(value, currency, {
      locale: this.locale,
      fallbackCurrency,
      ...options,
    });
  }
}
