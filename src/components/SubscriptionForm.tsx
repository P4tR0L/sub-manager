import { useEffect, useState } from 'react';
import { CURRENCIES, type Currency, type Person, type Subscription } from '../types';
import { subscriptionsApi } from '../lib/api';

interface Props {
  people: Person[];
  editing: Subscription | null;
  onSaved: () => Promise<void> | void;
  onCancelEdit: () => void;
}

export function SubscriptionForm({ people, editing, onSaved, onCancelEdit }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('PLN');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setAmount(String(editing.monthlyAmount));
      setCurrency(editing.currency);
      setMemberIds(editing.memberIds);
    } else {
      reset();
    }
    setError(null);
  }, [editing]);

  function reset() {
    setName('');
    setAmount('');
    setCurrency('PLN');
    setMemberIds([]);
  }

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }

  const amountNum = Number(amount.replace(',', '.'));
  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    memberIds.length > 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setError(null);
    const payload = { name: name.trim(), monthlyAmount: amountNum, currency, memberIds };
    try {
      if (editing) {
        await subscriptionsApi.update(editing.id, payload);
      } else {
        await subscriptionsApi.create(payload);
      }
      reset();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zapisać.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="sub-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="sub-name">Nazwa</label>
        <input
          id="sub-name"
          type="text"
          placeholder="np. Netflix"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
        />
      </div>

      <div className="field">
        <label htmlFor="sub-amount">Kwota za miesiąc</label>
        <div className="amount-row">
          <input
            id="sub-amount"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
          <select
            aria-label="Waluta"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            disabled={busy}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field">
        <label>Osoby uczestniczące</label>
        {people.length === 0 ? (
          <p className="muted">Najpierw dodaj osoby w panelu obok.</p>
        ) : (
          <div className="checks">
            {people.map((person) => (
              <label key={person.id} className="check">
                <input
                  type="checkbox"
                  checked={memberIds.includes(person.id)}
                  onChange={() => toggleMember(person.id)}
                  disabled={busy}
                />
                {person.name}
              </label>
            ))}
          </div>
        )}
        {memberIds.length === 0 && people.length > 0 && (
          <p className="hint">Wybierz przynajmniej jedną osobę.</p>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="row">
        <button type="submit" disabled={busy || !canSave}>
          {editing ? 'Zapisz zmiany' : 'Dodaj subskrypcję'}
        </button>
        {editing && (
          <button type="button" className="ghost" onClick={onCancelEdit} disabled={busy}>
            Anuluj edycję
          </button>
        )}
      </div>
    </form>
  );
}
