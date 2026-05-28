import type { Currency, Rates } from '../types';

const numberFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CURRENCY_SUFFIX: Record<Currency, string> = {
  PLN: 'zł',
  USD: 'USD',
  EUR: 'EUR',
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency: Currency): string {
  return `${numberFormatter.format(amount)} ${CURRENCY_SUFFIX[currency]}`;
}

/** Kept for compatibility - formats an amount in PLN. */
export function formatPLN(amount: number): string {
  return formatMoney(amount, 'PLN');
}

/**
 * Simple equal split of an amount across people, rounded to 2 decimal places.
 * The sum of shares may differ slightly from the total amount.
 */
export function splitPerPerson(amount: number, count: number): number {
  if (count <= 0) return 0;
  return round2(amount / count);
}

/** Converts an amount in the given currency to PLN using rates. Returns null when rates are unavailable. */
export function convertToPLN(
  amount: number,
  currency: Currency,
  rates: Rates | null,
): number | null {
  if (currency === 'PLN') return round2(amount);
  if (!rates) return null;
  return round2(amount * rates[currency]);
}
