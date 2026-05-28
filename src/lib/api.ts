import type { Currency, Person, Rates, Subscription } from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? 'Wystąpił błąd.';
    throw new Error(message);
  }
  return data as T;
}

export const peopleApi = {
  list: () => request<Person[]>('/api/people'),
  create: (name: string) =>
    request<Person>('/api/people', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  update: (id: string, name: string) =>
    request<Person>(`/api/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/people/${id}`, { method: 'DELETE' }),
  reorder: (ids: string[]) =>
    request<Person[]>('/api/people/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

export interface SubscriptionPayload {
  name: string;
  monthlyAmount: number;
  currency: Currency;
  memberIds: string[];
}

export const subscriptionsApi = {
  list: () => request<Subscription[]>('/api/subscriptions'),
  create: (payload: SubscriptionPayload) =>
    request<Subscription>('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: SubscriptionPayload) =>
    request<Subscription>(`/api/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/subscriptions/${id}`, { method: 'DELETE' }),
};

export const ratesApi = {
  get: () => request<Rates>('/api/rates'),
};
