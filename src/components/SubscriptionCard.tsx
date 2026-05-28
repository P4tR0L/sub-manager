import { useState } from 'react';
import type { Person, Rates, Subscription } from '../types';
import { subscriptionsApi } from '../lib/api';
import { convertToPLN, formatMoney, splitPerPerson } from '../lib/money';

interface Props {
  subscription: Subscription;
  people: Person[];
  rates: Rates | null;
  onEdit: () => void;
  onDeleted: () => Promise<void> | void;
}

export function SubscriptionCard({ subscription, people, rates, onEdit, onDeleted }: Props) {
  const [busy, setBusy] = useState(false);
  const { currency } = subscription;
  const perPerson = splitPerPerson(subscription.monthlyAmount, subscription.memberIds.length);

  const members = subscription.memberIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name, 'pl'));

  function AmountDisplay({ amount, suffix }: { amount: number; suffix?: string }) {
    const base = formatMoney(amount, currency);
    const pln = currency !== 'PLN' ? convertToPLN(amount, currency, rates) : null;
    const primary = pln !== null ? formatMoney(pln, 'PLN') : base;
    return (
      <span className="amount-display">
        <span>{primary}{suffix ? ` ${suffix}` : ''}</span>
        {pln !== null && <span className="amount-converted">{base}</span>}
      </span>
    );
  }

  async function handleDelete() {
    if (!confirm(`Usunąć subskrypcję "${subscription.name}"?`)) return;
    setBusy(true);
    try {
      await subscriptionsApi.remove(subscription.id);
      await onDeleted();
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card">
      <header className="card-head">
        <div>
          <h3>{subscription.name}</h3>
          <p className="amount"><AmountDisplay amount={subscription.monthlyAmount} suffix="/ mies." /></p>
        </div>
        <div className="actions">
          <button className="ghost sm" onClick={onEdit} disabled={busy}>
            Edytuj
          </button>
          <button className="danger sm" onClick={handleDelete} disabled={busy}>
            Usuń
          </button>
        </div>
      </header>

      <ul className="members">
        {members.map((person) => (
          <li key={person.id}>
            <span>{person.name}</span>
            <span className="per-person"><AmountDisplay amount={perPerson} /></span>
          </li>
        ))}
      </ul>
    </article>
  );
}
