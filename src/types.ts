export type Currency = 'PLN' | 'USD' | 'EUR';

export const CURRENCIES: Currency[] = ['PLN', 'USD', 'EUR'];

export interface Person {
  id: string;
  name: string;
}

export interface Subscription {
  id: string;
  name: string;
  monthlyAmount: number;
  currency: Currency;
  memberIds: string[];
}

/** Exchange rates to PLN: how many PLN per 1 unit of the given currency. */
export interface Rates {
  PLN: number;
  USD: number;
  EUR: number;
  fetchedAt: string;
  stale: boolean;
}

export interface Database {
  people: Person[];
  subscriptions: Subscription[];
}
